"use client";

import { useState } from "react";
import Image from "next/image";
import { POSTER_THEMES } from "@/lib/poster-themes";

export default function PosterEditor({
  tripId,
  photos,
}: {
  tripId: string;
  photos: { id: string; filePath: string }[];
}) {
  const [theme, setTheme] = useState<string>(POSTER_THEMES[0].key);
  const [photoId, setPhotoId] = useState<string | null>(photos[0]?.id ?? null);
  const [shared, setShared] = useState(false);

  const posterUrl = `/api/trips/${tripId}/poster?theme=${encodeURIComponent(theme)}${
    photoId ? `&photoId=${encodeURIComponent(photoId)}` : ""
  }`;

  async function handleShare() {
    setShared(false);
    try {
      const res = await fetch(posterUrl);
      const blob = await res.blob();
      const file = new File([blob], "trip-poster.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        share?: (data: unknown) => Promise<void>;
        canShare?: (data: unknown) => boolean;
      };
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({ files: [file], title: "My trip poster" });
        return;
      }
    } catch {
      // fall through to clipboard/download fallback below
    }
    setShared(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-2xl border border-black/10 shadow-lg dark:border-white/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={posterUrl}
          src={posterUrl}
          alt="Trip poster preview"
          className="aspect-[4/5] w-full object-cover"
        />
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Theme</div>
        <div className="flex flex-wrap gap-2">
          {POSTER_THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTheme(t.key)}
              className={`rounded-xl border px-3 py-1.5 text-sm ${
                theme === t.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/10 dark:border-white/20"
              }`}
              style={
                theme !== t.key
                  ? { background: `linear-gradient(135deg, ${t.gradient[0]}, ${t.gradient[1]})`, color: "white" }
                  : undefined
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {photos.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium">Cover photo</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhotoId(null)}
              className={`flex h-16 w-16 items-center justify-center rounded-xl border text-xs ${
                photoId === null
                  ? "border-foreground ring-2 ring-foreground"
                  : "border-black/10 dark:border-white/20"
              }`}
            >
              None
            </button>
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhotoId(p.id)}
                className={`relative h-16 w-16 overflow-hidden rounded-xl border ${
                  photoId === p.id
                    ? "border-foreground ring-2 ring-foreground"
                    : "border-black/10 dark:border-white/20"
                }`}
              >
                <Image src={p.filePath} alt="" fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <a
          href={posterUrl}
          download="trip-poster.png"
          className="rounded-xl bg-foreground px-4 py-2 text-center text-background"
        >
          Download poster
        </a>
        <button
          type="button"
          onClick={handleShare}
          className="rounded-xl border border-black/10 px-4 py-2 dark:border-white/20"
        >
          Share
        </button>
      </div>
      {shared && (
        <p className="text-sm text-black/60 dark:text-white/60">
          Sharing isn&apos;t available on this device/browser — use Download instead.
        </p>
      )}
    </div>
  );
}
