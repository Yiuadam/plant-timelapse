"use client";

import { hashSeed, mulberry32 } from "@/lib/seeded-random";

// A curated set of classic ink-stamp colors rather than fully random hues,
// so every stamp still reads as "stamp ink" instead of an arbitrary color.
const INK_COLORS = ["#1d4ed8", "#b91c1c", "#047857", "#7c2d12", "#6d28d9", "#0f766e"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Deterministic per-city design: rotation, ink color, and a ring of tick
// marks around the border all derive from the same seed, so "Tokyo" always
// looks the same stamp on every render but differs from "Paris".
export function PassportStampGraphic({
  city,
  stampedAt,
  seed,
  size = 140,
}: {
  city: string;
  stampedAt: string;
  seed: string;
  size?: number;
}) {
  const rand = mulberry32(hashSeed(seed));
  const ink = INK_COLORS[Math.floor(rand() * INK_COLORS.length)];
  const rotation = (rand() - 0.5) * 22;
  const ticks = 28;

  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: size, height: size, transform: `rotate(${rotation}deg)` }}
      title={`${city} — stamped ${formatDate(stampedAt)}`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={ink}
          strokeWidth="2.5"
          opacity="0.85"
        />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke={ink}
          strokeWidth="1"
          opacity="0.6"
        />
        {Array.from({ length: ticks }).map((_, i) => {
          const angle = (i / ticks) * Math.PI * 2;
          const jitter = 0.85 + rand() * 0.3;
          const x1 = 50 + Math.cos(angle) * 46 * jitter;
          const y1 = 50 + Math.sin(angle) * 46 * jitter;
          const x2 = 50 + Math.cos(angle) * 49;
          const y2 = 50 + Math.sin(angle) * 49;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={ink}
              strokeWidth="1.2"
              opacity="0.7"
            />
          );
        })}
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-4 text-center"
        style={{ color: ink }}
      >
        <span className="text-[9px] font-semibold tracking-widest uppercase opacity-80">
          Visited
        </span>
        <span className="text-xs leading-tight font-bold break-words uppercase">
          {city}
        </span>
        <span className="text-[8px] font-medium opacity-75">
          {formatDate(stampedAt)}
        </span>
      </div>
    </div>
  );
}
