import { getDropboxAccessToken } from "../../_shared/dropbox.js";

const REPO = "onenationsvg/onenationsvg";
const BRANCH = "feature/dropbox-github-sync";
const ZIP_PATH = "/OneNation SVG/Website Assets/Gaming Streetwear/onenation-gaming-streetwear-assets.zip";
const ASSET_PREFIX = "assets/optimized/04_Gaming_Streetwear/";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function u32(bytes, p) {
  return bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24 >>> 0);
}
function u16(bytes, p) {
  return bytes[p] | (bytes[p + 1] << 8);
}

function findEocd(bytes) {
  const min = Math.max(0, bytes.length - 65557);
  for (let p = bytes.length - 22; p >= min; p--) {
    if (u32(bytes, p) === 0x06054b50) return p;
  }
  return -1;
}

async function inflateRaw(data) {
  if (typeof DecompressionStream !== "function") throw new Error("ZIP deflate decompression is unavailable.");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const eocd = findEocd(bytes);
  if (eocd < 0) throw new Error("Invalid ZIP archive.");
  const count = u16(bytes, eocd + 10);
  const centralSize = u32(bytes, eocd + 12);
  const centralOffset = u32(bytes, eocd + 16);
  if (centralOffset + centralSize > bytes.length) throw new Error("ZIP central directory is invalid.");

  const files = [];
  let p = centralOffset;
  for (let i = 0; i < count; i++) {
    if (u32(bytes, p) !== 0x02014b50) throw new Error("Unsupported ZIP structure.");
    const method = u16(bytes, p + 10);
    const compressedSize = u32(bytes, p + 20);
    const uncompressedSize = u32(bytes, p + 24);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const localOffset = u32(bytes, p + 42);
    const name = new TextDecoder().decode(bytes.slice(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    if (!name.startsWith("assets/optimized/04_Gaming_Streetwear/") || !name.toLowerCase().endsWith(".webp")) continue;
    if (localOffset + 30 > bytes.length || u32(bytes, localOffset) !== 0x04034b50) throw new Error("Invalid ZIP local header.");
    const localNameLen = u16(bytes, localOffset + 26);
    const localExtraLen = u16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = await inflateRaw(compressed);
    else throw new Error("Unsupported ZIP compression method for " + name);
    if (data.byteLength !== uncompressedSize) throw new Error("ZIP size check failed for " + name);
    files.push({ path: name, data });
  }
  return files;
}

async function github(path, options, token) {
  const response = await fetch("https://api.github.com/repos/" + REPO + path, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!response.ok) throw new Error("GitHub " + response.status + ": " + (body.message || text.slice(0, 300)));
  return body;
}

function base64(bytes) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.GITHUB_TOKEN || !env.DROPBOX_SYNC_SECRET) return json({ ok: false, error: "GitHub sync is not configured." }, 503);
    const authorization = request.headers.get("Authorization") || "";
    if (authorization !== "Bearer " + env.DROPBOX_SYNC_SECRET) return json({ ok: false, error: "Unauthorized." }, 401);
    const accessToken = await getDropboxAccessToken(env);

    const download = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Dropbox-API-Arg": JSON.stringify({ path: ZIP_PATH })
      }
    });
    if (!download.ok) {
      const detail = await download.text();
      throw new Error("Dropbox download failed (" + download.status + "): " + detail.slice(0, 300));
    }

    const files = await extractZip(await download.arrayBuffer());
    if (files.length !== 10) throw new Error("Expected 10 Gaming Streetwear WebP files, found " + files.length + ".");

    const ref = await github("/git/ref/heads/" + encodeURIComponent(BRANCH), { method: "GET" }, env.GITHUB_TOKEN);
    const parentSha = ref.object.sha;
    const parentCommit = await github("/git/commits/" + parentSha, { method: "GET" }, env.GITHUB_TOKEN);
    const blobs = [];
    for (const file of files) {
      const blob = await github("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: base64(file.data), encoding: "base64" })
      }, env.GITHUB_TOKEN);
      blobs.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
    }

    const tree = await github("/git/trees", {
      method: "POST",
      body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree: blobs })
    }, env.GITHUB_TOKEN);

    const commit = await github("/git/commits", {
      method: "POST",
      body: JSON.stringify({
        message: "Add Gaming Streetwear optimized assets from Dropbox",
        tree: tree.sha,
        parents: [parentSha]
      })
    }, env.GITHUB_TOKEN);

    await github("/git/refs/heads/" + encodeURIComponent(BRANCH), {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false })
    }, env.GITHUB_TOKEN);

    return json({
      ok: true,
      branch: BRANCH,
      files: blobs.map(x => x.path),
      commit: commit.sha,
      message: "Gaming Streetwear assets synced to the staging branch."
    });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
}
