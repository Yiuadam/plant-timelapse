import { getCloudflareContext } from "@opennextjs/cloudflare";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class UploadError extends Error {}

// Uploads go to an R2 bucket bound to the Worker as `PHOTOS` (see
// wrangler.jsonc). R2 buckets aren't public by default, so the bucket's
// public base URL -- its r2.dev subdomain or a custom domain -- is
// configured separately as R2_PUBLIC_URL and joined to the object key to
// build the URL stored on the Photo/User row.
async function getBucket() {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = env.PHOTOS;
  if (!bucket) {
    throw new UploadError("Photo storage is not configured");
  }
  return bucket;
}

function publicBase() {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) {
    throw new UploadError("Photo storage is not configured");
  }
  return base.replace(/\/+$/, "");
}

function validate(file: File) {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new UploadError("Only JPEG, PNG, WEBP, and GIF images are allowed");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError("Image must be smaller than 10MB");
  }
  return ext;
}

async function store(key: string, file: File) {
  const base = publicBase();
  const bucket = await getBucket();
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return `${base}/${key}`;
}

export async function saveUploadedPhoto(
  file: File,
  tripId: string,
): Promise<string> {
  const ext = validate(file);
  return store(`uploads/${tripId}/${crypto.randomUUID()}.${ext}`, file);
}

export async function saveUploadedAvatar(
  file: File,
  userId: string,
): Promise<string> {
  const ext = validate(file);
  return store(`avatars/${userId}/${crypto.randomUUID()}.${ext}`, file);
}

// Stored values are full public URLs, but R2 deletes address the object
// by key -- strip the configured public base back off to recover it.
// Returns null for anything not under this bucket (e.g. an OAuth avatar
// hosted by Google), which should be left alone rather than deleted.
export function objectKeyFromUrl(url: string): string | null {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return null;
  const prefix = `${base.replace(/\/+$/, "")}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export async function deleteStoredFile(url: string): Promise<void> {
  const key = objectKeyFromUrl(url);
  if (!key) return;
  const bucket = await getBucket();
  await bucket.delete(key);
}
