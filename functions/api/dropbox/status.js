export async function onRequestGet({ env }) {
  if (!env.DROPBOX_KV) {
    return Response.json({ configured: false, connected: false }, {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }
  const connected = Boolean(await env.DROPBOX_KV.get("dropbox:primary"));
  return Response.json({ configured: true, connected }, {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}
