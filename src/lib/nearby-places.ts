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
  // A real photo of the place, resolved from its Wikipedia article when
  // OSM tags one (see resolvePhotoUrl) -- null when there isn't one to
  // find. There's no free source of actual venue photos otherwise
  // (a paid places API, or scraping, neither of which this app does),
  // so most small/non-notable places simply won't have one.
  photoUrl: string | null;
};

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const WIKIPEDIA_TIMEOUT_MS = 3000;

// OSM's `wikipedia` tag is "<lang>:<Article Title>" -- Wikipedia's own
// REST API serves a page summary (including a thumbnail image when the
// article has one) for exactly that shape, no key needed.
async function resolvePhotoUrl(wikipediaTag: string): Promise<string | null> {
  const colonIndex = wikipediaTag.indexOf(":");
  if (colonIndex < 1) return null;
  const lang = wikipediaTag.slice(0, colonIndex).trim();
  const title = wikipediaTag.slice(colonIndex + 1).trim();
  if (!lang || !title || !/^[a-z-]+$/i.test(lang)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WIKIPEDIA_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        headers: { "User-Agent": "TravelLog/1.0 (personal travel journal app)" },
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return typeof data?.thumbnail?.source === "string" ? data.thumbnail.source : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

type PlaceDraft = Omit<NearbyPlace, "photoUrl"> & { wikipediaTag?: string };

// Resolves photos for a batch of places in parallel -- capped by the
// caller already slicing to MAX_PER_CATEGORY, and each lookup has its
// own short timeout, so a slow/unresolvable one can't hold up the rest.
// Builds a clean NearbyPlace explicitly (rather than spreading `place`)
// so the internal wikipediaTag field never leaks into the API response.
async function attachPhotos(places: PlaceDraft[]): Promise<NearbyPlace[]> {
  const photoUrls = await Promise.all(
    places.map((p) => (p.wikipediaTag ? resolvePhotoUrl(p.wikipediaTag) : Promise.resolve(null))),
  );
  return places.map(({ id, name, category, lat, lng, distanceMeters }, i) => ({
    id,
    name,
    category,
    lat,
    lng,
    distanceMeters,
    photoUrl: photoUrls[i] ?? null,
  }));
}

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

// Districts/neighbourhoods/suburbs within a wider radius of a broad
// destination's geocoded point (a whole city or bigger) -- used to offer
// a "which part of this city?" picker instead of showing results for
// whatever spot Nominatim happened to centroid the search on.
const AREA_RADIUS_METERS = 20000;
const AREA_PLACE_VALUES = "suburb|neighbourhood|quarter|borough|city_district|district|town";
const MAX_AREAS = 16;

// A real city's proper districts (e.g. Shenzhen's Futian/Nanshan/Luohu)
// are commonly mapped as administrative boundary *relations*, often
// without an informal place=* tag at all -- node/way place-tag queries
// alone miss them entirely and fall back to whatever small place nodes
// happen to be nearby, which for a border city (Shenzhen sits right next
// to Hong Kong) can mean neighbouring-country villages outrank the
// city's own districts. admin_level 6-10 covers city-district-through-
// neighbourhood level across most countries' OSM conventions.
function buildAreaQuery(lat: number, lng: number) {
  return `[out:json][timeout:15];(
    node["place"~"${AREA_PLACE_VALUES}"]["name"](around:${AREA_RADIUS_METERS},${lat},${lng});
    way["place"~"${AREA_PLACE_VALUES}"]["name"](around:${AREA_RADIUS_METERS},${lat},${lng});
    relation["place"~"${AREA_PLACE_VALUES}"]["name"](around:${AREA_RADIUS_METERS},${lat},${lng});
    relation["boundary"="administrative"]["admin_level"~"^(6|7|8|9|10)$"]["name"](around:${AREA_RADIUS_METERS},${lat},${lng});
  );out center ${MAX_AREAS * 8};`;
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

async function tryOne(endpoint: string, query: string): Promise<OverpassElement[] | null> {
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
      body: `data=${encodeURIComponent(query)}`,
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

async function queryOverpass(query: string): Promise<OverpassElement[] | null> {
  for (const endpoint of CANDIDATE_ENDPOINTS) {
    const elements = await tryOne(endpoint, query);
    if (elements) return elements;
  }
  return null;
}

export type NearbyResult = { attractions: NearbyPlace[]; food: NearbyPlace[] };

export async function fetchNearbyPlaces(lat: number, lng: number): Promise<NearbyResult | null> {
  const elements = await queryOverpass(buildQuery(lat, lng));
  if (!elements) return null;

  const attractions: PlaceDraft[] = [];
  const food: PlaceDraft[] = [];

  for (const el of elements) {
    const tags = el.tags;
    if (!tags?.name || el.lat == null || el.lon == null) continue;
    const place: PlaceDraft = {
      id: el.id,
      name: tags.name,
      category: categoryLabel(tags),
      lat: el.lat,
      lng: el.lon,
      distanceMeters: Math.round(haversineMeters(lat, lng, el.lat, el.lon)),
      wikipediaTag: tags.wikipedia,
    };
    if (tags.tourism) attractions.push(place);
    else if (tags.amenity) food.push(place);
  }

  attractions.sort((a, b) => a.distanceMeters - b.distanceMeters);
  food.sort((a, b) => a.distanceMeters - b.distanceMeters);

  const [attractionsWithPhotos, foodWithPhotos] = await Promise.all([
    attachPhotos(attractions.slice(0, MAX_PER_CATEGORY)),
    attachPhotos(food.slice(0, MAX_PER_CATEGORY)),
  ]);

  return { attractions: attractionsWithPhotos, food: foodWithPhotos };
}

export type CityArea = { name: string; lat: number; lng: number; distanceMeters: number };

type ScoredArea = CityArea & { isAdminBoundary: boolean };

// Districts/neighbourhoods near a broad destination's centroid, deduped
// by name (OSM often has both a node and a way for the same place) and
// sorted so a real administrative district (e.g. "Futian District")
// outranks an informally-tagged place node at the same or even nearer
// distance -- otherwise, for a border city, a handful of small
// neighbouring-country villages could crowd out the city's own actual
// districts just for being a little closer to the geocoded centroid.
export async function fetchCityAreas(lat: number, lng: number): Promise<CityArea[] | null> {
  const elements = await queryOverpass(buildAreaQuery(lat, lng));
  if (!elements) return null;

  const byName = new Map<string, ScoredArea>();
  for (const el of elements) {
    const name = el.tags?.name;
    const pointLat = el.lat ?? el.center?.lat;
    const pointLng = el.lon ?? el.center?.lon;
    if (!name || pointLat == null || pointLng == null) continue;
    const isAdminBoundary = el.tags?.boundary === "administrative";
    const existing = byName.get(name);
    // Prefer keeping the administrative-boundary version of a duplicate
    // name if one shows up in both forms.
    if (existing && (existing.isAdminBoundary || !isAdminBoundary)) continue;
    byName.set(name, {
      name,
      lat: pointLat,
      lng: pointLng,
      distanceMeters: Math.round(haversineMeters(lat, lng, pointLat, pointLng)),
      isAdminBoundary,
    });
  }

  return [...byName.values()]
    .sort((a, b) => {
      if (a.isAdminBoundary !== b.isAdminBoundary) return a.isAdminBoundary ? -1 : 1;
      return a.distanceMeters - b.distanceMeters;
    })
    .slice(0, MAX_AREAS)
    .map(({ name, lat: areaLat, lng: areaLng, distanceMeters }) => ({
      name,
      lat: areaLat,
      lng: areaLng,
      distanceMeters,
    }));
}
