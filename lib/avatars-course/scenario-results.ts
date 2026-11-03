import type { BridgeContext } from "@/lib/bridge";

// Same-origin proxies (app/api/avatars-course/scenario-results/**) forward to
// Supernova's /api/speak/scenarios/* server-side. Calling the upstream directly
// from the browser risks a silent cross-origin failure: the webview loads this
// app from a *.gosupernova.live subdomain, which is a different origin from
// app.gosupernova.live, and CORS support on that endpoint isn't confirmed (see
// the CORS note in docs/api-web-prototypes.md).
const RESULTS_PROXY_URL = "/api/avatars-course/scenario-results";

type Auth = BridgeContext["auth"];

function authHeaders(auth: Auth): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;
  if (auth?.userId) headers["x-sn-user-id"] = auth.userId;
  return headers;
}

export interface ScenarioResult {
  id: string;
  data: unknown;
  stars: 1 | 2 | 3;
  insertedAt: string;
  attemptId: string | null;
}

// ─── Local-dev progress fallback ─────────────────────────────────────────────
// In a bare browser at localhost there is no Supernova login, so the backend
// answers 401 and the course map would never unlock lesson 2. When (and only when)
// running a non-production build with no auth token, progress is kept in
// localStorage instead. Production builds and the real app (which always has a
// token from the bridge) never take this path.
const DEV_RESULTS_KEY = "avatars-course:dev-results:v1";

function shouldUseLocalDevProgress(auth: Auth): boolean {
  return process.env.NODE_ENV !== "production" && !auth?.token;
}

function readDevResults(): Record<string, ScenarioResult> {
  try {
    return JSON.parse(localStorage.getItem(DEV_RESULTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeDevResult(scenarioId: string, result: ScenarioResult) {
  try {
    const all = readDevResults();
    const prev = all[scenarioId];
    // Keep the best star count, like replaying a lesson shouldn't lower it.
    all[scenarioId] = prev && prev.stars > result.stars ? { ...result, stars: prev.stars } : result;
    localStorage.setItem(DEV_RESULTS_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — progress just won't persist locally
  }
}

// Fetches the latest result per scenario id — used to derive locked/unlocked/stars
// state for the course map. Returns an empty map on any failure (fail open to "no
// progress yet" rather than crash the course map).
export async function fetchScenarioResults(
  scenarioIds: string[],
  auth: Auth
): Promise<Record<string, ScenarioResult>> {
  if (!scenarioIds.length) return {};
  if (shouldUseLocalDevProgress(auth)) {
    const all = readDevResults();
    return Object.fromEntries(scenarioIds.filter((id) => all[id]).map((id) => [id, all[id]]));
  }
  try {
    const res = await fetch(RESULTS_PROXY_URL, {
      method: "POST",
      headers: authHeaders(auth),
      body: JSON.stringify({ scenario_ids: scenarioIds }),
    });
    if (!res.ok) {
      console.warn("[avatars-course] fetchScenarioResults failed", res.status);
      return {};
    }
    const json = await res.json();
    const out: Record<string, ScenarioResult> = {};
    for (const r of json.results ?? []) {
      out[r.scenario_id] = {
        id: r.id,
        data: r.data,
        stars: r.stars,
        insertedAt: r.inserted_at,
        attemptId: r.attempt_id ?? null,
      };
    }
    return out;
  } catch (e) {
    // Expected in local dev without a real Supernova auth/CORS context — this
    // backend isn't reachable from a bare localhost origin. Warn, don't error,
    // so Next's dev overlay doesn't treat handled fallback-to-"no progress yet"
    // as a blocking failure.
    console.warn("[avatars-course] fetchScenarioResults unreachable (expected in local dev)", e);
    return {};
  }
}

export interface SubmitScenarioResultInput {
  data: unknown;
  stars: 1 | 2 | 3;
  attemptId?: string | null;
}

export async function submitScenarioResult(
  scenarioId: string,
  input: SubmitScenarioResultInput,
  auth: Auth
): Promise<{ ok: true; activityEndRedirectTo: string | null } | { ok: false }> {
  if (shouldUseLocalDevProgress(auth)) {
    writeDevResult(scenarioId, {
      id: crypto.randomUUID(),
      data: input.data,
      stars: input.stars,
      insertedAt: new Date().toISOString(),
      attemptId: input.attemptId ?? null,
    });
    return { ok: true, activityEndRedirectTo: null };
  }
  try {
    const res = await fetch(`${RESULTS_PROXY_URL}/${encodeURIComponent(scenarioId)}`, {
      method: "POST",
      headers: authHeaders(auth),
      body: JSON.stringify({
        id: crypto.randomUUID(),
        data: input.data,
        stars: input.stars,
        attempt_id: input.attemptId ?? null,
      }),
    });
    if (!res.ok) {
      console.warn("[avatars-course] submitScenarioResult failed", res.status, await res.text());
      return { ok: false };
    }
    const json = await res.json();
    return { ok: true, activityEndRedirectTo: json.activity_end_redirect_to ?? null };
  } catch (e) {
    console.warn("[avatars-course] submitScenarioResult unreachable (expected in local dev)", e);
    return { ok: false };
  }
}
