"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export type TripPhoto = {
  id: string;
  filePath: string;
  caption: string | null;
  recognition: string | null;
  recognizedAt: string | Date | null;
};

export default function TripPhotos({
  tripId,
  photos,
}: {
  tripId: string;
  photos: TripPhoto[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [recognizingId, setRecognizingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Uploads one at a time (rather than Promise.all) so progress reflects
  // real completions and a slow/failed photo doesn't hold up the others.
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    let failures = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        setProgress({ done: i, total: files.length });
        try {
          const formData = new FormData();
          formData.append("file", files[i]);
          const res = await fetch(`/api/trips/${tripId}/photos`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) failures++;
        } catch {
          failures++;
        }
      }
      if (failures > 0) {
        setError(
          failures === files.length
            ? "Failed to upload photo"
            : `${failures} of ${files.length} photos failed to upload`,
        );
      }
      router.refresh();
    } finally {
      setProgress(null);
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleRecognize(id: string) {
    setError(null);
    setRecognizingId(id);
    try {
      const res = await fetch(`/api/photos/${id}/recognize`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Recognition failed");
        return;
      }
      router.refresh();
    } finally {
      setRecognizingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="inline-block cursor-pointer rounded-xl border border-black/10 px-3 py-1.5 text-sm dark:border-white/20">
          {uploading
            ? progress
              ? `Uploading ${progress.done + 1}/${progress.total}...`
              : "Uploading..."
            : "Add photo"}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          No photos yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="flex flex-col gap-2 rounded-xl border border-black/10 p-2 dark:border-white/20"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                <Image
                  src={photo.filePath}
                  alt={photo.caption ?? "Trip photo"}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
              </div>
              {photo.recognition ? (
                <p className="text-xs text-black/70 dark:text-white/70">
                  {photo.recognition}
                </p>
              ) : (
                <button
                  onClick={() => handleRecognize(photo.id)}
                  disabled={recognizingId === photo.id}
                  className="text-xs text-blue-600 underline disabled:opacity-50"
                >
                  {recognizingId === photo.id
                    ? "Recognizing..."
                    : "Recognize photo"}
                </button>
              )}
              <button
                onClick={() => handleDelete(photo.id)}
                className="text-xs text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
