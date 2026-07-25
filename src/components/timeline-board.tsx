"use client";

import { useEffect, useState } from "react";
import TimelineEntryCard from "@/components/timeline-entry-card";

const CONNECTOR_LENGTH = 44;
const MAX_CARD_HEIGHT = 210;
const TIMELINE_HEIGHT = (CONNECTOR_LENGTH + MAX_CARD_HEIGHT) * 2 + 24;

// Spacing (interval between entries) is the dominant effect; card scale
// moves too but more subtly, layered on top of each card's own independent
// sm/md/lg size.
const COLUMN_WIDTH_STEPS = [180, 220, 260, 320, 400];
const CARD_SCALE_STEPS = [0.85, 0.92, 1, 1.1, 1.2];
const COLUMN_WIDTH_STORAGE_KEY = "timeline-column-width";

export type TimelineEntryData = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
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
  const [stepIndex, setStepIndex] = useState(2); // index into COLUMN_WIDTH_STEPS, default 260px

  useEffect(() => {
    const kickoff = setTimeout(() => {
      const saved = localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
      if (saved !== null) {
        const idx = COLUMN_WIDTH_STEPS.indexOf(Number(saved));
        if (idx !== -1) setStepIndex(idx);
      }
    }, 0);
    return () => clearTimeout(kickoff);
  }, []);

  function setStep(idx: number) {
    const clamped = Math.max(0, Math.min(COLUMN_WIDTH_STEPS.length - 1, idx));
    setStepIndex(clamped);
    localStorage.setItem(
      COLUMN_WIDTH_STORAGE_KEY,
      String(COLUMN_WIDTH_STEPS[clamped]),
    );
  }

  const columnWidth = COLUMN_WIDTH_STEPS[stepIndex];
  const cardScale = CARD_SCALE_STEPS[stepIndex];
  const width = entries.length * columnWidth + columnWidth;

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-1 text-sm">
        <span className="mr-1 text-black/40 dark:text-white/40">Size</span>
        <button
          type="button"
          onClick={() => setStep(stepIndex - 1)}
          disabled={stepIndex === 0}
          aria-label="Shrink timeline spacing"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 disabled:opacity-30 dark:border-white/20"
        >
          −
        </button>
        <span className="w-10 text-center text-xs text-black/50 dark:text-white/50">
          {columnWidth}px
        </span>
        <button
          type="button"
          onClick={() => setStep(stepIndex + 1)}
          disabled={stepIndex === COLUMN_WIDTH_STEPS.length - 1}
          aria-label="Enlarge timeline spacing"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 disabled:opacity-30 dark:border-white/20"
        >
          +
        </button>
      </div>

      <div className="snap-x snap-mandatory overflow-x-auto pb-4">
        <div
          className="relative"
          style={{
            width,
            height: TIMELINE_HEIGHT,
            transition: "width 0.2s ease",
          }}
        >
          <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-px bg-black/10 dark:bg-white/15" />

          {entries.map((entry, i) => {
            const x = i * columnWidth + columnWidth / 2;

            return (
              <div
                key={entry.id}
                className="absolute top-1/2 snap-center"
                style={{
                  left: x,
                  transform: "translateX(-50%)",
                  transition: "left 0.2s ease",
                }}
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
                  scale={cardScale}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
