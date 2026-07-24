"use client";

import { useEffect, useState } from "react";
import TimelineEntryCard from "@/components/timeline-entry-card";

const COLUMN_WIDTH = 260;
const CONNECTOR_LENGTH = 44;
const MAX_CARD_HEIGHT = 210;
const TIMELINE_HEIGHT = (CONNECTOR_LENGTH + MAX_CARD_HEIGHT) * 2 + 24;

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 1.75];
const ZOOM_STORAGE_KEY = "timeline-zoom";

export type TimelineEntryData = {
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
};

export default function TimelineBoard({
  entries,
}: {
  entries: TimelineEntryData[];
}) {
  const [zoomIndex, setZoomIndex] = useState(1); // index into ZOOM_STEPS, default 1x

  useEffect(() => {
    const kickoff = setTimeout(() => {
      const saved = localStorage.getItem(ZOOM_STORAGE_KEY);
      if (saved !== null) {
        const idx = ZOOM_STEPS.indexOf(Number(saved));
        if (idx !== -1) setZoomIndex(idx);
      }
    }, 0);
    return () => clearTimeout(kickoff);
  }, []);

  function setZoom(idx: number) {
    const clamped = Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx));
    setZoomIndex(clamped);
    localStorage.setItem(ZOOM_STORAGE_KEY, String(ZOOM_STEPS[clamped]));
  }

  const zoom = ZOOM_STEPS[zoomIndex];
  const width = entries.length * COLUMN_WIDTH + COLUMN_WIDTH;
  const height = TIMELINE_HEIGHT;

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-1 text-sm">
        <span className="mr-1 text-black/40 dark:text-white/40">Size</span>
        <button
          type="button"
          onClick={() => setZoom(zoomIndex - 1)}
          disabled={zoomIndex === 0}
          aria-label="Shrink timeline"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 disabled:opacity-30 dark:border-white/20"
        >
          −
        </button>
        <span className="w-10 text-center text-xs text-black/50 dark:text-white/50">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom(zoomIndex + 1)}
          disabled={zoomIndex === ZOOM_STEPS.length - 1}
          aria-label="Enlarge timeline"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 disabled:opacity-30 dark:border-white/20"
        >
          +
        </button>
      </div>

      <div className="snap-x snap-mandatory overflow-x-auto pb-4">
        <div
          style={{
            width: width * zoom,
            height: height * zoom,
          }}
        >
          <div
            className="relative"
            style={{
              width,
              height,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-px bg-black/10 dark:bg-white/15" />

            {entries.map((entry, i) => {
              const x = i * COLUMN_WIDTH + COLUMN_WIDTH / 2;

              return (
                <div
                  key={entry.id}
                  className="absolute top-1/2 snap-center"
                  style={{ left: x, transform: "translateX(-50%)" }}
                >
                  <div className="absolute top-0 left-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-black/40 dark:bg-white/50" />

                  <div
                    className="absolute left-1/2 w-px -translate-x-1/2 bg-black/15 dark:bg-white/20"
                    style={{
                      height: CONNECTOR_LENGTH,
                      [entry.isUp ? "bottom" : "top"]: 0,
                    }}
                  />

                  <TimelineEntryCard
                    id={entry.id}
                    name={entry.name}
                    lat={entry.lat}
                    lng={entry.lng}
                    dateLabel={entry.dateLabel}
                    tripId={entry.tripId}
                    tripTitle={entry.tripTitle}
                    photoUrl={entry.photoUrl}
                    initial={entry.initial}
                    ringTint={entry.ringTint}
                    accent={entry.accent}
                    initialStyle={entry.initialStyle}
                    initialSize={entry.initialSize}
                    isUp={entry.isUp}
                    connectorLength={CONNECTOR_LENGTH}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
