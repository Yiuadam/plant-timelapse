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

// Some districts are real but detached exclaves tens of km from the
// city's main cluster (e.g. Shenzhen's 深汕特别合作区, ~130km from its
// core districts). Including one in the bounding box stretches the whole
// map so hard the real cluster gets squeezed into a corner. A district is
// treated as a map outlier -- excluded from what's DRAWN, never from the
// data itself -- when it sits far past both the typical spread of its
// siblings and an absolute floor, so a naturally large-but-contiguous
// city never gets falsely trimmed.
const OUTLIER_DISTANCE_RATIO = 3;
const OUTLIER_ABS_FLOOR_KM = 60;
const EARTH_RADIUS_KM = 6371;

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function approxDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const meanLatRad = ((aLat + bLat) / 2) * (Math.PI / 180);
  const dLat = (bLat - aLat) * (Math.PI / 180);
  const dLng = (bLng - aLng) * (Math.PI / 180) * Math.cos(meanLatRad);
  return EARTH_RADIUS_KM * Math.sqrt(dLat * dLat + dLng * dLng);
}

// Median (not mean) center, so a single distant exclave can't drag the
// reference point toward itself before distances are even measured.
function excludeMapOutliers(shapes: AreaShape[]): AreaShape[] {
  if (shapes.length <= MIN_SHAPES_TO_DRAW) return shapes;
  const centerLat = median(shapes.map((s) => s.lat));
  const centerLng = median(shapes.map((s) => s.lng));
  const distances = shapes.map((s) => approxDistanceKm(centerLat, centerLng, s.lat, s.lng));
  const threshold = Math.max(median(distances) * OUTLIER_DISTANCE_RATIO, OUTLIER_ABS_FLOOR_KM);
  const kept = shapes.filter((_, i) => distances[i] <= threshold);
  return kept.length >= MIN_SHAPES_TO_DRAW ? kept : shapes;
}

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

function prepare(allShapes: AreaShape[]): Prepared | null {
  // A shape can carry no rings at all -- the server drops geometry it
  // can't trust (e.g. a boundary relation stitched from OSM data too
  // jagged to draw) while still keeping the district itself selectable
  // via the chip list below the map. Filtered before the draw-worthiness
  // check below so a batch that's mostly geometry-less districts falls
  // back to the chip list instead of drawing a sparse, half-empty map.
  const drawable = allShapes.filter((s) => s.rings.length > 0);
  if (drawable.length < MIN_SHAPES_TO_DRAW) return null;
  const shapes = excludeMapOutliers(drawable);

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
      area: w * h,
      labelX: toX(s.lng),
      labelY: toY(s.lat),
      labelSize,
      labelHalfW: (perGlyph * labelSize) / 2,
      labelHalfH: labelSize * 0.65,
      // Only label a district that can actually hold its own name.
      fits: perGlyph * labelSize <= w && labelSize * 1.4 <= h,
    };
  });

  // A label that fits its own district can still collide with a
  // neighbour's -- the previous check only looked inward. Place labels
  // largest-district-first, greedily dropping any candidate whose box
  // overlaps one already placed, so small closely-packed districts lose
  // their label before a bigger, more prominent one does.
  const placed: { x: number; y: number; halfW: number; halfH: number }[] = [];
  const order = paths
    .map((_, i) => i)
    .sort((a, b) => paths[b].area - paths[a].area);
  const finalFits: boolean[] = new Array(paths.length).fill(false);
  for (const i of order) {
    const p = paths[i];
    if (!p.fits) continue;
    const overlaps = placed.some(
      (o) =>
        Math.abs(p.labelX - o.x) < p.labelHalfW + o.halfW &&
        Math.abs(p.labelY - o.y) < p.labelHalfH + o.halfH,
    );
    if (overlaps) continue;
    placed.push({ x: p.labelX, y: p.labelY, halfW: p.labelHalfW, halfH: p.labelHalfH });
    finalFits[i] = true;
  }

  return {
    viewH,
    paths: paths.map((p, i) => ({ ...p, fits: finalFits[i] })),
  };
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
