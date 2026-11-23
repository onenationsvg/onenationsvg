import { encryptToken, TOKEN_KEY } from "../../_shared/dropbox.js";

const REDIRECT_URI = "https://onenationsvg.dpdns.org/api/dropbox/callback";
const STATE_COOKIE = "__Host-onenation-dropbox-state";
const CLEAR_STATE_COOKIE = STATE_COOKIE + "=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax";

function page(title, message, status = 200) {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui,sans-serif;max-width:620px;margin:12vh auto;padding:24px;line-height:1.5"><h1>${title}</h1><p>${message}</p><p>You can close this tab and return to OneNation SVG.</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "Set-Cookie": CLEAR_STATE_COOKIE } }
  );
}

export async function onRequestGet({ request, env }) {
  if (!env.DROPBOX_APP_KEY || !env.DROPBOX_APP_SECRET || !env.DROPBOX_KV) {
    return page("Setup incomplete", "The secure Dropbox connection has not been configured by the site administrator.", 503);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieHeader = request.headers.get("Cookie") || "";
  const stateCookie = cookieHeader.match(/(?:^|;\s*)__Host-onenation-dropbox-state=([A-Za-z0-9_-]+)/)?.[1];

  if (oauthError) return page("Authorization not completed", "Dropbox authorization was cancelled or declined.", 400);
  if (!code || !state || !stateCookie || state !== stateCookie || !/^[A-Za-z0-9_-]{40,60}$/.test(state)) {
    return page("Invalid authorization response", "The Dropbox authorization response could not be validated. Start the connection again from the OneNation site.", 400);
  }

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    client_id: env.DROPBOX_APP_KEY,
    client_secret: env.DROPBOX_APP_SECRET
  });

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) return page("Connection unsuccessful", "Dropbox could not complete the authorization exchange. Please start the connection again.", 502);

  const result = await response.json();
  if (!result.access_token || !result.refresh_token) {
    return page("Connection incomplete", "Dropbox did not return the offline authorization required for ongoing synchronization. Please try again.", 502);
  }

  const tokenRecord = {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_at: Date.now() + Number(result.expires_in || 14400) * 1000,
    scope: result.scope || "",
    account_id: result.account_id || ""
  };

  await env.DROPBOX_KV.put(TOKEN_KEY, await encryptToken(tokenRecord, env.DROPBOX_APP_SECRET));
  return page("Dropbox connected", "Your Dropbox account has been securely connected to OneNation SVG. Your authorization is stored server-side and is not exposed to the website browser.");
}
