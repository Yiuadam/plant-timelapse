"use client";

import { useEffect, useState } from "react";
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

export const STICKY_COLORS: Record<string, string> = {
  yellow: "from-amber-200 to-amber-100 text-amber-950",
  pink: "from-pink-200 to-pink-100 text-pink-950",
  blue: "from-sky-200 to-sky-100 text-sky-950",
  green: "from-emerald-200 to-emerald-100 text-emerald-950",
};

export function TripsWidget({ trips }: { trips: TripSummary[] }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-indigo-200/60 to-indigo-100/20 shadow-xl backdrop-blur-md dark:border-white/15 dark:from-indigo-400/25 dark:to-indigo-300/10">
      <div className="flex shrink-0 items-center justify-between border-b border-white/40 px-4 py-2.5 dark:border-white/10">
        <span className="font-medium">Trips</span>
        <Link
          href="/trips/new"
          data-no-drag
          className="rounded-lg bg-black/10 px-2 py-1 text-xs font-medium dark:bg-white/15"
        >
          + New
        </Link>
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

export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);

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
    <div className="flex h-full w-full items-center justify-center rounded-full border-[6px] border-white/70 bg-gradient-to-br from-white/90 to-white/40 shadow-xl dark:border-white/15 dark:from-white/20 dark:to-white/5">
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
          className="absolute top-1/2 left-1/2 h-[42%] w-[1px] -translate-x-1/2 -translate-y-full rounded-full bg-red-500"
          style={{ transformOrigin: "bottom", transform: `rotate(${secDeg}deg)` }}
        />
        <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/70 dark:bg-white/80" />
      </div>
    </div>
  );
}

export function PhotosWidget({ photos }: { photos: PhotoSummary[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border-8 border-white bg-white text-center text-sm text-black/40 shadow-xl dark:border-white/90">
        No photos yet
      </div>
    );
  }

  const [top, ...rest] = photos.slice(0, 3);

  return (
    <div className="relative h-full w-full">
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
        <div className="shrink-0 truncate px-1 py-1 text-center text-xs text-black/60">
          {top.tripTitle}
        </div>
      </div>
    </div>
  );
}

export function MapWidget({ locations }: { locations: MapLoc[] }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border-4 border-white/70 shadow-xl dark:border-white/15">
      <TripMap locations={locations} />
    </div>
  );
}

export function NotesWidget({
  content,
  onSave,
}: {
  content: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(content);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-black/5 bg-gradient-to-br from-orange-50 to-orange-100/60 p-3 shadow-xl dark:border-white/10 dark:from-white/10 dark:to-white/5">
      <div className="mb-1 shrink-0 text-xs font-medium text-black/50 dark:text-white/50">
        Notes
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
  onRemove,
}: {
  color: string;
  content: string;
  onSave: (value: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(content);
  const gradient = STICKY_COLORS[color] ?? STICKY_COLORS.yellow;

  return (
    <div
      className={`flex h-full flex-col rounded-sm bg-gradient-to-br p-3 shadow-xl ${gradient}`}
    >
      <div className="mb-1 flex shrink-0 justify-end">
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
