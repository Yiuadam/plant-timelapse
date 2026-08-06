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
import {
  assembleRings,
  simplifyToBudget,
  simplifyShapesToBudget,
  type AreaShape,
  type Point,
} from "@/lib/area-shapes";

const CANDIDATE_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
// Per-attempt ceiling. Total time is bounded by the caller's budget
// (see queryOverpass) rather than by squeezing this, because the
// boundary-geometry query legitimately needs longer than a centroid
// lookup -- it returns every coordinate of every border. Shrinking this
// uniformly would starve exactly the query that needs the most time.
const TIMEOUT_MS = 9000;
const GEOMETRY_TIMEOUT_MS = 14000;
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
  // Present on relations fetched with `out geom` -- each member way
  // carries its own slice of the boundary's coordinates.
  members?: {
    type: string;
    role?: string;
    geometry?: { lat: number; lon: number }[];
  }[];
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

async function tryOne(
  endpoint: string,
  query: string,
  timeoutMs: number,
): Promise<OverpassElement[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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

// 429 (rate limited) and 504 (gateway timeout) are what a busy Overpass
// mirror actually returns, and both clear on their own within a second or
// two -- so the whole mirror list is walked a second time after a short
// pause before giving up, rather than failing the request on what is
// usually a momentary load spike.
const RETRY_DELAY_MS = 1200;

// onAttempt reports real completion: it fires as each mirror attempt
// finishes, with how much of the worst-case attempt sequence is done --
// which is what lets the UI show progress that corresponds to work
// actually performed rather than to elapsed time.
// Callers running inside a serverless time limit pass `deadlineAt` (epoch
// ms); attempts then never start with less than ~1.5s remaining and each
// attempt's timeout is clamped to the time left. This is what actually
// bounds total duration -- per-attempt timeouts alone multiply out past
// any function budget as soon as several attempts fail slowly.
const DEADLINE_RESERVE_MS = 1500;

async function queryOverpass(
  query: string,
  onAttempt?: (fractionDone: number) => void,
  timeoutMs: number = TIMEOUT_MS,
  deadlineAt?: number,
): Promise<OverpassElement[] | null> {
  const attempts = [...CANDIDATE_ENDPOINTS, ...CANDIDATE_ENDPOINTS];
  for (let i = 0; i < attempts.length; i++) {
    if (i === CANDIDATE_ENDPOINTS.length) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
    let attemptTimeout = timeoutMs;
    if (deadlineAt != null) {
      const remaining = deadlineAt - Date.now() - DEADLINE_RESERVE_MS;
      if (remaining < DEADLINE_RESERVE_MS) break;
      attemptTimeout = Math.min(timeoutMs, remaining);
    }
    const elements = await tryOne(attempts[i], query, attemptTimeout);
    onAttempt?.((i + 1) / attempts.length);
    if (elements) return elements;
  }
  return null;
}

export type NearbyResult = { attractions: NearbyPlace[]; food: NearbyPlace[] };

// onProgress reports this function's own real completion in [0..1]:
// the Overpass attempt sequence accounts for the first 70% (it is the
// slow part), the photo lookups the rest. Every callback fires when a
// concrete unit of work has finished -- never from a timer.
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  onProgress?: (fraction: number) => void,
  deadlineAt?: number,
): Promise<NearbyResult | null> {
  const elements = await queryOverpass(
    buildQuery(lat, lng),
    (f) => onProgress?.(f * 0.7),
    TIMEOUT_MS,
    deadlineAt,
  );
  if (!elements) return null;
  onProgress?.(0.7);

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
  onProgress?.(1);

  return { attractions: attractionsWithPhotos, food: foodWithPhotos };
}

// Boundary geometry for the same districts, so the picker can draw the
// city's actual shape rather than dropping pins on a tile map. Only
// administrative-boundary relations carry an outline; informally tagged
// place nodes have no geometry to draw, which is why the chip list stays
// as the fallback.
// A fixed per-ring cap alone was measured against every district
// boundary in China's geoBoundaries dataset (an independent source):
// median raw ring size is 181 points, 90th percentile 423, but the most
// complex coastlines run past 1500. At the old cap of 120, those worst
// cases deviated up to 5.6km from the true outline -- exactly the
// straight-edged, wrong-looking shapes reported live. At 500, the same
// worst cases deviate ~0.7km, and the P90 case (423 raw points) isn't
// simplified at all. SHAPE_TOTAL_POINT_BUDGET is a second, whole-response
// ceiling: it only engages for the rare city where several districts are
// all this complex at once (a coastal city with many islands), so no
// single request can still balloon into an unshippable payload.
const SHAPE_MAX_POINTS_PER_RING = 500;
const SHAPE_TOTAL_POINT_BUDGET = 6000;
const SHAPE_MAX_AREAS = 14;

