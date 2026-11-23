import { getDropboxAccessToken } from "../../_shared/dropbox.js";

const REPO = "onenationsvg/onenationsvg";
const BRANCH = "staging/dropbox-assets";
const ZIP_PATH = "/OneNation SVG/Website Assets/Gaming Streetwear/onenation-gaming-streetwear-assets.zip";
const WEB_READY_PATH = "/OneNation SVG/Website Assets/Men's Collection/OneNation_Performance_Upgrade_Review/OneNation_Performance_Upgrade_Review/web-ready";
const WEB_READY_PREFIX = WEB_READY_PATH + "/";
const APPROVED_CATEGORIES = new Set([
  "01_Brand_Identity",
  "02_Apparel_and_Merchandise",
  "03_Holiday_Collections",
  "04_Marketing_and_Promotion"
]);
const MAX_FILES = 300;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const BATCH_SIZE = 4;

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
      "User-Agent": "OneNation-SVG-Dropbox-Sync",
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

async function dropboxApi(endpoint, accessToken, payload) {
  const response = await fetch("https://api.dropboxapi.com/2/files/" + endpoint, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!response.ok) throw new Error("Dropbox " + response.status + ": " + (body.error_summary || text.slice(0, 300)));
  return body;
}

async function listApprovedWebAssets(accessToken) {
  let page = await dropboxApi("list_folder", accessToken, {
    path: WEB_READY_PATH,
    recursive: true,
    include_deleted: false,
    limit: 2000
  });
  const entries = [...(page.entries || [])];
  while (page.has_more) {
    if (!page.cursor) throw new Error("Dropbox returned more assets without a continuation cursor.");
    page = await dropboxApi("list_folder/continue", accessToken, { cursor: page.cursor });
    entries.push(...(page.entries || []));
    if (entries.length > 5000) throw new Error("Dropbox asset listing exceeded the safety limit.");
  }

  const webFiles = [];
  let excludedNeedsReview = 0;
  let totalBytes = 0;
  for (const entry of entries) {
    if (entry[".tag"] !== "file" || !/\.webp$/i.test(entry.name || "")) continue;
    const displayPath = entry.path_display;
    if (!displayPath || !displayPath.startsWith(WEB_READY_PREFIX)) {
      throw new Error("A Dropbox web-ready asset has no valid display path.");
    }
    const relative = displayPath.slice(WEB_READY_PREFIX.length);
    const parts = relative.split("/");
    if (parts.some(part => !part || part === "." || part === "..")) {
      throw new Error("Dropbox returned an unsafe asset path.");
    }
    if (parts[0] === "06_Needs_Review") {
      excludedNeedsReview++;
      continue;
    }
    if (!APPROVED_CATEGORIES.has(parts[0])) continue;
    if (parts.length < 2) throw new Error("A web-ready asset is outside its category folder.");
    const size = Number(entry.size || 0);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
      throw new Error("Dropbox asset has an invalid or oversized file: " + displayPath);
    }
    totalBytes += size;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("Approved Dropbox assets exceed the 100 MB sync safety limit.");
    webFiles.push({
      path: "assets/optimized/" + relative,
      dropboxPath: displayPath,
      size
    });
  }

  if (webFiles.length < 100 || webFiles.length > MAX_FILES) {
    throw new Error("Expected between 100 and " + MAX_FILES + " approved web-ready files, found " + webFiles.length + ".");
  }
  const paths = new Set(webFiles.map(file => file.path));
  if (paths.size !== webFiles.length) throw new Error("Dropbox returned duplicate web-ready asset paths.");
  webFiles.sort((a, b) => a.path.localeCompare(b.path));
  return { files: webFiles, excludedNeedsReview };
}

async function downloadDropboxFile(path, accessToken) {
  const response = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + accessToken,
      "Dropbox-API-Arg": JSON.stringify({ path })
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Dropbox download failed (" + response.status + "): " + detail.slice(0, 300));
  }
  return new Uint8Array(await response.arrayBuffer());
}

function base64(bytes) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

