// Proxy cùng origin; không thực thi nghiệp vụ, không lưu token hoặc DB credential.
export const dynamic = "force-dynamic";
async function proxy(request: Request) {
  const incoming = new URL(request.url), suffix = incoming.pathname.slice(4);
  if (!/^\/(auth\/login|customers(?:\/.*)?|products|issue-categories|devices\/[^/]+\/warranty|tickets(?:\/.*)?)$/.test(suffix))
    return Response.json({ error: { code: "RESOURCE_NOT_FOUND", message: "Không tìm thấy endpoint.", fields: {} } }, { status: 404 });
  const headers = new Headers();
  for (const name of ["authorization", "content-type", "accept"]) { const value = request.headers.get(name); if (value) headers.set(name, value); }
  try {
    const target = process.env.L2_API_PROXY_TARGET ?? "http://127.0.0.1:3001";
    const response = await fetch(target + "/api" + suffix + incoming.search, {
      method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(), cache: "no-store", signal: AbortSignal.timeout(9000), redirect: "manual",
    });
    const output = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    const location = response.headers.get("location"); if (location) output.set("Location", location);
    return new Response(response.body, { status: response.status, headers: output });
  } catch { return Response.json({ error: { code: "BACKEND_UNAVAILABLE", message: "Không thể kết nối Backend. Vui lòng thử lại.", fields: {} } }, { status: 503 }); }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