// Everything administrative that CONTAINS the point -- country, province,
// city, maybe district. Cheap (tags only), and the basis for scoping the
// district query to the right city rather than to a radius. Radius was
// how Hong Kong's districts ended up in Shenzhen's picker: for a border
// city, "within 20km of the centroid" reaches into the neighbouring
// jurisdiction, and no distance threshold fixes that -- the correct
// predicate is containment, not proximity.
function buildAncestorQuery(lat: number, lng: number) {
  return `[out:json][timeout:10];is_in(${lat},${lng})->.anc;rel(pivot.anc);out tags;`;
}

// Districts strictly inside one containing area. Overpass area ids for
// relations are the relation id + 3600000000.
const OVERPASS_AREA_OFFSET = 3600000000;

function buildContainedShapeQuery(areaId: number, levels: number[]) {
  return `[out:json][timeout:25];
    rel(area:${areaId})["boundary"="administrative"]["admin_level"~"^(${levels.join("|")})$"]["name"];
  out geom ${SHAPE_MAX_AREAS * 3};`;
}

// The last-resort shape query when no containing city can be identified:
// the old proximity match, kept only as a fallback since it is exactly
// the query that bled across borders.
function buildAreaShapeQuery(lat: number, lng: number) {
  return `[out:json][timeout:25];(
    relation["boundary"="administrative"]["admin_level"~"^(6|7|8|9|10)$"]["name"](around:${AREA_RADIUS_METERS},${lat},${lng});
  );out geom ${SHAPE_MAX_AREAS * 2};`;
}

// Strips common administrative-unit words/characters and punctuation so
// "深圳市" (OSM's name for the ancestor) and "深圳" or "Shenzhen, China"
// (what a user actually typed) compare as the same place.
function normalizePlaceName(s: string): string {
  return s
    .toLowerCase()
    // Compound administrative suffixes stripped as whole units first --
    // "自治州" (autonomous prefecture) has to go before the single-char
    // pass below, because its last character, 州, is ALSO the literal
    // second character of dozens of real city names with no separate
    // suffix at all: 广州 Guangzhou, 杭州 Hangzhou, 苏州 Suzhou, 郑州
    // Zhengzhou, 福州 Fuzhou, 兰州 Lanzhou, 梅州 Meizhou, and more.
    // Blind-stripping bare 州 collapsed "广州" down to "广" -- a
    // fragment that then matched "广东" (Guangdong PROVINCE) as a
    // substring, live-verified: "广州" resolved to Guangdong instead of
    // Guangzhou itself before this fix.
    .replace(/自治州|自治区|自治县/g, "")
    // These, unlike 州, are essentially never the tail of a real 2-char
    // place name in their own right -- always a genuine administrative
    // suffix (福田"区", 平远"县"), safe to strip unconditionally.
    .replace(/[市省县区镇乡]/g, "")
    .replace(/\b(city|district|county|province|prefecture|autonomous)\b/gi, "")
    .replace(/[\s,，、]+/g, "")
    .trim();
}

