// Free, no-API-key "what's nearby" lookups against OpenStreetMap's
// Overpass API -- the same open data source the app's map/geocoding
// already runs on (see src/app/api/geocode/route.ts). Returns real,
// structured tourist attractions and places to eat near a coordinate, so
// the trip planner can suggest things to do without needing Anthropic
// credit or a paid places/search API.
//
// Public Overpass instances are shared infrastructure and occasionally
// slow, rate-limited, or down -- trying a couple of known mirrors in
// sequence (same resilience pattern as src/lib/free-translate.ts) means
// one instance having a bad day doesn't take the feature down.
const CANDIDATE_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const TIMEOUT_MS = 8000;
const RADIUS_METERS = 3000;
const MAX_PER_CATEGORY = 12;

const ATTRACTION_TOURISM_VALUES =
  "attraction|museum|gallery|viewpoint|artwork|zoo|theme_park|aquarium";
const FOOD_AMENITY_VALUES = "restaurant|cafe|fast_food|bar|pub";

export type NearbyPlace = {
  id: number;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distanceMeters: number;
};

type OverpassElement = {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function buildQuery(lat: number, lng: number) {
  return `[out:json][timeout:15];(
    node["tourism"~"${ATTRACTION_TOURISM_VALUES}"]["name"](around:${RADIUS_METERS},${lat},${lng});
    node["amenity"~"${FOOD_AMENITY_VALUES}"]["name"](around:${RADIUS_METERS},${lat},${lng});
  );out body ${MAX_PER_CATEGORY * 6};`;
}

function categoryLabel(tags: Record<string, string>) {
  if (tags.tourism) {
    return tags.tourism.replace(/_/g, " ");
  }
  if (tags.cuisine) {
    return tags.cuisine.replace(/_/g, " ");
  }
  return (tags.amenity ?? "place").replace(/_/g, " ");
}

async function tryOne(
  endpoint: string,
  lat: number,
  lng: number,
): Promise<OverpassElement[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Form-encoded "data=<query>" is the format documented by every public
    // Overpass instance -- some mirrors' front-end proxies reject a raw
    // text/plain body with a 400, so this is the safer of the two.
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "TravelLog/1.0 (personal travel journal app)",
      },
      body: `data=${encodeURIComponent(buildQuery(lat, lng))}`,
      signal: controller.signal,
    });
    if (!res.ok) {
      const bodySnippet = await res.text().catch(() => "");
      console.error(
        "nearbyPlaces:",
        endpoint,
        "non-OK response",
        res.status,
        bodySnippet.slice(0, 300),
      );
      return null;
    }
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data?.elements)) {
      console.error("nearbyPlaces:", endpoint, "unexpected response shape", JSON.stringify(data)?.slice(0, 300));
      return null;
    }
    return data.elements;
  } catch (err) {
    console.error("nearbyPlaces:", endpoint, "request failed", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export type NearbyResult = { attractions: NearbyPlace[]; food: NearbyPlace[] };

export async function fetchNearbyPlaces(lat: number, lng: number): Promise<NearbyResult | null> {
  let elements: OverpassElement[] | null = null;
  for (const endpoint of CANDIDATE_ENDPOINTS) {
    elements = await tryOne(endpoint, lat, lng);
    if (elements) break;
  }
  if (!elements) return null;

  const attractions: NearbyPlace[] = [];
  const food: NearbyPlace[] = [];

  for (const el of elements) {
    const tags = el.tags;
    if (!tags?.name) continue;
    const place: NearbyPlace = {
      id: el.id,
      name: tags.name,
      category: categoryLabel(tags),
      lat: el.lat,
      lng: el.lon,
      distanceMeters: Math.round(haversineMeters(lat, lng, el.lat, el.lon)),
    };
    if (tags.tourism) attractions.push(place);
    else if (tags.amenity) food.push(place);
  }

  attractions.sort((a, b) => a.distanceMeters - b.distanceMeters);
  food.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return {
    attractions: attractions.slice(0, MAX_PER_CATEGORY),
    food: food.slice(0, MAX_PER_CATEGORY),
  };
}
