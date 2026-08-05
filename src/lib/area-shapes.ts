// Turns OpenStreetMap administrative-boundary relations into simple
// closed rings that can be drawn as an SVG outline of a city.
//
// Overpass returns a boundary relation as an unordered bag of member
// ways, each a fragment of the border. They have to be chained end to
// end to recover the actual outline, and then thinned aggressively --
// a single district's raw border can run to thousands of coordinates,
// which is far more detail than a thumbnail-sized shape can show and
// far too much to ship to the browser.

export type Point = { lat: number; lng: number };
export type Ring = Point[];

export type AreaShape = {
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  rings: Ring[];
};

type GeomPoint = { lat: number; lon: number };
type RelationMember = {
  type: string;
  role?: string;
  geometry?: GeomPoint[];
};

// Endpoints that should join are identical in OSM's data, but float
// formatting means comparing with a small tolerance is safer than ===.
const JOIN_EPSILON = 1e-7;

function samePoint(a: Point, b: Point) {
  return (
    Math.abs(a.lat - b.lat) < JOIN_EPSILON && Math.abs(a.lng - b.lng) < JOIN_EPSILON
  );
}

// Chains member ways into closed rings. Ways come in arbitrary order and
// arbitrary direction, so each step looks for a fragment starting *or*
// ending at the current ring's open end, flipping it when needed.
export function assembleRings(members: RelationMember[]): Ring[] {
  const fragments: Ring[] = [];
  for (const m of members) {
    if (m.type !== "way" || !m.geometry || m.geometry.length < 2) continue;
    // Inner rings are holes (e.g. an enclave); drawing them as separate
    // outlines would be wrong, so only the outer border is kept.
    if (m.role && m.role !== "outer" && m.role !== "") continue;
    fragments.push(m.geometry.map((p) => ({ lat: p.lat, lng: p.lon })));
  }

  const used = new Array(fragments.length).fill(false);
  const rings: Ring[] = [];

  for (let i = 0; i < fragments.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const ring: Ring = [...fragments[i]];

    let extended = true;
    while (extended) {
      extended = false;
      const end = ring[ring.length - 1];
      if (samePoint(ring[0], end) && ring.length > 3) break; // closed

      for (let j = 0; j < fragments.length; j++) {
        if (used[j]) continue;
        const frag = fragments[j];
        if (samePoint(end, frag[0])) {
          ring.push(...frag.slice(1));
        } else if (samePoint(end, frag[frag.length - 1])) {
          ring.push(...frag.slice(0, -1).reverse());
        } else {
          continue;
        }
        used[j] = true;
        extended = true;
        break;
      }
    }

    // Open chains are broken or partial borders -- drawing them produces
    // stray lines across the map, so only genuine closed rings are kept.
    if (ring.length > 3 && samePoint(ring[0], ring[ring.length - 1])) {
      rings.push(ring);
    }
  }

  return rings;
}

// Perpendicular distance from p to the segment a-b, in degree space.
// Good enough for simplification: over a single city the lat/lng
// distortion is far smaller than the tolerance being applied.
function perpendicularDistance(p: Point, a: Point, b: Point) {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) return Math.hypot(p.lng - a.lng, p.lat - a.lat);
  const t = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(p.lng - (a.lng + clamped * dx), p.lat - (a.lat + clamped * dy));
}

export function simplify(ring: Ring, tolerance: number): Ring {
  if (ring.length < 3) return ring;

  // Iterative Douglas-Peucker -- recursion would risk blowing the stack
  // on the very rings this exists to thin out.
  const keep = new Array(ring.length).fill(false);
  keep[0] = true;
  keep[ring.length - 1] = true;
  const stack: [number, number][] = [[0, ring.length - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(ring[i], ring[start], ring[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (index !== -1 && maxDist > tolerance) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }

  return ring.filter((_, i) => keep[i]);
}

// Thins a ring until it is under `maxPoints`, raising the tolerance until
// it fits rather than trusting one fixed value to suit every city.
export function simplifyToBudget(ring: Ring, maxPoints: number): Ring {
  let tolerance = 0.0002; // ~20m
  let out = simplify(ring, tolerance);
  let guard = 0;
  while (out.length > maxPoints && guard < 12) {
    tolerance *= 2;
    out = simplify(ring, tolerance);
    guard++;
  }
  return out;
}

// Applies simplifyToBudget across a whole set of shapes, then -- if their
// combined point count still exceeds `totalBudget` -- re-simplifies every
// ring together, once, to a single shared tolerance chosen so the total
// lands under budget.
//
// The per-ring budget alone isn't enough: it bounds how bad any ONE
// district's outline can get, but a city where several districts are all
// genuinely complex (a coastal city with many islands, say) can still
// produce a payload too large to ship to a phone. A single shared
// tolerance is used for the fallback pass -- rather than shrinking each
// ring's own per-ring budget independently -- so a district that was
// already simple stays simple and the coarsening lands on the districts
// that actually have the detail to lose.
export function simplifyShapesToBudget<T extends { rings: Ring[] }>(
  shapes: T[],
  perRingMax: number,
  totalBudget: number,
): T[] {
  const firstPass = shapes.map((s) => ({
    ...s,
    rings: s.rings.map((r) => simplifyToBudget(r, perRingMax)),
  }));

  const total = firstPass.reduce(
    (n, s) => n + s.rings.reduce((m, r) => m + r.length, 0),
    0,
  );
  if (total <= totalBudget) return firstPass;

  let tolerance = 0.0004;
  let guard = 0;
  let result = firstPass;
  while (guard < 14) {
    const attempt = shapes.map((s) => ({
      ...s,
      rings: s.rings.map((r) => simplify(r, tolerance)),
    }));
    const attemptTotal = attempt.reduce(
      (n, s) => n + s.rings.reduce((m, r) => m + r.length, 0),
      0,
    );
    result = attempt;
    if (attemptTotal <= totalBudget) break;
    tolerance *= 1.6;
    guard++;
  }
  return result;
}
