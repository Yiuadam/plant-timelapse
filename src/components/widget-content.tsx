"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

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
] as const;

export const SWATCH_CLASSES: Record<string, string> = {
  slate: "bg-slate-300",
  blue: "bg-sky-300",
  pink: "bg-pink-300",
  green: "bg-emerald-300",
  yellow: "bg-amber-300",
  violet: "bg-violet-300",
};

const ACCENT_HEX: Record<string, string> = {
  slate: "#64748b",
  blue: "#0284c7",
  pink: "#db2777",
  green: "#059669",
  yellow: "#d97706",
  violet: "#7c3aed",
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
};

export const STICKY_COLORS: Record<string, string> = {
  yellow: "from-amber-200 to-amber-100 text-amber-950",
  pink: "from-pink-200 to-pink-100 text-pink-950",
  blue: "from-sky-200 to-sky-100 text-sky-950",
  green: "from-emerald-200 to-emerald-100 text-emerald-950",
  slate: "from-slate-200 to-slate-100 text-slate-950",
  violet: "from-violet-200 to-violet-100 text-violet-950",
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

export function TripsWidget({
  trips,
  color,
  onColorChange,
}: {
  trips: TripSummary[];
  color: string;
  onColorChange: (color: string) => void;
}) {
  const tint = GLASS_TINT[color] ?? GLASS_TINT.violet;

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br shadow-xl backdrop-blur-md dark:border-white/15 ${tint}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/40 px-4 py-2.5 dark:border-white/10">
        <span className="font-medium">Trips</span>
        <div className="flex items-center gap-2">
          <ColorPicker color={color} onChange={onColorChange} />
          <Link
            href="/trips/new"
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
}: {
  color: string;
  onColorChange: (color: string) => void;
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
    <div className="relative h-full w-full">
      <div className="absolute top-1 right-1 z-10">
        <ColorPicker color={color} onChange={onColorChange} />
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
}: {
  photos: PhotoSummary[];
  color: string;
  onColorChange: (color: string) => void;
}) {
  const accent = ACCENT_HEX[color] ?? ACCENT_HEX.slate;

  if (photos.length === 0) {
    return (
      <div className="relative h-full w-full">
        <div className="absolute top-1 right-1 z-10">
          <ColorPicker color={color} onChange={onColorChange} />
        </div>
        <div className="flex h-full w-full items-center justify-center rounded-lg border-8 border-white bg-white text-center text-sm text-black/40 shadow-xl dark:border-white/90">
          No photos yet
        </div>
      </div>
    );
  }

  const [top, ...rest] = photos.slice(0, 3);

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-1 right-1 z-20">
        <ColorPicker color={color} onChange={onColorChange} />
      </div>
      {rest.map((photo, i) => (
        <div
          key={photo.id}
          className="absolute inset-0 rounded-lg border-8 border-white bg-white shadow-lg dark:border-white/90"
          style={{
            transform: `rotate(${(i + 1) * 7 - 3}deg)`,
            zIndex: i,
          }}
        />
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
            unoptimized
          />
        </div>
        <div
          className="shrink-0 truncate px-1 py-1 text-center text-xs text-black/60"
          style={{ borderTop: `3px solid ${accent}` }}
        >
          {top.tripTitle}
        </div>
      </div>
    </div>
  );
}

export function MapWidget({
  locations,
  color,
  onColorChange,
}: {
  locations: MapLoc[];
  color: string;
  onColorChange: (color: string) => void;
}) {
  const accent = ACCENT_HEX[color] ?? ACCENT_HEX.blue;

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-1 right-1 z-[1200]">
        <ColorPicker color={color} onChange={onColorChange} />
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

export function NotesWidget({
  content,
  color,
  onColorChange,
  onSave,
}: {
  content: string;
  color: string;
  onColorChange: (color: string) => void;
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
        <ColorPicker color={color} onChange={onColorChange} />
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
  onRemove,
}: {
  color: string;
  content: string;
  onSave: (value: string) => void;
  onColorChange: (color: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(content);
  const gradient = STICKY_COLORS[color] ?? STICKY_COLORS.yellow;

  return (
    <div
      className={`flex h-full flex-col rounded-sm bg-gradient-to-br p-3 shadow-xl ${gradient}`}
    >
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <ColorPicker color={color} onChange={onColorChange} />
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
