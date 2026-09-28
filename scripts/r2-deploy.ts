/**
 * Deploy a static site to Cloudflare R2.
 *
 * Reads credentials from `.env.r2` (NOT committed).
 * Uploads everything under `./out` to the bucket, preserving the directory structure.
 * - Sets `Cache-Control` aggressively for hashed `_next/static/*` files
 * - Sets a short cache for `index.html` and other top-level HTML
 * - Sets correct `Content-Type` per extension
 *
 * Usage:
 *   bun run scripts/r2-deploy.ts [out-dir]
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, posix, extname } from "node:path";
import process from "node:process";
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// Load .env.r2 manually (we don't want to require dotenv)
import { existsSync } from "node:fs";
const ENV_PATH = join(process.cwd(), ".env.r2");
if (!existsSync(ENV_PATH)) {
  console.error(`Cannot find .env.r2 at ${ENV_PATH}`);
  console.error("Cwd:", process.cwd());
  process.exit(1);
}
const envText = await readFile(ENV_PATH, "utf8");
for (const line of envText.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (key && !process.env[key]) process.env[key] = val;
}
console.log("Parsed env keys:", Object.keys(process.env).filter(k => k.startsWith("R2_")));

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const BUCKET = process.env.R2_BUCKET_NAME!;
const ENDPOINT = process.env.R2_ENDPOINT!;

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET || !ENDPOINT) {
  console.error("Missing R2 env vars. Check .env.r2");
  process.exit(1);
}

const SRC_DIR = process.argv[2] || join(process.cwd(), "out");

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
  forcePathStyle: false,
});

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".txt":  "text/plain; charset=utf-8",
  ".xml":  "application/xml; charset=utf-8",
  ".map":  "application/json; charset=utf-8",
  ".pdf":  "application/pdf",
  ".webmanifest": "application/manifest+json",
};

function cacheFor(key: string): string {
  // Hashed assets in _next/static → immutable
  if (key.startsWith("_next/static/") || /\/_next\/static\//.test(key)) {
    return "public, max-age=31536000, immutable";
  }
  // HTML → short, must revalidate to pick up new deploys
  if (key.endsWith(".html")) {
    return "public, max-age=60, must-revalidate";
  }
  // Everything else → 1 day
  return "public, max-age=86400, must-revalidate";
}

async function listDir(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await listDir(full));
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`Bucket "${BUCKET}" exists.`);
  } catch (err: any) {
    const name = err?.name || "";
    if (name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
      console.log(`Bucket "${BUCKET}" not found — creating…`);
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    } else {
      // Some R2 setups return 403 instead of 404 when bucket doesn't exist
      console.warn(`HeadBucket failed (${name || "unknown"}). Attempting create anyway…`);
      try {
        await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
      } catch (e) {
        console.error("CreateBucket failed:", e);
        throw err;
      }
    }
  }
}

async function clearBucket(): Promise<void> {
  let continuationToken: string | undefined;
  let total = 0;
  do {
    const list = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    }));
    if (list.Contents && list.Contents.length > 0) {
      await s3.send(new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: list.Contents.map((o) => ({ Key: o.Key! })),
          Quiet: true,
        },
      }));
      total += list.Contents.length;
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
  if (total > 0) console.log(`Cleared ${total} existing objects.`);
}

async function uploadFile(localPath: string): Promise<void> {
  const key = relative(SRC_DIR, localPath).split("\\").join("/"); // posix
  const body = await readFile(localPath);
  const ext = extname(key).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const cache = cacheFor(key);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cache,
  }));
}

async function main(): Promise<void> {
  console.log("=== R2 Deploy ===");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Bucket:   ${BUCKET}`);
  console.log(`Source:   ${SRC_DIR}`);
  console.log("");

  await ensureBucket();
  await clearBucket();

  console.log("Uploading files…");
  const files = await listDir(SRC_DIR);
  console.log(`Found ${files.length} files.\n`);

  let ok = 0;
  let fail = 0;
  for (const f of files) {
    try {
      await uploadFile(f);
      const key = relative(SRC_DIR, f).split("\\").join("/");
      console.log(`  ✓ ${key}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${relative(SRC_DIR, f)} — ${err}`);
      fail++;
    }
  }

  console.log("");
  console.log(`Done. Uploaded ${ok}/${files.length} files (${fail} failed).`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. In Cloudflare R2 dashboard → bucket "${BUCKET}" → Settings → enable Public Access`);
  console.log(`     (either via r2.dev subdomain or a custom domain)`);
  console.log(`  2. For SPA-like routing: R2 already serves index.html at the bucket root.`);
  console.log(`     Deep links to non-existent paths will 404 — set up a Cloudflare Worker`);
  console.log(`     in front of R2 if you need SPA fallback.`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
