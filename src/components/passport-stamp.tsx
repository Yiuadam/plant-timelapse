"use client";

import { hashSeed, mulberry32 } from "@/lib/seeded-random";

// A curated set of classic ink-stamp colors rather than fully random hues,
// so every stamp still reads as "stamp ink" instead of an arbitrary color.
const INK_COLORS = ["#1d4ed8", "#b91c1c", "#047857", "#7c2d12", "#6d28d9", "#0f766e"];

// Simple line-art landmark silhouettes, picked deterministically per city so
// the same city always gets the same icon. Not real buildings for that
// specific city (no illustration library to draw from) -- just enough
// visual variety that stamps read as "a place" rather than identical rings.
const LANDMARKS = ["tower", "gate", "dome", "mountain", "bridge", "skyline"] as const;

function LandmarkIcon({ kind, ink }: { kind: (typeof LANDMARKS)[number]; ink: string }) {
  const common = { stroke: ink, strokeWidth: 1.6, strokeLinecap: "round" as const, fill: "none" };
  switch (kind) {
    case "tower":
      return (
        <g transform="translate(50 34)">
          <path d="M0 -14 L-6 14 M0 -14 L6 14 M-4 -2 L4 -2 M-5.5 5 L5.5 5" {...common} />
        </g>
      );
    case "gate":
      // A torii gate.
      return (
        <g transform="translate(50 34)">
          <path
            d="M-10 -6 L-10 14 M10 -6 L10 14 M-13 -9 L13 -9 M-11 -3 L11 -3"
            {...common}
          />
        </g>
      );
    case "dome":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-9 8 L9 8 M-9 8 C -9 -2 9 -2 9 8 M0 -8 L0 -2 M-2 -8 L2 -8"
            {...common}
          />
        </g>
      );
    case "mountain":
      return (
        <g transform="translate(50 34)">
          <path d="M-12 8 L-3 -8 L3 2 L7 -4 L12 8 Z" {...common} />
        </g>
      );
    case "bridge":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 6 C -12 -8 12 -8 12 6 M-9 6 L-9 0 M-4 6 L-4 -3 M4 6 L4 -3 M9 6 L9 0"
            {...common}
          />
        </g>
      );
    case "skyline":
      return (
        <g transform="translate(50 34)">
          <path d="M-12 8 L-12 -2 L-7 -2 L-7 -8 L-2 -8 L-2 2 L3 2 L3 -5 L8 -5 L8 8 L12 8 L12 0" {...common} />
        </g>
      );
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Deterministic per-city design: rotation, ink color, landmark icon, and a
// ring of tick marks around the border all derive from the same seed, so
// "Tokyo" always looks the same stamp on every render but differs from
// "Paris".
export function PassportStampGraphic({
  city,
  stampedAt,
  seed,
  size = 140,
  animate = false,
}: {
  city: string;
  stampedAt: string;
  seed: string;
  size?: number;
  animate?: boolean;
}) {
  const rand = mulberry32(hashSeed(seed));
  const ink = INK_COLORS[Math.floor(rand() * INK_COLORS.length)];
  const landmark = LANDMARKS[Math.floor(rand() * LANDMARKS.length)];
  const rotation = (rand() - 0.5) * 22;
  const ticks = 28;

  return (
    <div
      className={`shrink-0 select-none ${animate ? "animate-stamp-slam" : ""}`}
      style={{ width: size, height: size }}
      title={`${city} — stamped ${formatDate(stampedAt)}`}
    >
      <div className="relative h-full w-full" style={{ transform: `rotate(${rotation}deg)` }}>
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke={ink} strokeWidth="2.5" opacity="0.85" />
          <circle cx="50" cy="50" r="38" fill="none" stroke={ink} strokeWidth="1" opacity="0.6" />
          {Array.from({ length: ticks }).map((_, i) => {
            const angle = (i / ticks) * Math.PI * 2;
            const jitter = 0.85 + rand() * 0.3;
            const x1 = 50 + Math.cos(angle) * 46 * jitter;
            const y1 = 50 + Math.sin(angle) * 46 * jitter;
            const x2 = 50 + Math.cos(angle) * 49;
            const y2 = 50 + Math.sin(angle) * 49;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth="1.2" opacity="0.7" />
            );
          })}
          <LandmarkIcon kind={landmark} ink={ink} />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-end gap-0.5 px-4 pb-4 text-center"
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
    </div>
  );
}
