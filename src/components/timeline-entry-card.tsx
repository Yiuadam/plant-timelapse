"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { InkSplash } from "@/components/ink-splash";

const TripMap = dynamic(() => import("@/components/trip-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-black/5 dark:bg-white/5" />,
});

const SIZE_PX: Record<string, number> = { sm: 56, md: 84, lg: 116 };
const SIZE_ORDER = ["sm", "md", "lg"];

export default function TimelineEntryCard({
  id,
  name,
  lat,
  lng,
  dateLabel,
  tripId,
  tripTitle,
  photoUrl,
  initial,
  ringTint,
  accent,
  initialStyle,
  initialSize,
  isUp,
  connectorLength,
  scale = 1,
}: {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dateLabel: string;
  tripId: string;
  tripTitle: string;
  photoUrl: string | null;
  initial: string;
  ringTint: string;
  accent: string;
  initialStyle: string;
  initialSize: string;
  isUp: boolean;
  connectorLength: number;
  scale?: number;
}) {
  const [style, setStyle] = useState(initialStyle);
  const [size, setSize] = useState(initialSize);
  const [mapVisible, setMapVisible] = useState(false);
  const mapWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function persist(patch: Record<string, unknown>) {
    fetch(`/api/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }

  function toggleStyle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = style === "ink" ? "clean" : "ink";
    setStyle(next);
    persist({ cardStyle: next });
  }

  function cycleSize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const idx = SIZE_ORDER.indexOf(size);
    const next = SIZE_ORDER[(idx + 1) % SIZE_ORDER.length];
    setSize(next);
    persist({ cardSize: next });
  }

  const squareSize = (SIZE_PX[size] ?? SIZE_PX.md) * scale;

  return (
    <Link
      href={`/trips/${tripId}`}
      prefetch={true}
      className="group absolute -translate-x-1/2 select-none"
      style={{
        left: "50%",
        [isUp ? "bottom" : "top"]: connectorLength,
      }}
    >
      <div
        className={`relative flex flex-col items-center gap-2 rounded-2xl p-2 shadow-lg ${
          style === "clean"
            ? "border border-black/10 bg-background/80 backdrop-blur-sm dark:border-white/15"
            : ""
        }`}
      >
        {style === "ink" && <InkSplash seed={id} accent={accent} />}

        <div className="relative z-10 flex gap-1.5">
          <div
            className="overflow-hidden rounded-xl border-2 border-background shadow ring-1 ring-black/10 dark:ring-white/15"
            style={{ width: squareSize, height: squareSize }}
          >
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={name}
                width={squareSize}
                height={squareSize}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br font-semibold ${ringTint}`}
              >
                {initial}
              </div>
            )}
          </div>
          <div
            ref={mapWrapRef}
            className="overflow-hidden rounded-xl border-2 border-background shadow ring-1 ring-black/10 dark:ring-white/15"
            style={{ width: squareSize, height: squareSize }}
          >
            {mapVisible && (
              <TripMap
                locations={[{ id, name, lat, lng }]}
                interactive={false}
              />
            )}
          </div>
        </div>

        <div className="relative z-10 w-full text-center" style={{ width: squareSize * 2 + 6 }}>
          <div className="text-xs text-black/50 dark:text-white/50">
            {dateLabel}
          </div>
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-black/40 dark:text-white/40">
            {tripTitle}
          </div>
        </div>

        <div className="absolute -top-2 -right-2 z-20 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={toggleStyle}
            aria-label={style === "ink" ? "Use clean style" : "Use ink-splash style"}
            aria-pressed={style === "ink"}
            className={`flex h-6 w-6 items-center justify-center rounded-full border shadow-sm ${
              style === "ink"
                ? "border-black/20 bg-black/80 text-white dark:border-white/30 dark:bg-white/80 dark:text-black"
                : "border-black/10 bg-white/90 text-black/50 dark:border-white/20 dark:bg-black/60 dark:text-white/60"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 21c-1.1 0-2-.9-2-2 0-.4.1-.7.3-1L9 12l6-6 3 3-6 6-6.3 3.7c-.3.2-.7.3-1 .3zM14.5 4.5l3-3a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4l-3 3-4-4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={cycleSize}
            aria-label="Change card size"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white/90 text-[10px] font-semibold text-black/50 shadow-sm dark:border-white/20 dark:bg-black/60 dark:text-white/60"
          >
            {size.toUpperCase()}
          </button>
        </div>
      </div>
    </Link>
  );
}