// The city-ish ancestor -- i.e. the one whose OWN districts the user
// means by "which part of <destination>". Matched by NAME against what
// the user actually typed wherever possible: that's a direct read of
// intent, and sidesteps admin_level entirely, which varies by CITY, not
// just by country -- confirmed against live OSM data for two real
// Chinese cities with genuinely different hierarchies: Shenzhen (an
// ordinary prefecture-level city) sits at admin_level 5 with its
// districts (Futian) at 6, while Beijing (a province-level municipality,
// with no separate province above it in the boundary hierarchy at all)
// sits at 4 with its districts also at 6. There is no single number that
// means "the city" across China, let alone across countries -- the old
// heuristic's assumption (deepest ancestor in a fixed [4,7] window) was
// wrong on both counts, and happened to land on Futian instead of
// Shenzhen whenever the geocoded point (Shenzhen's civic centre) fell
// inside that particular district. That's exactly the bug reported
// live: the picker showed Futian's internal street-level subdivisions
// instead of Shenzhen's own ten districts.
//
// Falls back to the shallowest candidate in [4,7] only when no name
// matches. This fallback is known-ambiguous for an ordinary prefecture
// city (a real province ancestor and the real city can both be inside
// that window, and shallowest then wrongly prefers the province) --
// accepted because the fallback should be unreachable in practice: the
// route only reaches this code with a non-empty destination Nominatim
// already geocoded successfully, so a name match should always exist.
// Shallow over deep is still the safer default of the two wrong
// answers, so an unmatched destination prefers "too broad" over silently
// repeating the district-mistaken-for-city bug this function exists to
// avoid.
async function findContainingCity(
  lat: number,
  lng: number,
  destination: string | undefined,
  deadlineAt?: number,
): Promise<{ areaId: number; adminLevel: number } | null> {
  const elements = await queryOverpass(
    buildAncestorQuery(lat, lng),
    undefined,
    TIMEOUT_MS,
    deadlineAt,
  );
  if (!elements) return null;

  // A Chinese destination typed by the user won't match an OSM `name`
  // tag that's romanized, and vice versa -- OSM carries `name:en` /
  // `int_name` on essentially every major city specifically for this,
  // so every variant present is a candidate to match against.
  const candidates: { id: number; level: number; names: string[] }[] = [];
  for (const el of elements) {
    const tags = el.tags;
    if (!tags?.name || tags.boundary !== "administrative") continue;
    const level = Number.parseInt(tags.admin_level ?? "", 10);
    if (!Number.isFinite(level) || level < 4 || level > 8) continue;
    const names = [tags.name, tags["name:en"], tags.int_name, tags.alt_name].filter(
      (n): n is string => !!n,
    );
    candidates.push({ id: el.id, level, names });
  }
  if (candidates.length === 0) return null;

  if (destination) {
    const target = normalizePlaceName(destination);
    if (target.length >= 2) {
      const nameMatch = candidates.find((c) =>
        c.names.some((raw) => {
          const n = normalizePlaceName(raw);
          return n.length >= 2 && (n === target || target.includes(n) || n.includes(target));
        }),
      );
      if (nameMatch) {
        return { areaId: nameMatch.id + OVERPASS_AREA_OFFSET, adminLevel: nameMatch.level };
      }
    }
  }

  const inCityRange = candidates.filter((c) => c.level <= 7);
  if (inCityRange.length === 0) return null;
  const best = inCityRange.reduce((a, b) => (b.level < a.level ? b : a));
  return { areaId: best.id + OVERPASS_AREA_OFFSET, adminLevel: best.level };
}

function ringCentroid(ring: Point[]) {
  let sumLat = 0;
  let sumLng = 0;
  for (const p of ring) {
    sumLat += p.lat;
    sumLng += p.lng;
  }
  return { lat: sumLat / ring.length, lng: sumLng / ring.length };
}

// A single relation's own member ways can include a way that plainly
// doesn't belong to it -- live-verified on Shenzhen's real 龙岗区
// (Longgang) relation, which OSM currently lists with a second "outer"
// member that runs ~100km south into open sea as a long thin strip.
// That shape defeats a centroid-distance check: most of its points
// cluster near the real district, so its centroid lands deceptively
// close even though its extent stretches far past anything a city
// district's own geometry should span. Comparing each ring's own
// bounding-box size against the main ring's catches it regardless of
// where its centroid falls, while leaving genuine small multi-part
// shapes (a real nearby island, similarly sized split geography) alone.
const RING_OUTLIER_SIZE_RATIO = 1.5;
const RING_OUTLIER_ABS_FLOOR_KM = 25;

function ringBboxDiagonalKm(ring: Point[]) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of ring) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return haversineMeters(minLat, minLng, maxLat, maxLng) / 1000;
}

