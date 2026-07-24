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

// The rubber-stamp handle itself, shown only for the instant a fresh stamp
// is pressed: swoops in from the lower-left -- as if picked up off the
// StampStand beside the "Ready to stamp" list -- presses flat onto the
// page in sync with the ink graphic's own reveal (see the `stamp-slam`
// animation's delay in globals.css), then lifts and carries off to the
// upper-right, leaving the ink impression behind.
function StampTool({ ink }: { ink: string }) {
  return (
    <div
      className="animate-stamp-tool-drop pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ perspective: 300 }}
      aria-hidden
    >
      <svg width="55%" height="55%" viewBox="0 0 40 56">
        <rect x="16" y="0" width="8" height="20" rx="3" fill="#3f3f46" />
        <rect x="9" y="15" width="22" height="9" rx="3" fill="#52525b" />
        <rect x="3" y="24" width="34" height="27" rx="5" fill="#27272a" />
        <rect x="7" y="28" width="26" height="19" rx="3" fill={ink} opacity="0.85" />
      </svg>
    </div>
  );
}

// A small decorative stand holding a spare stamp, shown beside the "Ready
// to stamp" list so the flying-stamp animation has somewhere it visually
// reads as departing from.
export function StampStand() {
  return (
    <svg width="30" height="36" viewBox="0 0 34 40" aria-hidden className="shrink-0">
      <rect x="2" y="33" width="30" height="5" rx="2" fill="#57534e" />
      <rect x="8" y="24" width="18" height="10" rx="2" fill="#78716c" />
      <g transform="translate(17 20) rotate(-8)">
        <rect x="-4" y="-20" width="8" height="14" rx="3" fill="#3f3f46" />
        <rect x="-7" y="-8" width="14" height="6" rx="2" fill="#52525b" />
        <rect x="-11" y="-3" width="22" height="12" rx="4" fill="#27272a" />
        <rect x="-8" y="0" width="16" height="7" rx="2" fill="#b91c1c" opacity="0.85" />
      </g>
    </svg>
  );
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
  // The text overlay uses fixed px/Tailwind sizes tuned for the 140px
  // default -- scale them down for smaller renders (e.g. the 64px stamp
  // in the dashboard Passport widget) so text doesn't overflow the ring.
  const scale = size / 140;

  return (
    <div
      className={`relative shrink-0 select-none ${animate ? "animate-stamp-slam" : ""}`}
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
        {/* Font size and padding scale with `size` (fixed px/Tailwind sizes
            were tuned for the 140px default and badly overflowed the ring
            at the 64px size the dashboard widget renders) -- clip-path is a
            hard backstop so a long city name can never poke past the ring
            regardless of font metrics. */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end text-center"
          style={{
            color: ink,
            padding: `${4 * scale}px ${13 * scale}px`,
            gap: 2 * scale,
            clipPath: "circle(44% at 50% 50%)",
          }}
        >
          <span
            className="font-semibold tracking-widest uppercase opacity-80"
            style={{ fontSize: Math.max(6, 9 * scale) }}
          >
            Visited
          </span>
          <span
            className="leading-tight font-bold break-words uppercase"
            style={{ fontSize: Math.max(7, 12 * scale) }}
          >
            {city}
          </span>
          <span
            className="font-medium opacity-75"
            style={{ fontSize: Math.max(5, 8 * scale) }}
          >
            {formatDate(stampedAt)}
          </span>
        </div>
      </div>
      {animate && <StampTool ink={ink} />}
    </div>
  );
}
