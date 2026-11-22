const REDIRECT_URI = "https://www.onenationsvg.dpdns.org/api/dropbox/callback";
const STATE_COOKIE = "__Host-onenation-dropbox-state";

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function onRequestGet({ env }) {
  if (!env.DROPBOX_APP_KEY) {
    return new Response("Dropbox connection is not configured yet.", {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const state = randomState();
  const authorize = new URL("https://www.dropbox.com/oauth2/authorize");
  authorize.searchParams.set("client_id", env.DROPBOX_APP_KEY);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", REDIRECT_URI);
  authorize.searchParams.set("token_access_type", "offline");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      "Location": authorize.toString(),
      "Set-Cookie": STATE_COOKIE + "=" + state + "; Path=/; Max-Age=600; Secure; HttpOnly; SameSite=Lax",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer"
    }
  });
}
