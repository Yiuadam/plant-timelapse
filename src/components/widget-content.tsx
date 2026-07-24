"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { PassportStampGraphic } from "@/components/passport-stamp";

const TripMap = dynamic(() => import("@/components/trip-map"), {
  ssr: false,
});

export type TripSummary = {
  id: string;
  title: string;
  destination: string | null;
  startDate: string | null;
};

export type PhotoSummary = {
  id: string;
  filePath: string;
  caption: string | null;
  tripTitle: string;
};

export type MapLoc = { id: string; name: string; lat: number; lng: number };

export type TravelSummary = {
  id: string;
  type: string;
  title: string;
  location: string | null;
  startAt: string;
  tripId: string;
  tripTitle: string;
};

export type PassportStampSummary = {
  id: string;
  tripId: string;
  city: string;
  stampedAt: string;
};

const TRAVEL_TYPE_ICON: Record<string, string> = {
  flight: "✈️",
  hotel: "🏨",
  train: "🚆",
};

export type WidgetData = {
  id: string;
  type: string;
  color: string | null;
  content: string | null;
};

export const WIDGET_COLORS = [
  "slate",
  "blue",
  "pink",
  "green",
  "yellow",
  "violet",
  "teal",
  "rose",
  "indigo",
  "coral",
] as const;

export const SWATCH_CLASSES: Record<string, string> = {
  slate: "bg-slate-300",
  blue: "bg-sky-300",
  pink: "bg-pink-300",
  green: "bg-emerald-300",
  yellow: "bg-amber-300",
  violet: "bg-violet-300",
  teal: "bg-teal-300",
  rose: "bg-rose-300",
  indigo: "bg-indigo-300",
  coral: "bg-orange-300",
};

export const ACCENT_HEX: Record<string, string> = {
  slate: "#64748b",
  blue: "#0284c7",
  pink: "#db2777",
  green: "#059669",
  yellow: "#d97706",
  violet: "#7c3aed",
  teal: "#0d9488",
  rose: "#e11d48",
  indigo: "#4f46e5",
  coral: "#ea580c",
};

export const GLASS_TINT: Record<string, string> = {
  slate:
    "from-slate-200/60 to-slate-100/20 dark:from-slate-400/25 dark:to-slate-300/10",
  blue: "from-sky-200/60 to-sky-100/20 dark:from-sky-400/25 dark:to-sky-300/10",
  pink: "from-pink-200/60 to-pink-100/20 dark:from-pink-400/25 dark:to-pink-300/10",
  green:
    "from-emerald-200/60 to-emerald-100/20 dark:from-emerald-400/25 dark:to-emerald-300/10",
  yellow:
    "from-amber-200/60 to-amber-100/20 dark:from-amber-400/25 dark:to-amber-300/10",
  violet:
    "from-indigo-200/60 to-indigo-100/20 dark:from-indigo-400/25 dark:to-indigo-300/10",
  teal: "from-teal-200/60 to-teal-100/20 dark:from-teal-400/25 dark:to-teal-300/10",
  rose: "from-rose-200/60 to-rose-100/20 dark:from-rose-400/25 dark:to-rose-300/10",
  indigo:
    "from-indigo-200/60 to-indigo-100/20 dark:from-indigo-400/25 dark:to-indigo-300/10",
  coral:
    "from-orange-200/60 to-orange-100/20 dark:from-orange-400/25 dark:to-orange-300/10",
};

const PAPER_TINT: Record<string, string> = {
  slate: "from-slate-50 to-slate-100/70 dark:from-white/10 dark:to-white/5",
  blue: "from-sky-50 to-sky-100/70 dark:from-sky-400/15 dark:to-sky-300/5",
  pink: "from-pink-50 to-pink-100/70 dark:from-pink-400/15 dark:to-pink-300/5",
  green:
    "from-emerald-50 to-emerald-100/70 dark:from-emerald-400/15 dark:to-emerald-300/5",
  yellow:
    "from-amber-50 to-amber-100/70 dark:from-amber-400/15 dark:to-amber-300/5",
  violet:
    "from-violet-50 to-violet-100/70 dark:from-violet-400/15 dark:to-violet-300/5",
  teal: "from-teal-50 to-teal-100/70 dark:from-teal-400/15 dark:to-teal-300/5",
  rose: "from-rose-50 to-rose-100/70 dark:from-rose-400/15 dark:to-rose-300/5",
  indigo:
    "from-indigo-50 to-indigo-100/70 dark:from-indigo-400/15 dark:to-indigo-300/5",
  coral:
    "from-orange-50 to-orange-100/70 dark:from-orange-400/15 dark:to-orange-300/5",
};