async function gitBlobSha(data) {
  const header = new TextEncoder().encode("blob " + data.byteLength + "\0");
  const payload = new Uint8Array(header.length + data.length);
  payload.set(header, 0);
  payload.set(data, header.length);
  const digest = await crypto.subtle.digest("SHA-1", payload);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function getBaseRef(token) {
  try {
    const ref = await github("/git/ref/heads/" + encodeURIComponent(BRANCH), { method: "GET" }, token);
    return { ref, branchExists: true };
  } catch (error) {
    if (!String(error).includes("GitHub 404")) throw error;
    const mainRef = await github("/git/ref/heads/main", { method: "GET" }, token);
    return { ref: mainRef, branchExists: false };
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.GITHUB_TOKEN || !env.DROPBOX_SYNC_SECRET) return json({ ok: false, error: "GitHub sync is not configured." }, 503);
    const authorization = request.headers.get("Authorization") || "";
    if (authorization !== "Bearer " + env.DROPBOX_SYNC_SECRET) return json({ ok: false, error: "Unauthorized." }, 401);

    const url = new URL(request.url);
    const batchParam = url.searchParams.get("batch");
    if (batchParam === null || !/^\d+$/.test(batchParam)) {
      return json({ ok: false, error: "A non-negative batch number is required." }, 400);
    }
    const batch = Number(batchParam);
    if (!Number.isSafeInteger(batch) || batch < 0) {
      return json({ ok: false, error: "Invalid batch number." }, 400);
    }

    const accessToken = await getDropboxAccessToken(env);
    const { files: webAssets, excludedNeedsReview } = await listApprovedWebAssets(accessToken);
    const webBatchCount = Math.ceil(webAssets.length / BATCH_SIZE);
    const totalBatches = webBatchCount + 1;
    if (batch >= totalBatches) {
      return json({ ok: false, error: "Batch is outside the current approved asset set.", total_batches: totalBatches }, 400);
    }

    let sourceFiles;
    let batchType;
    let gamingCount = 0;
    if (batch < webBatchCount) {
      batchType = "web-ready";
      const start = batch * BATCH_SIZE;
      const selected = webAssets.slice(start, start + BATCH_SIZE);
      sourceFiles = await mapLimit(selected, 2, async file => {
        const data = await downloadDropboxFile(file.dropboxPath, accessToken);
        if (data.byteLength !== file.size) throw new Error("Dropbox size check failed for " + file.dropboxPath);
        return { path: file.path, data };
      });
    } else {
      batchType = "gaming-streetwear";
      const zipResponse = await fetch("https://content.dropboxapi.com/2/files/download", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "Dropbox-API-Arg": JSON.stringify({ path: ZIP_PATH })
        }
      });
      if (!zipResponse.ok) {
        const detail = await zipResponse.text();
        throw new Error("Gaming Streetwear ZIP download failed (" + zipResponse.status + "): " + detail.slice(0, 300));
      }
      sourceFiles = await extractZip(await zipResponse.arrayBuffer());
      if (sourceFiles.length !== 10) throw new Error("Expected 10 Gaming Streetwear WebP files, found " + sourceFiles.length + ".");
      gamingCount = sourceFiles.length;
    }

    const { ref, branchExists } = await getBaseRef(env.GITHUB_TOKEN);
    const parentSha = ref.object.sha;
    const parentCommit = await github("/git/commits/" + parentSha, { method: "GET" }, env.GITHUB_TOKEN);
    const currentTree = await github("/git/trees/" + parentCommit.tree.sha + "?recursive=1", { method: "GET" }, env.GITHUB_TOKEN);
    if (currentTree.truncated) throw new Error("GitHub asset tree was truncated; refusing an incomplete sync.");
    const existing = new Map((currentTree.tree || [])
      .filter(item => item.type === "blob")
      .map(item => [item.path, item.sha]));

    const uniquePaths = new Set(sourceFiles.map(file => file.path));
    if (uniquePaths.size !== sourceFiles.length) throw new Error("The approved Dropbox asset batch contains duplicate target paths.");

    const comparisons = await mapLimit(sourceFiles, 2, async file => {
      const sha = await gitBlobSha(file.data);
      return existing.get(file.path) === sha ? null : file;
    });
    const changedFiles = comparisons.filter(Boolean);
    const unchangedCount = sourceFiles.length - changedFiles.length;

    if (changedFiles.length === 0) {
      return json({
        ok: true,
        batch,
        total_batches: totalBatches,
        batch_type: batchType,
        batch_files: sourceFiles.length,
        branch: branchExists ? BRANCH : "main",
        branch_url: branchExists ? "https://github.com/" + REPO + "/tree/" + BRANCH : "https://github.com/" + REPO,
        updated: 0,
        unchanged: unchangedCount,
        web_ready_files: webAssets.length,
        gaming_files: gamingCount,
        excluded_needs_review_variants: excludedNeedsReview,
        message: "This approved Dropbox batch already matches GitHub. No commit was needed."
      });
    }

    if (!branchExists) {
      await github("/git/refs", {
        method: "POST",
        body: JSON.stringify({ ref: "refs/heads/" + BRANCH, sha: parentSha })
      }, env.GITHUB_TOKEN);
    }

    const blobs = await mapLimit(changedFiles, 1, async file => {
      const blob = await github("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: base64(file.data), encoding: "base64" })
      }, env.GITHUB_TOKEN);
      return { path: file.path, mode: "100644", type: "blob", sha: blob.sha };
    });

    const tree = await github("/git/trees", {
      method: "POST",
      body: JSON.stringify({ base_tree: parentCommit.tree.sha, tree: blobs })
    }, env.GITHUB_TOKEN);

    const commit = await github("/git/commits", {
      method: "POST",
      body: JSON.stringify({
        message: "Sync approved OneNation Dropbox assets (batch " + (batch + 1) + "/" + totalBatches + ")",
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
      batch,
      total_batches: totalBatches,
      batch_type: batchType,
      batch_files: sourceFiles.length,
      branch: BRANCH,
      branch_url: "https://github.com/" + REPO + "/tree/" + BRANCH,
      updated: blobs.length,
      unchanged: unchangedCount,
      web_ready_files: webAssets.length,
      gaming_files: gamingCount,
      excluded_needs_review_variants: excludedNeedsReview,
      files: blobs.map(file => file.path),
      commit: commit.sha,
      message: "Approved OneNation Dropbox batch synced to the staging branch. Production was not changed."
    });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
}
