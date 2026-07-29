// Proxy to Supernova's scenario-results lookup endpoint.
//
// Why this exists: docs/api-web-prototypes.md only confirms CORS for /api/kv and
// /api/users/kv as *absent* and hedges on /api/speak/scenarios/* ("can be hit
// directly from the browser if they have CORS configured"). The webview loads
// this app from a *.gosupernova.live subdomain, which is cross-origin from
// app.gosupernova.live — if CORS isn't actually configured there, direct
// browser calls fail silently and course progress never loads. Proxying
// through this same-origin route removes that risk entirely, matching the
// established app/api/kv-proxy/[key]/route.ts pattern.

const UPSTREAM = "https://app.gosupernova.live/api/speak/scenarios/results";

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

export async function POST(request: Request) {
  const headers = forwardHeaders(request);
  const body = await request.text();
  const upstream = await fetch(UPSTREAM, {
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
