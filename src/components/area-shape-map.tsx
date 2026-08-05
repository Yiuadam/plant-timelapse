"use client";

import { useMemo, useState } from "react";

type Point = { lat: number; lng: number };

export type AreaShape = {
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  rings: Point[][];
};

const VIEW_W = 1000;
const PADDING = 16;

// The drawn box takes its aspect ratio from the districts themselves, so
// the city fills it edge to edge instead of floating inside a fixed
// frame. Clamped so a very elongated city can't render as an unusable
// sliver or a screen-consuming column.
const MIN_ASPECT = 0.5; // wide
const MAX_ASPECT = 1.3; // tall

// Label size is derived per district from how big that district actually
// renders. A single fixed size made a small district's name wider than
// the district itself.
const MIN_LABEL = 26;
const MAX_LABEL = 54;

// A few scattered districts fill a box with mostly empty space and read
// as a broken map rather than a city. Below this the shape isn't worth
// drawing and the chip list alone is the better answer.
const MIN_SHAPES_TO_DRAW = 3;

function mercatorY(lat: number) {
  const clamped = Math.max(-85, Math.min(85, lat));
  const rad = (clamped * Math.PI) / 180;
  // The 180/PI factor keeps y in the same units as x (degrees of
  // longitude). Without it the log-tangent term is radians, ~57x smaller
  // for the same ground distance, and every shape flattens to a sliver.
  return (Math.log(Math.tan(Math.PI / 4 + rad / 2)) * 180) / Math.PI;
}

type Prepared = {
  viewH: number;
  paths: {
    name: string;
    d: string;
    labelX: number;
    labelY: number;
    labelSize: number;
    fits: boolean;
  }[];
};

function prepare(shapes: AreaShape[]): Prepared | null {
  if (shapes.length < MIN_SHAPES_TO_DRAW) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const s of shapes) {
    for (const ring of s.rings) {
      for (const p of ring) {
        const y = mercatorY(p.lat);
        if (p.lng < minX) minX = p.lng;
        if (p.lng > maxX) maxX = p.lng;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

  const spanX = maxX - minX || 1e-6;
  const spanY = maxY - minY || 1e-6;
  const aspect = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, spanY / spanX));
  const viewH = VIEW_W * aspect;

  // One scale for both axes preserves the city's true proportions; the
  // box was sized from the same ratio, so the fit is tight either way.
  const scale = Math.min(
    (VIEW_W - PADDING * 2) / spanX,
    (viewH - PADDING * 2) / spanY,
  );
  const offsetX = (VIEW_W - spanX * scale) / 2;
  const offsetY = (viewH - spanY * scale) / 2;
  const toX = (lng: number) => offsetX + (lng - minX) * scale;
  const toY = (lat: number) => viewH - (offsetY + (mercatorY(lat) - minY) * scale);

  const paths = shapes.map((s) => {
    let d = "";
    let bx0 = Infinity;
    let bx1 = -Infinity;
    let by0 = Infinity;
    let by1 = -Infinity;
    for (const ring of s.rings) {
      for (let i = 0; i < ring.length; i++) {
        const x = toX(ring[i].lng);
        const y = toY(ring[i].lat);
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
        d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
      }
      d += "Z";
    }

    const w = bx1 - bx0;
    const h = by1 - by0;
    // Fit the name to the district's width, then clamp.
    const perGlyph = [...s.name].reduce(
      (n, ch) => n + (/[　-鿿＀-￯]/.test(ch) ? 1 : 0.55),
      0,
    );
    const ideal = perGlyph > 0 ? (w * 0.85) / perGlyph : MIN_LABEL;
    const labelSize = Math.min(MAX_LABEL, Math.max(MIN_LABEL, ideal));

    return {
      name: s.name,
      d,
      labelX: toX(s.lng),
      labelY: toY(s.lat),
      labelSize,
      // Only label a district that can actually hold its name.
      fits: perGlyph * labelSize <= w && labelSize * 1.4 <= h,
    };
  });

  return { viewH, paths };
}

export default function AreaShapeMap({
  shapes,
  onPick,
  disabled = false,
}: {
  shapes: AreaShape[];
  onPick: (name: string) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const prepared = useMemo(() => prepare(shapes), [shapes]);

  if (!prepared) return null;
  const { viewH, paths } = prepared;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${viewH}`}
      className="block h-auto w-full"
      role="group"
      aria-label="City districts"
      data-no-swipe
    >
      {paths.map((p) => {
        const active = hovered === p.name;
        return (
          <g
            key={p.name}
            onMouseEnter={() => setHovered(p.name)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              if (!disabled) onPick(p.name);
            }}
            className={disabled ? "cursor-default" : "cursor-pointer"}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={p.name}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(p.name);
              }
            }}
          >
            <path
              d={p.d}
              className={
                active
                  ? "fill-indigo-500/70 stroke-indigo-600"
                  : "fill-indigo-400/25 stroke-indigo-400/70 dark:fill-indigo-300/20 dark:stroke-indigo-300/50"
              }
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {/* Drawn after every shape so no district's fill covers another's
          name, and click-through so they never block the region below. */}
      {paths
        .filter((p) => p.fits || hovered === p.name)
        .map((p) => (
          <text
            key={`label-${p.name}`}
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={p.labelSize}
            className="pointer-events-none fill-black font-medium dark:fill-white"
            stroke="var(--background)"
            strokeWidth={p.labelSize * 0.14}
            paintOrder="stroke"
          >
            {p.name}
          </text>
        ))}
    </svg>
  );
}
