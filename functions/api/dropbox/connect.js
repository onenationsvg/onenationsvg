const REDIRECT_URI = "https://www.onenationsvg.dpdns.org/api/dropbox/callback";

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function onRequestGet({ request, env }) {
  if (!env.DROPBOX_APP_KEY || !env.DROPBOX_KV) {
    return new Response("Dropbox connection is not configured yet.", { status: 503 });
  }

  const state = randomState();
  await env.DROPBOX_KV.put("dropbox:oauth-state:" + state, "pending", { expirationTtl: 600 });

  const authorize = new URL("https://www.dropbox.com/oauth2/authorize");
  authorize.searchParams.set("client_id", env.DROPBOX_APP_KEY);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", REDIRECT_URI);
  authorize.searchParams.set("token_access_type", "offline");
  authorize.searchParams.set("state", state);

  return Response.redirect(authorize.toString(), 302);
}
