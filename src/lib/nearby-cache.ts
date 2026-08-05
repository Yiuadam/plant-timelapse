import { prisma } from "@/lib/prisma";
import type { NearbyResult } from "@/lib/nearby-places";

// Attractions and restaurants don't move, so a week-old answer is still a
// good answer. The point isn't freshness -- it's that the free Overpass
// mirrors this data comes from rate-limit aggressively, and re-querying
// them on every view of the Explore card was itself the main cause of the
// "temporarily unavailable" errors.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedNearby = { result: NearbyResult; stale: boolean };

function parse(json: string): NearbyResult | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.attractions) || !Array.isArray(parsed.food)) {
      return null;
    }
    return parsed as NearbyResult;
  } catch {
    return null;
  }
}

export function readCache(trip: {
  nearbyJson: string | null;
  nearbyFetchedAt: Date | null;
}): CachedNearby | null {
  if (!trip.nearbyJson || !trip.nearbyFetchedAt) return null;
  const result = parse(trip.nearbyJson);
  if (!result) return null;
  return {
    result,
    stale: Date.now() - trip.nearbyFetchedAt.getTime() > MAX_AGE_MS,
  };
}

export async function writeCache(tripId: string, result: NearbyResult) {
  await prisma.trip.update({
    where: { id: tripId },
    data: { nearbyJson: JSON.stringify(result), nearbyFetchedAt: new Date() },
  });
}

// Cleared whenever the coordinates the cache was built for stop being the
// trip's coordinates -- a destination edit, or picking a specific area.
export const CLEAR_NEARBY_CACHE = {
  nearbyJson: null,
  nearbyFetchedAt: null,
} as const;

// ---------------------------------------------------------------------
// Shared, coordinate-keyed cache
//
// The per-trip cache above only ever helps a trip that has already
// loaded once. This one is keyed by place rather than by trip, so a
// brand-new trip to a city anyone has already looked up resolves with no
// Overpass call at all -- which is what makes a search feel instant the
// first time a given user runs it.
//
// Two decimal places is roughly a kilometre, so independent geocodes of
// the same city collapse onto the same key. It also caps how many
// distinct entries a city can ever produce.
// ---------------------------------------------------------------------

function placeKey(kind: string, lat: number, lng: number) {
  return `${kind}:${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export async function readSharedCache<T>(
  kind: string,
  lat: number,
  lng: number,
): Promise<T | null> {
  const row = await prisma.placeLookup
    .findUnique({ where: { key: placeKey(kind, lat, lng) } })
    .catch(() => null);
  if (!row) return null;
  if (Date.now() - row.fetchedAt.getTime() > MAX_AGE_MS) return null;
  try {
    return JSON.parse(row.json) as T;
  } catch {
    return null;
  }
}

export async function writeSharedCache(
  kind: string,
  lat: number,
  lng: number,
  value: unknown,
) {
  const key = placeKey(kind, lat, lng);
  const json = JSON.stringify(value);
  // A write failure here costs nothing but a slower next lookup, so it
  // must never take down the request that just produced good data.
  await prisma.placeLookup
    .upsert({
      where: { key },
      create: { key, json },
      update: { json, fetchedAt: new Date() },
    })
    .catch(() => null);
}
