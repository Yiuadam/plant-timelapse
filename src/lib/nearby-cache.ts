import { prisma } from "@/lib/prisma";
import { fetchNearbyPlaces, type NearbyResult } from "@/lib/nearby-places";
import { geocodeDestination } from "@/lib/geocode-destination";

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

// try/catch rather than a trailing .catch() on the query: if the
// generated Prisma client predates this model -- a cached node_modules on
// the build host, a deploy whose `prisma generate` didn't rerun -- then
// `prisma.placeLookup` is undefined and reading .findUnique throws
// synchronously, before any promise exists for .catch() to attach to.
// That turned a cold cache into a 500 on the whole Explore card. The
// cache is an optimisation; nothing about it should be able to fail the
// request it was meant to speed up.
export async function readSharedCache<T>(
  kind: string,
  lat: number,
  lng: number,
): Promise<T | null> {
  try {
    const row = await prisma.placeLookup.findUnique({
      where: { key: placeKey(kind, lat, lng) },
    });
    if (!row) return null;
    if (Date.now() - row.fetchedAt.getTime() > MAX_AGE_MS) return null;
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
  // Same reasoning as readSharedCache: a write failure here costs a
  // slower next lookup, and must never take down the request that just
  // produced good data.
  try {
    const key = placeKey(kind, lat, lng);
    const json = JSON.stringify(value);
    await prisma.placeLookup.upsert({
      where: { key },
      create: { key, json },
      update: { json, fetchedAt: new Date() },
    });
  } catch {
    // ignored on purpose
  }
}

// How many districts to warm when a picker is shown. Kept small on
// purpose -- this runs against the same free, shared Overpass mirrors
// every other lookup depends on, and warming every district in a large
// city would multiply this app's own load on that infrastructure for a
// convenience feature. The closest few are also the ones a user is
// statistically most likely to tap next.
const PRELOAD_DISTRICT_COUNT = 3;

// Warms the shared "nearby" cache for the districts a user is about to
// be offered, so tapping one feels instant instead of triggering its
// own live Overpass round-trip on top of the one that just ran to find
// the districts themselves. Meant to be called from `after()` in the
// route handler -- it must run once the picker has already been shown,
// never delay showing it.
//
// Geocodes "<district>, <destination>" for each one, mirroring exactly
// what the /area route does when a district is actually picked, so the
// coordinates -- and therefore the cache key -- match. A shape's own
// ring-centroid was considered instead (already on hand, no extra
// geocode call) but Nominatim's geocode of the district's NAME can land
// on a different point than the shape's geometric centre (a
// district's named centre, e.g. its government seat, isn't always its
// geometric middle) -- and a mismatched key here would silently warm a
// cache entry that /area's later lookup would never see.
export async function preloadDistrictsNearby(
  districts: { name: string }[],
  destination: string,
): Promise<void> {
  const toPreload = districts.slice(0, PRELOAD_DISTRICT_COUNT);
  await Promise.all(
    toPreload.map(async (district) => {
      try {
        const geocoded = await geocodeDestination(`${district.name}, ${destination}`);
        if (!geocoded) return;
        const already = await readSharedCache<NearbyResult>(
          "nearby",
          geocoded.lat,
          geocoded.lng,
        );
        if (already) return;
        const result = await fetchNearbyPlaces(geocoded.lat, geocoded.lng);
        if (result) await writeSharedCache("nearby", geocoded.lat, geocoded.lng, result);
      } catch {
        // Best-effort warming -- a failure here just means the district
        // stays cold until someone actually picks it, same as today.
      }
    }),
  );
}
