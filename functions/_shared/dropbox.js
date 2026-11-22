const TOKEN_KEY = "dropbox:primary";

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function tokenCryptoKey(appSecret, usage) {
  const material = new TextEncoder().encode("onenation-dropbox-token-v1:" + usage + ":" + appSecret);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [usage]);
}

export async function encryptToken(token, appSecret) {
  const key = await tokenCryptoKey(appSecret, "encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(token));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return JSON.stringify({ version: 1, iv: toBase64Url(iv), data: toBase64Url(new Uint8Array(ciphertext)) });
}

export async function decryptToken(serialized, appSecret) {
  const record = JSON.parse(serialized);
  if (record.version !== 1 || !record.iv || !record.data) throw new Error("Invalid stored Dropbox token.");
  const key = await tokenCryptoKey(appSecret, "decrypt");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(record.iv) },
    key,
    fromBase64Url(record.data)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function getDropboxAccessToken(env) {
  if (!env.DROPBOX_KV || !env.DROPBOX_APP_KEY || !env.DROPBOX_APP_SECRET) {
    throw new Error("Dropbox server configuration is incomplete.");
  }
  const stored = await env.DROPBOX_KV.get(TOKEN_KEY);
  if (!stored) throw new Error("Dropbox is not connected.");
  const token = await decryptToken(stored, env.DROPBOX_APP_SECRET);

  if (token.access_token && token.expires_at && token.expires_at > Date.now() + 60_000) {
    return token.access_token;
  }
  if (!token.refresh_token) throw new Error("Dropbox authorization must be renewed.");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
    client_id: env.DROPBOX_APP_KEY,
    client_secret: env.DROPBOX_APP_SECRET
  });
  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) throw new Error("Dropbox token refresh failed.");
  const refreshed = await response.json();
  const updated = {
    ...token,
    access_token: refreshed.access_token,
    expires_at: Date.now() + Number(refreshed.expires_in || 14400) * 1000,
    scope: refreshed.scope || token.scope
  };
  await env.DROPBOX_KV.put(TOKEN_KEY, await encryptToken(updated, env.DROPBOX_APP_SECRET));
  return updated.access_token;
}

export { TOKEN_KEY };
