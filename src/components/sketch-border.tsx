"use client";

import { hashSeed, mulberry32 } from "@/lib/seeded-random";

// Traces the widget's own rectangle perimeter in short jittered segments so
// it reads as a hand-drawn pencil outline rather than a precise CSS border.
function wobblyRectPath(
  rand: () => number,
  w: number,
  h: number,
  jitter: number,
  segments: number,
) {
  const perimeter = 2 * (w + h);
  const points: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const d = (i / segments) * perimeter;
    let x: number;
    let y: number;
    if (d < w) {
      x = d;
      y = 0;
    } else if (d < w + h) {
      x = w;
      y = d - w;
    } else if (d < 2 * w + h) {
      x = w - (d - w - h);
      y = h;
    } else {
      x = 0;
      y = h - (d - 2 * w - h);
    }
    x += (rand() - 0.5) * jitter;
    y += (rand() - 0.5) * jitter;
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M ${points.join(" L ")}`;
}

export function SketchBorder({ seed, accent }: { seed: string; accent: string }) {
  const rand = mulberry32(hashSeed(seed));
  const outer = wobblyRectPath(rand, 100, 100, 2.4, 28);
  const inner = wobblyRectPath(rand, 100, 100, 2.4, 22);

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={outer}
        fill="none"
        stroke={accent}
        strokeWidth="0.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d={inner}
        fill="none"
        stroke={accent}
        strokeWidth="0.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}
