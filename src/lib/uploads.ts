import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

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

  const blob = await put(`uploads/${tripId}/${randomUUID()}.${ext}`, file, {
    access: "public",
  });

  return blob.url;
}

export async function saveUploadedAvatar(
  file: File,
  userId: string,
): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new UploadError("Only JPEG, PNG, WEBP, and GIF images are allowed");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError("Image must be smaller than 10MB");
  }

  const blob = await put(`avatars/${userId}/${randomUUID()}.${ext}`, file, {
    access: "public",
  });

  return blob.url;
}

export async function saveUploadedTranslationImage(
  file: File,
  userId: string,
): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new UploadError("Only JPEG, PNG, WEBP, and GIF images are allowed");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError("Image must be smaller than 10MB");
  }

  const blob = await put(`translations/${userId}/${randomUUID()}.${ext}`, file, {
    access: "public",
  });

  return blob.url;
}
