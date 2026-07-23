import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class UploadError extends Error {}

export async function saveUploadedPhoto(
  file: File,
  tripId: string,
): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new UploadError("Only JPEG, PNG, WEBP, and GIF images are allowed");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError("Image must be smaller than 10MB");
  }

  const dir = path.join(process.cwd(), "public", "uploads", tripId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${tripId}/${filename}`;
}
