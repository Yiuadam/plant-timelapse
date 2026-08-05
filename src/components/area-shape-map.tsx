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
const VIEW_H = 700;
const PADDING = 24;
// In viewBox units. The card renders this SVG around 285px wide, so the
// whole thing is scaled down roughly 3.5x -- a 20-unit label would land
// at about 6px on screen and be unreadable. This is sized backwards from
// wanting ~11px of rendered text.
const LABEL_SIZE = 40;

// Web Mercator's y term, so districts keep their real proportions rather
// than looking vertically squashed.
//
// The 180/PI factor is essential, not cosmetic: the log-tangent term is
// in radians, while x is plotted straight from degrees of longitude.
// Without converting back, y spans a number ~57x smaller than x for the
// same ground distance, the shared scale below is set by x, and every
// shape collapses into a horizontal sliver.
function mercatorY(lat: number) {
  const clamped = Math.max(-85, Math.min(85, lat));
  const rad = (clamped * Math.PI) / 180;
  return (Math.log(Math.tan(Math.PI / 4 + rad / 2)) * 180) / Math.PI;
}

type Projection = { toX: (lng: number) => number; toY: (lat: number) => number };

function buildProjection(shapes: AreaShape[]): Projection | null {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of shapes) {
    for (const ring of s.rings) {
      for (const p of ring) {
        if (p.lng < minLng) minLng = p.lng;
        if (p.lng > maxLng) maxLng = p.lng;
        const y = mercatorY(p.lat);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!Number.isFinite(minLng) || !Number.isFinite(minY)) return null;

  const spanLng = maxLng - minLng || 1e-6;
  const spanY = maxY - minY || 1e-6;
  // One shared scale for both axes keeps the city's real aspect ratio;
  // scaling each axis to fill the box independently would stretch it.
  const scale = Math.min((VIEW_W - PADDING * 2) / spanLng, (VIEW_H - PADDING * 2) / spanY);
  const offsetX = (VIEW_W - spanLng * scale) / 2;
  const offsetY = (VIEW_H - spanY * scale) / 2;

  return {
    toX: (lng) => offsetX + (lng - minLng) * scale,
    // SVG y grows downward, Mercator y grows north, hence the flip.
    toY: (lat) => VIEW_H - (offsetY + (mercatorY(lat) - minY) * scale),
  };
}

function ringToPath(ring: Point[], proj: Projection) {
  let d = "";
  for (let i = 0; i < ring.length; i++) {
    const x = proj.toX(ring[i].lng).toFixed(1);
    const y = proj.toY(ring[i].lat).toFixed(1);
    d += (i === 0 ? "M" : "L") + x + " " + y;
  }
  return d + "Z";
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

  const proj = useMemo(() => buildProjection(shapes), [shapes]);
  const paths = useMemo(() => {
    if (!proj) return [];
    return shapes.map((s) => {
      // How much room the district actually occupies on screen decides
      // whether its name can be shown at all -- a label wider than its
      // own district spills across neighbours and makes the shape
      // harder to read, not easier.
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const ring of s.rings) {
        for (const p of ring) {
          const x = proj.toX(p.lng);
          const y = proj.toY(p.lat);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      // CJK glyphs are about one em wide, Latin closer to half.
      const estimatedWidth = [...s.name].reduce(
        (w, ch) => w + (/[　-鿿＀-￯]/.test(ch) ? LABEL_SIZE : LABEL_SIZE * 0.55),
        0,
      );
      return {
        name: s.name,
        d: s.rings.map((r) => ringToPath(r, proj)).join(" "),
        labelX: proj.toX(s.lng),
        labelY: proj.toY(s.lat),
        fits: estimatedWidth <= maxX - minX && LABEL_SIZE * 1.6 <= maxY - minY,
      };
    });
  }, [shapes, proj]);

  if (!proj || paths.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="group"
      aria-label="City districts"
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
                  : "fill-indigo-400/20 stroke-indigo-400/70 dark:fill-indigo-300/15 dark:stroke-indigo-300/50"
              }
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {/* Labels are drawn after every shape so no district's fill can
          cover another's name, and are click-through so they never
          block the region underneath. */}
      {paths
        .filter((p) => p.fits || hovered === p.name)
        .map((p) => (
          <text
            key={`label-${p.name}`}
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={LABEL_SIZE}
            className="pointer-events-none fill-black font-medium dark:fill-white"
            stroke="var(--background)"
            strokeWidth={6}
            paintOrder="stroke"
          >
            {p.name}
          </text>
        ))}
    </svg>
  );
}
