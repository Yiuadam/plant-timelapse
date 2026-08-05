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
