import { getDropboxAccessToken } from "../../_shared/dropbox.js";

const ALLOWED = new Set([
  "IMG-20261123-WA0000.jpg",
  "IMG-20261123-WA0001.jpg",
  "IMG-20261123-WA0002.jpg",
  "IMG-20261123-WA0003.jpg",
  "IMG-20261123-WA0004.jpg",
  "IMG-20261123-WA0005.jpg",
  "IMG-20261123-WA0006.jpg",
  "IMG-20261123-WA0007.jpg",
  "IMG-20261123-WA0008.jpg"
]);

async function downloadDropboxFile(path, accessToken) {
  const response = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Dropbox-API-Arg": JSON.stringify({ path })
    }
  });
  if (!response.ok) throw new Error("Dropbox download failed: " + response.status);
  return new Uint8Array(await response.arrayBuffer());
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequestGet({ request, env }) {
  try {
    if (!env.DROPBOX_SYNC_SECRET) return json({ ok: false, error: "Dropbox sync is not configured." }, 503);

    const authorization = request.headers.get("Authorization") || "";
    if (authorization !== "Bearer " + env.DROPBOX_SYNC_SECRET) return json({ ok: false, error: "Unauthorized." }, 401);

    const name = new URL(request.url).searchParams.get("name") || "";
    if (!ALLOWED.has(name) || name.includes("..") || /[\\/]/.test(name)) {
      return json({ ok: false, error: "Unsupported artwork filename." }, 400);
    }

    const dropboxPath = "/OneNation SVG/Website Assets/Original Artwork/" + name;
    const accessToken = await getDropboxAccessToken(env);
    const data = await downloadDropboxFile(dropboxPath, accessToken);

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(data.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "attachment; filename=\"" + name + "\""
      }
    });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
}
