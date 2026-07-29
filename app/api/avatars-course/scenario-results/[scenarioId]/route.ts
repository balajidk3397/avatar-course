// Proxy to Supernova's per-scenario result submission endpoint.
// See app/api/avatars-course/scenario-results/route.ts for why this proxy exists.

const UPSTREAM = "https://app.gosupernova.live/api/speak/scenarios";

function forwardHeaders(req: Request): Headers {
  const out = new Headers({ "content-type": "application/json" });
  const auth = req.headers.get("authorization");
  if (auth) out.set("authorization", auth);
  const userId = req.headers.get("x-sn-user-id");
  if (userId) out.set("x-sn-user-id", userId);
  req.headers.forEach((value, name) => {
    if (name.startsWith("x-sn-") && name !== "x-sn-user-id") {
      out.set(name, value);
    }
  });
  return out;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  const { scenarioId } = await params;
  const headers = forwardHeaders(request);
  const body = await request.text();
  const upstream = await fetch(`${UPSTREAM}/${encodeURIComponent(scenarioId)}/result`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });
  const respBody = await upstream.text();
  return new Response(respBody, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
