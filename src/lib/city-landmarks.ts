// Maps well-known tourist cities to a specific, real landmark so their
// passport stamp shows something recognizable (the Eiffel Tower for
// Paris, Big Ben for London, ...) instead of one of the six generic
// abstract silhouettes every other city still gets. Destination is free
// text, so matching is deliberately tolerant: "Paris", "Paris, France",
// and "paris  france" should all resolve the same way.

export type LandmarkKey =
  | "eiffel-tower"
  | "big-ben"
  | "statue-of-liberty"
  | "golden-gate-bridge"
  | "colosseum"
  | "sagrada-familia"
  | "great-wall"
  | "tokyo-tower"
  | "oriental-pearl-tower"
  | "marina-bay-sands"
  | "sydney-opera-house"
  | "christ-the-redeemer"
  | "burj-khalifa"
  | "pyramids-of-giza"
  | "brandenburg-gate"
  | "parthenon"
  | "hagia-sophia"
  | "saint-basils"
  | "wat-arun"
  | "taipei-101"
  | "table-mountain"
  | "venice-canal"
  | "amsterdam-canal-houses"
  | "hong-kong-skyline"
  | "namsan-tower";

// All bespoke keys, for validating a landmarkKey string coming back from
// the DB-backed landmark map (see use-landmark-map.ts) before treating it
// as one of these fully custom drawings rather than a broader archetype.
export const LANDMARK_KEYS: LandmarkKey[] = [
  "eiffel-tower",
  "big-ben",
  "statue-of-liberty",
  "golden-gate-bridge",
  "colosseum",
  "sagrada-familia",
  "great-wall",
  "tokyo-tower",
  "oriental-pearl-tower",
  "marina-bay-sands",
  "sydney-opera-house",
  "christ-the-redeemer",
  "burj-khalifa",
  "pyramids-of-giza",
  "brandenburg-gate",
  "parthenon",
  "hagia-sophia",
  "saint-basils",
  "wat-arun",
  "taipei-101",
  "table-mountain",
  "venice-canal",
  "amsterdam-canal-houses",
  "hong-kong-skyline",
  "namsan-tower",
];

// A landmark's real-world color, used instead of the usual seeded ink
// palette for a handful of landmarks famous enough to have one (the
// Golden Gate Bridge's international orange, the Statue of Liberty's
// oxidized copper). Left undefined falls back to the normal seeded ink.
export const LANDMARK_INK_OVERRIDE: Partial<Record<LandmarkKey, string>> = {
  "golden-gate-bridge": "#c1440e",
  "statue-of-liberty": "#4a8a76",
  "tokyo-tower": "#cc3333",
};

const CITY_LANDMARKS: Record<string, LandmarkKey> = {
  paris: "eiffel-tower",
  london: "big-ben",
  "new york": "statue-of-liberty",
  nyc: "statue-of-liberty",
  "san francisco": "golden-gate-bridge",
  sf: "golden-gate-bridge",
  rome: "colosseum",
  barcelona: "sagrada-familia",
  beijing: "great-wall",
  tokyo: "tokyo-tower",
  shanghai: "oriental-pearl-tower",
  singapore: "marina-bay-sands",
  sydney: "sydney-opera-house",
  "rio de janeiro": "christ-the-redeemer",
  rio: "christ-the-redeemer",
  dubai: "burj-khalifa",
  cairo: "pyramids-of-giza",
  giza: "pyramids-of-giza",
  berlin: "brandenburg-gate",
  athens: "parthenon",
  istanbul: "hagia-sophia",
  moscow: "saint-basils",
  bangkok: "wat-arun",
  taipei: "taipei-101",
  "cape town": "table-mountain",
  venice: "venice-canal",
  amsterdam: "amsterdam-canal-houses",
  "hong kong": "hong-kong-skyline",
  hk: "hong-kong-skyline",
  seoul: "namsan-tower",
};

export function normalizeCityText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (e.g. "Köln" -> "koln")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ") // punctuation/digits -> space
    .replace(/\s+/g, " ")
    .trim();
}

// Generic version of the lookup below -- shared with the larger DB-backed
// landmark map (see use-landmark-map.ts) so both the ~25 hardcoded
// fallback entries here and the ~200-city curated set use identical
// matching rules. Tries an exact match first ("Paris"), then a
// whole-word substring match so "Paris, France" or "A week in Paris"
// still resolve -- padding both sides with spaces makes the substring
// check word-boundary-safe without needing a regex. Map keys must
// already be normalized (normalizeCityText).
export function matchCityInMap<T>(destination: string, map: Record<string, T>): T | null {
  const normalized = normalizeCityText(destination);
  if (!normalized) return null;
  if (map[normalized]) return map[normalized];

  const padded = ` ${normalized} `;
  for (const [city, value] of Object.entries(map)) {
    if (padded.includes(` ${city} `)) return value;
  }
  return null;
}

// Looks up a curated landmark for a free-text destination string against
// the small hardcoded set above -- kept as a guaranteed-available
// fallback for the DB-backed lookup (see use-landmark-map.ts), so the
// most iconic cities still get their real landmark even before the
// larger map has loaded or if the fetch fails.
export function findCityLandmark(destination: string): LandmarkKey | null {
  return matchCityInMap(destination, CITY_LANDMARKS);
}