export const STICKY_COLORS: Record<string, string> = {
  yellow: "from-amber-200 to-amber-100 text-amber-950",
  pink: "from-pink-200 to-pink-100 text-pink-950",
  blue: "from-sky-200 to-sky-100 text-sky-950",
  green: "from-emerald-200 to-emerald-100 text-emerald-950",
  slate: "from-slate-200 to-slate-100 text-slate-950",
  violet: "from-violet-200 to-violet-100 text-violet-950",
  teal: "from-teal-200 to-teal-100 text-teal-950",
  rose: "from-rose-200 to-rose-100 text-rose-950",
  indigo: "from-indigo-200 to-indigo-100 text-indigo-950",
  coral: "from-orange-200 to-orange-100 text-orange-950",
};

function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.right - 168 });
    }
    setOpen((o) => !o);
  }

  return (
    <div data-no-drag className="shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Change color"
        className={`h-4 w-4 rounded-full border border-black/10 shadow-sm dark:border-white/20 ${
          SWATCH_CLASSES[color] ?? SWATCH_CLASSES.slate
        }`}
      />
      {open &&
        pos &&
        createPortal(
          <div data-no-drag>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[9999] flex gap-1.5 rounded-full border border-black/10 bg-white p-2 shadow-lg dark:border-white/20 dark:bg-neutral-800"
              style={{ top: pos.top, left: pos.left }}
            >
              {WIDGET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  aria-label={`Set color ${c}`}
                  className={`h-4 w-4 rounded-full border border-black/10 dark:border-white/20 ${SWATCH_CLASSES[c]}`}
                />
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

const STYLE_LABELS: Record<string, string> = {
  clean: "Clean",
  ink: "Ink splash",
  sketch: "Sketch",
  frame: "Scrapbook",
};

const STYLE_ORDER = ["clean", "ink", "sketch", "frame"] as const;

function StyleIcon({ styleKey }: { styleKey: string }) {
  switch (styleKey) {
    case "ink":
      return (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 21c-1.1 0-2-.9-2-2 0-.4.1-.7.3-1L9 12l6-6 3 3-6 6-6.3 3.7c-.3.2-.7.3-1 .3zM14.5 4.5l3-3a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4l-3 3-4-4z" />
        </svg>
      );
    case "sketch":
      return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 5.5 C 10 3, 16 8, 20 5 M4 12 C 10 10, 16 14, 20 11.5 M4 18.5 C 10 17, 16 20, 20 18" />
        </svg>
      );
    case "frame":
      return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="9" height="6" rx="1" transform="rotate(-18 7.5 6)" opacity="0.9" />
          <rect x="13" y="15" width="9" height="6" rx="1" transform="rotate(-18 17.5 18)" opacity="0.9" />
        </svg>
      );
    default:
      return <span className="block h-1.5 w-1.5 rounded-full bg-current" />;
  }
}

export function StylePicker({
  style,
  onChange,
}: {
  style: string;
  onChange: (style: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.right - 148 });
    }
    setOpen((o) => !o);
  }

  return (
    <div data-no-drag className="shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={`Change widget style (currently ${STYLE_LABELS[style] ?? "Clean"})`}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border shadow-sm ${
          style !== "clean"
            ? "border-black/20 bg-black/80 text-white dark:border-white/30 dark:bg-white/80 dark:text-black"
            : "border-black/10 bg-white/80 text-black/50 dark:border-white/20 dark:bg-black/40 dark:text-white/60"
        }`}
      >
        <StyleIcon styleKey={style} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div data-no-drag>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[9999] flex w-36 flex-col gap-0.5 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg dark:border-white/20 dark:bg-neutral-800"
              style={{ top: pos.top, left: pos.left }}
            >
              {STYLE_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${
                    s === style
                      ? "bg-black/10 font-medium dark:bg-white/15"
                      : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <StyleIcon styleKey={s} />
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function RemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      data-no-drag
      onClick={onRemove}
      aria-label="Remove widget"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-black/50 shadow-sm hover:text-red-600 dark:border-white/20 dark:bg-black/40 dark:text-white/60 dark:hover:text-red-400"
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

function UploadButton({
  trips,
  onUploaded,
}: {
  trips: TripSummary[];
  onUploaded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.right - 220 });
    }
    setError(null);
    setOpen((o) => !o);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tripId) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/trips/${tripId}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Upload failed");
        return;
      }
      setOpen(false);
      onUploaded();
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (trips.length === 0) return null;

  return (
    <div data-no-drag className="shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Upload photo"
        className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/60 shadow-sm dark:border-white/20 dark:bg-black/60 dark:text-white/70"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <div data-no-drag>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[9999] flex w-56 flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 text-sm shadow-lg dark:border-white/20 dark:bg-neutral-800"
              style={{ top: pos.top, left: pos.left }}
            >
              <select
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="rounded-lg border border-black/10 px-2 py-1 text-xs dark:border-white/20 dark:bg-transparent"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <label className="cursor-pointer rounded-lg border border-black/10 px-2 py-1.5 text-center text-xs dark:border-white/20">
                {uploading ? "Uploading..." : "Choose photo"}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFile}
                  disabled={uploading}
                />
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function TripsWidget({
  trips,
  color,
  onColorChange,
  style,
  onStyleChange,
  onRemove,
}: {
  trips: TripSummary[];
  color: string;
  onColorChange: (color: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  onRemove: () => void;
}) {
  const tint = GLASS_TINT[color] ?? GLASS_TINT.violet;

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br shadow-xl backdrop-blur-md dark:border-white/15 ${tint}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/40 px-4 py-2.5 dark:border-white/10">
        <span className="font-medium">Trips</span>
        <div className="flex items-center gap-2">
          <StylePicker style={style} onChange={onStyleChange} />
          <ColorPicker color={color} onChange={onColorChange} />
          <RemoveButton onRemove={onRemove} />
          <Link
            href="/trips/new"
            prefetch={true}
            data-no-drag
            className="rounded-lg bg-black/10 px-2 py-1 text-xs font-medium dark:bg-white/15"
          >
            + New
          </Link>
        </div>
      </div>
      <div
        data-no-drag
        className="flex-1 space-y-2 overflow-y-auto p-3"
      >
        {trips.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No trips yet — add your first one.
          </p>
        ) : (
          trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              prefetch={true}
              className="block rounded-xl bg-white/50 px-3 py-2 text-sm hover:bg-white/70 dark:bg-black/20 dark:hover:bg-black/30"
            >
              <div className="truncate font-medium">{trip.title}</div>
              <div className="truncate text-xs text-black/50 dark:text-white/50">
                {trip.destination}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export function ClockWidget({
  color,
  onColorChange,
  style,
  onStyleChange,
  onRemove,
}: {
  color: string;
  onColorChange: (color: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  onRemove: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const tint = GLASS_TINT[color] ?? GLASS_TINT.slate;
  const accent = ACCENT_HEX[color] ?? ACCENT_HEX.slate;

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    const kickoff = setTimeout(() => setNow(new Date()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(kickoff);
    };
  }, []);

  const seconds = now ? now.getSeconds() : 0;
  const minutes = now ? now.getMinutes() : 0;
  const hours = now ? now.getHours() % 12 : 0;

  const secDeg = seconds * 6;
  const minDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  return (
    <div className="relative z-0 h-full w-full">
      <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
        <StylePicker style={style} onChange={onStyleChange} />
        <ColorPicker color={color} onChange={onColorChange} />
        <RemoveButton onRemove={onRemove} />
      </div>
      <div
        className={`flex h-full w-full items-center justify-center rounded-full border-[6px] border-white/70 bg-gradient-to-br shadow-xl dark:border-white/15 ${tint}`}
      >
        <div className="relative h-[78%] w-[78%] rounded-full bg-gradient-to-br from-white/60 to-transparent shadow-inner dark:from-white/10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{ transform: `rotate(${i * 30}deg)` }}
            >
              <div className="absolute top-[3%] left-1/2 h-[8%] w-[2px] -translate-x-1/2 bg-black/30 dark:bg-white/40" />
            </div>
          ))}
          <div
            className="absolute top-1/2 left-1/2 h-[28%] w-[3px] -translate-x-1/2 -translate-y-full rounded-full bg-black/70 dark:bg-white/80"
            style={{ transformOrigin: "bottom", transform: `rotate(${hourDeg}deg)` }}
          />
          <div
            className="absolute top-1/2 left-1/2 h-[38%] w-[2px] -translate-x-1/2 -translate-y-full rounded-full bg-black/60 dark:bg-white/70"
            style={{ transformOrigin: "bottom", transform: `rotate(${minDeg}deg)` }}
          />
          <div
            className="absolute top-1/2 left-1/2 h-[42%] w-[1px] -translate-x-1/2 -translate-y-full rounded-full"
            style={{
              backgroundColor: accent,
              transformOrigin: "bottom",
              transform: `rotate(${secDeg}deg)`,
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 dark:bg-white/80"
          />
        </div>
      </div>
    </div>
  );
}

export function PhotosWidget({
  photos,
  color,
  onColorChange,
  style,
  onStyleChange,
  onRemove,
  trips,
  onUploaded,
}: {
  photos: PhotoSummary[];
  color: string;
  onColorChange: (color: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  onRemove: () => void;
  trips: TripSummary[];
  onUploaded: () => void;
}) {
  const accent = ACCENT_HEX[color] ?? ACCENT_HEX.slate;
  const [index, setIndex] = useState(0);
  const safeIndex = photos.length === 0 ? 0 : index % photos.length;

  if (photos.length === 0) {
    return (
      <div className="relative z-0 h-full w-full">
        <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
          <UploadButton trips={trips} onUploaded={onUploaded} />
          <StylePicker style={style} onChange={onStyleChange} />
          <ColorPicker color={color} onChange={onColorChange} />
          <RemoveButton onRemove={onRemove} />
        </div>
        <div className="flex h-full w-full items-center justify-center rounded-lg border-8 border-white bg-white text-center text-sm text-black/40 shadow-xl dark:border-white/90">
          No photos yet
        </div>
      </div>
    );
  }

  const top = photos[safeIndex];
  const rest = [1, 2]
    .map((offset) => photos[(safeIndex + offset) % photos.length])
    .filter((p) => p.id !== top.id);

  function go(delta: number) {
    setIndex((i) => (i + delta + photos.length) % photos.length);
  }

  return (
    <div className="group relative z-0 h-full w-full">
      <div className="absolute top-1 right-1 z-20 flex items-center gap-1">
        <UploadButton trips={trips} onUploaded={onUploaded} />
        <StylePicker style={style} onChange={onStyleChange} />
        <ColorPicker color={color} onChange={onColorChange} />
        <RemoveButton onRemove={onRemove} />
      </div>
      {rest.map((photo, i) => (
        <button
          key={photo.id}
          type="button"
          data-no-drag
          onClick={() => {
            const actualIndex = photos.findIndex((p) => p.id === photo.id);
            if (actualIndex !== -1) setIndex(actualIndex);
          }}
          aria-label="Bring this photo to the front"
          className="absolute inset-0 cursor-pointer overflow-hidden rounded-lg border-8 border-white bg-white shadow-lg dark:border-white/90"
          style={{
            transform: `rotate(${(i + 1) * 7 - 3}deg)`,
            zIndex: i,
          }}
        >
          <Image
            src={photo.filePath}
            alt={photo.caption ?? photo.tripTitle}
            fill
            sizes="220px"
            className="object-cover opacity-70"
          />
        </button>
      ))}
      <div
        className="absolute inset-0 flex flex-col overflow-hidden rounded-lg border-8 border-white bg-white shadow-xl dark:border-white/90"
        style={{ zIndex: 10 }}
      >
        <div className="relative flex-1">
          <Image
            src={top.filePath}
            alt={top.caption ?? top.tripTitle}
            fill
            sizes="220px"
            className="object-cover"
          />
        </div>
        <div
          className="shrink-0 truncate px-1 py-1 text-center text-xs text-black/60"
          style={{ borderTop: `3px solid ${accent}` }}
        >
          {top.tripTitle}
        </div>
      </div>
      {photos.length > 1 && (
        <div
          data-no-drag
          className="absolute inset-x-0 bottom-1 z-30 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        >
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/60 shadow-sm dark:border-white/20 dark:bg-black/60 dark:text-white/70"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
            {safeIndex + 1}/{photos.length}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/60 shadow-sm dark:border-white/20 dark:bg-black/60 dark:text-white/70"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export function MapWidget({
  locations,
  color,
  onColorChange,
  style,
  onStyleChange,
  onRemove,
}: {
  locations: MapLoc[];
  color: string;
  onColorChange: (color: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  onRemove: () => void;
}) {
  const accent = ACCENT_HEX[color] ?? ACCENT_HEX.blue;

  return (
    <div className="relative z-0 h-full w-full">
      <div className="absolute top-1 right-1 z-[1200] flex items-center gap-1">
        <StylePicker style={style} onChange={onStyleChange} />
        <ColorPicker color={color} onChange={onColorChange} />
        <RemoveButton onRemove={onRemove} />
      </div>
      <div
        className="h-full w-full overflow-hidden rounded-2xl shadow-xl"
        style={{ border: `4px solid ${accent}` }}
      >
        <TripMap locations={locations} />
      </div>
    </div>
  );
}

export function TravelWidget({
  items,
  color,
  onColorChange,
  style,
  onStyleChange,
  onRemove,
}: {
  items: TravelSummary[];
  color: string;
  onColorChange: (color: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  onRemove: () => void;
}) {
  const tint = GLASS_TINT[color] ?? GLASS_TINT.blue;

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br shadow-xl backdrop-blur-md dark:border-white/15 ${tint}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/40 px-4 py-2.5 dark:border-white/10">
        <span className="font-medium">Travel</span>
        <div className="flex items-center gap-2">
          <StylePicker style={style} onChange={onStyleChange} />
          <ColorPicker color={color} onChange={onColorChange} />
          <RemoveButton onRemove={onRemove} />
        </div>
      </div>
      <div data-no-drag className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No upcoming flights, hotels, or trains yet.
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/trips/${item.tripId}`}
              prefetch={true}
              className="flex items-start gap-2 rounded-xl bg-white/50 px-3 py-2 text-sm hover:bg-white/70 dark:bg-black/20 dark:hover:bg-black/30"
            >
              <span aria-hidden>{TRAVEL_TYPE_ICON[item.type] ?? "🧳"}</span>
              <div className="min-w-0">
                <div className="truncate font-medium">{item.title}</div>
                <div className="truncate text-xs text-black/50 dark:text-white/50">
                  {new Date(item.startAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {item.location && ` · ${item.location}`}
                </div>
                <div className="truncate text-xs text-black/40 dark:text-white/40">
                  {item.tripTitle}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export function NotesWidget({
  content,
  color,
  onColorChange,
  style,
  onStyleChange,
  onRemove,
  onSave,
}: {
  content: string;
  color: string;
  onColorChange: (color: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  onRemove: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(content);
  const tint = PAPER_TINT[color] ?? PAPER_TINT.yellow;

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border border-black/5 bg-gradient-to-br p-3 shadow-xl dark:border-white/10 ${tint}`}
    >
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <span className="text-xs font-medium text-black/50 dark:text-white/50">
          Notes
        </span>
        <div className="flex items-center gap-1">
          <StylePicker style={style} onChange={onStyleChange} />
          <ColorPicker color={color} onChange={onColorChange} />
          <RemoveButton onRemove={onRemove} />
        </div>
      </div>
      <textarea
        data-no-drag
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value)}
        placeholder="Jot something down..."
        className="min-h-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
      />
    </div>
  );
}

export function StickyWidget({
  color,
  content,
  onSave,
  onColorChange,
  style,
  onStyleChange,
  onRemove,
}: {
  color: string;
  content: string;
  onSave: (value: string) => void;
  onColorChange: (color: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(content);
  const gradient = STICKY_COLORS[color] ?? STICKY_COLORS.yellow;

  return (
    <div
      className={`flex h-full flex-col rounded-sm bg-gradient-to-br p-3 shadow-xl ${gradient}`}
    >
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-1">
          <StylePicker style={style} onChange={onStyleChange} />
          <ColorPicker color={color} onChange={onColorChange} />
        </div>
        <button
          type="button"
          data-no-drag
          onClick={onRemove}
          aria-label="Remove sticky note"
          className="text-current/50 hover:text-current"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <textarea
        data-no-drag
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value)}
        placeholder="Write a note..."
        className="min-h-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-current/40"
      />
    </div>
  );
}

export function PassportWidget({
  stamps,
  color,
  onColorChange,
  style,
  onStyleChange,
  onRemove,
}: {
  stamps: PassportStampSummary[];
  color: string;
  onColorChange: (color: string) => void;
  style: string;
  onStyleChange: (style: string) => void;
  onRemove: () => void;
}) {
  const tint = GLASS_TINT[color] ?? GLASS_TINT.indigo ?? GLASS_TINT.violet;

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br shadow-xl backdrop-blur-md dark:border-white/15 ${tint}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/40 px-4 py-2.5 dark:border-white/10">
        <span className="font-medium">Passport</span>
        <div className="flex items-center gap-2">
          <StylePicker style={style} onChange={onStyleChange} />
          <ColorPicker color={color} onChange={onColorChange} />
          <RemoveButton onRemove={onRemove} />
          <Link
            href="/passport"
            prefetch={true}
            data-no-drag
            className="rounded-lg bg-black/10 px-2 py-1 text-xs font-medium dark:bg-white/15"
          >
            Open
          </Link>
        </div>
      </div>
      <div data-no-drag className="flex-1 overflow-y-auto p-3">
        {stamps.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No stamps yet — visit the Passport page once you&apos;ve been.
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {stamps.map((s) => (
              <PassportStampGraphic
                key={s.id}
                city={s.city}
                stampedAt={s.stampedAt}
                seed={s.tripId}
                size={64}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