// Turns raw boundary relations into drawable AreaShapes, deduped by name.
// `adminLevel` is carried through so the caller can keep one consistent
// administrative tier -- mixing levels draws a district and its own
// sub-districts on top of each other.
function elementsToShapes(
  elements: OverpassElement[],
  lat: number,
  lng: number,
): (AreaShape & { adminLevel: number })[] {
  const byName = new Map<string, AreaShape & { adminLevel: number }>();

  for (const el of elements) {
    const name = el.tags?.name;
    if (!name || !el.members) continue;
    const adminLevel = Number.parseInt(el.tags?.admin_level ?? "", 10);
    if (!Number.isFinite(adminLevel)) continue;

    const assembled = assembleRings(el.members)
      .map((ring) => simplifyToBudget(ring, SHAPE_MAX_POINTS_PER_RING))
      .filter((ring) => ring.length >= 4);
    if (assembled.length === 0) continue;

    // Label and distance come from the largest ring's centroid, which is
    // a better anchor for a district than the first fragment's corner.
    const largest = assembled.reduce((a, b) => (b.length > a.length ? b : a));
    const centre = ringCentroid(largest);

    const mainDiagonalKm = ringBboxDiagonalKm(largest);
    const ringSizeLimitKm = Math.max(mainDiagonalKm * RING_OUTLIER_SIZE_RATIO, RING_OUTLIER_ABS_FLOOR_KM);
    const rings =
      assembled.length === 1
        ? assembled
        : assembled.filter((ring) => ring === largest || ringBboxDiagonalKm(ring) <= ringSizeLimitKm);

    const existing = byName.get(name);
    const totalPoints = rings.reduce((n, r) => n + r.length, 0);
    if (existing) {
      const existingPoints = existing.rings.reduce((n, r) => n + r.length, 0);
      if (existingPoints >= totalPoints) continue;
    }

    byName.set(name, {
      name,
      lat: centre.lat,
      lng: centre.lng,
      distanceMeters: Math.round(haversineMeters(lat, lng, centre.lat, centre.lng)),
      rings,
      adminLevel,
    });
  }

  return [...byName.values()];
}

// One administrative tier only: the shallowest level that yields at
// least two shapes. A city's districts all sit at one level; anything
// deeper is their own subdivisions drawn on top of them.
function keepOneTier(
  shapes: (AreaShape & { adminLevel: number })[],
): AreaShape[] {
  const byLevel = new Map<number, (AreaShape & { adminLevel: number })[]>();
  for (const s of shapes) {
    const group = byLevel.get(s.adminLevel) ?? [];
    group.push(s);
    byLevel.set(s.adminLevel, group);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const chosen =
    levels.find((lvl) => (byLevel.get(lvl)?.length ?? 0) >= 2) ?? levels[0];
  const picked = (byLevel.get(chosen) ?? [])
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, SHAPE_MAX_AREAS)
    .map(({ name, lat, lng, distanceMeters, rings }) => ({
      name,
      lat,
      lng,
      distanceMeters,
      rings,
    }));

  // Applied once here, after tier selection and the SHAPE_MAX_AREAS cut,
  // so this budgets only the shapes that will actually be returned --
  // not the ones the two steps above already discarded.
  return simplifyShapesToBudget(
    picked,
    SHAPE_MAX_POINTS_PER_RING,
    SHAPE_TOTAL_POINT_BUDGET,
  );
}

export async function fetchCityAreaShapes(
  lat: number,
  lng: number,
  destination: string | undefined,
  onProgress?: (fraction: number) => void,
  deadlineAt?: number,
): Promise<AreaShape[] | null> {
  // Scope to the city that actually CONTAINS the point. The earlier
  // radius version put Hong Kong's Yuen Long in Shenzhen's picker:
  // proximity crosses jurisdictions near any border, containment can't.
  // `destination` is what the user typed -- matched by name against the
  // ancestor chain so the district-mistaken-for-city bug (see
  // findContainingCity) can't recur even where the numeric fallback
  // would still get it wrong.
  const city = await findContainingCity(lat, lng, destination, deadlineAt);
  onProgress?.(0.15);

  if (city) {
    const contained = await queryOverpass(
      buildContainedShapeQuery(
        city.areaId,
        // Child tiers only, capped at 11 (OSM's deepest admin level).
        [1, 2, 3, 4]
          .map((d) => city.adminLevel + d)
          .filter((lvl) => lvl <= 11),
      ),
      (f) => onProgress?.(0.15 + f * 0.85),
      GEOMETRY_TIMEOUT_MS,
      deadlineAt,
    );
    if (contained) {
      const shapes = keepOneTier(elementsToShapes(contained, lat, lng));
      if (shapes.length > 0) return shapes;
    }
  }

  // No containing city found (point in the ocean, sparse OSM coverage) --
  // the proximity query is a worse answer but better than none.
  const nearbyShapes = await queryOverpass(
    buildAreaShapeQuery(lat, lng),
    (f) => onProgress?.(0.15 + f * 0.85),
    GEOMETRY_TIMEOUT_MS,
    deadlineAt,
  );
  if (!nearbyShapes) return null;
  return keepOneTier(elementsToShapes(nearbyShapes, lat, lng));
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
export async function fetchCityAreas(
  lat: number,
  lng: number,
  onProgress?: (fraction: number) => void,
  deadlineAt?: number,
): Promise<CityArea[] | null> {
  const elements = await queryOverpass(
    buildAreaQuery(lat, lng),
    onProgress,
    TIMEOUT_MS,
    deadlineAt,
  );
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
