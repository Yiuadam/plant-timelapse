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
  巴黎: "eiffel-tower",
  london: "big-ben",
  伦敦: "big-ben",
  "new york": "statue-of-liberty",
  nyc: "statue-of-liberty",
  纽约: "statue-of-liberty",
  "san francisco": "golden-gate-bridge",
  sf: "golden-gate-bridge",
  旧金山: "golden-gate-bridge",
  三藩市: "golden-gate-bridge",
  rome: "colosseum",
  罗马: "colosseum",
  barcelona: "sagrada-familia",
  巴塞罗那: "sagrada-familia",
  beijing: "great-wall",
  北京: "great-wall",
  tokyo: "tokyo-tower",
  东京: "tokyo-tower",
  shanghai: "oriental-pearl-tower",
  上海: "oriental-pearl-tower",
  singapore: "marina-bay-sands",
  新加坡: "marina-bay-sands",
  sydney: "sydney-opera-house",
  悉尼: "sydney-opera-house",
  "rio de janeiro": "christ-the-redeemer",
  rio: "christ-the-redeemer",
  里约热内卢: "christ-the-redeemer",
  dubai: "burj-khalifa",
  迪拜: "burj-khalifa",
  cairo: "pyramids-of-giza",
  giza: "pyramids-of-giza",
  开罗: "pyramids-of-giza",
  吉萨: "pyramids-of-giza",
  berlin: "brandenburg-gate",
  柏林: "brandenburg-gate",
  athens: "parthenon",
  雅典: "parthenon",
  istanbul: "hagia-sophia",
  伊斯坦布尔: "hagia-sophia",
  moscow: "saint-basils",
  莫斯科: "saint-basils",
  bangkok: "wat-arun",
  曼谷: "wat-arun",
  taipei: "taipei-101",
  台北: "taipei-101",
  "cape town": "table-mountain",
  开普敦: "table-mountain",
  venice: "venice-canal",
  威尼斯: "venice-canal",
  amsterdam: "amsterdam-canal-houses",
  阿姆斯特丹: "amsterdam-canal-houses",
  "hong kong": "hong-kong-skyline",
  hk: "hong-kong-skyline",
  香港: "hong-kong-skyline",
  seoul: "namsan-tower",
  首尔: "namsan-tower",
};

export function normalizeCityText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (e.g. "Köln" -> "koln")
    .toLowerCase()
    // Punctuation/digits -> space, but keep every *letter* -- not just
    // a-z. The old `[^a-z\s]` here stripped entire non-Latin scripts
    // (Chinese, Japanese, Korean, Arabic, ...), so a destination typed
    // in any of those always normalized to an empty string and could
    // never match a curated city. \p{L} covers all of them.
    .replace(/[^\p{L}\s]/gu, " ")
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

  // Scripts like Chinese/Japanese don't use spaces between words, so the
  // space-padded word-boundary check above can never match them (e.g.
  // "悉尼一日游" never contains " 悉尼 " as a substring). Fall back to a
  // plain substring match, restricted to non-ASCII text on both sides so
  // this doesn't loosen matching for short Latin keys like "sf" or "hk".
  if (/[^\x00-\x7f]/.test(normalized)) {
    for (const [city, value] of Object.entries(map)) {
      if (city.length >= 2 && /[^\x00-\x7f]/.test(city) && normalized.includes(city)) {
        return value;
      }
    }
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
