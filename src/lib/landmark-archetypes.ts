// The broader (non-bespoke) landmark icon vocabulary used for the ~185
// curated cities that don't get a fully specific illustration -- each key
// maps to a real landmark *type* (mosque, cathedral, ski peak, ...) for
// that city rather than a one-off custom drawing, rendered by
// ArchetypeLandmarkIcon in landmark-icons.tsx. The 200-city curated data
// itself lives in src/data/landmark-seed.json (single source of truth,
// also read by the DB seed script at prisma/seed-landmarks.mjs).
export const ARCHETYPE_KEYS = [
  "clock-tower",
  "minaret-mosque",
  "pagoda",
  "cathedral-spire",
  "castle-fortress",
  "obelisk-monument",
  "harbor-lighthouse",
  "opera-shell",
  "skyscraper-cluster",
  "suspension-bridge",
  "ancient-ruins-columns",
  "desert-dune-oasis",
  "ski-mountain-peak",
  "volcano",
  "waterfall-cliff",
  "windmill",
  "stadium-arena",
  "market-souk",
  "temple-tiered",
  "modern-arch-monument",
  "canal-gondola",
  "beach-palm",
  "generic-tower",
  "statue-monument",
] as const;

export type ArchetypeKey = (typeof ARCHETYPE_KEYS)[number];

const ARCHETYPE_KEY_SET: Set<string> = new Set(ARCHETYPE_KEYS);

export function isArchetypeKey(key: string): key is ArchetypeKey {
  return ARCHETYPE_KEY_SET.has(key);
}
