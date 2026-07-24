// A full-resolution phone photo (as opposed to a compressed screenshot)
// can be several MB, easily large enough to trip the platform's
// request-body limit before it ever reaches our route handler -- which
// fails as a non-JSON error page, not a normal error response.
// Downscaling client-side keeps the upload comfortably small while
// remaining plenty sharp for OCR/vision.
const MAX_DIMENSION = 2000;
const SKIP_IF_UNDER_BYTES = 3 * 1024 * 1024;

export async function downscaleImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SKIP_IF_UNDER_BYTES) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) return file;
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
