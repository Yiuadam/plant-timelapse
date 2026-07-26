"use client";

import { useEffect, useState } from "react";

export type LandmarkMapEntry = {
  landmarkKey: string;
  inkOverride: string | null;
  displayName: string;
};

type LandmarkMap = Record<string, LandmarkMapEntry>;

// Module-scoped so every PassportStampGraphic instance on a page (a full
// passport can render dozens of stamps at once) shares one fetch instead
// of one each.
let cache: LandmarkMap | null = null;
let inFlight: Promise<LandmarkMap> | null = null;

function load(): Promise<LandmarkMap> {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;
  const promise: Promise<LandmarkMap> = fetch("/api/landmarks")
    .then((res) => (res.ok ? res.json() : { landmarks: {} }))
    .then((data) => {
      const resolved: LandmarkMap = data.landmarks ?? {};
      cache = resolved;
      return resolved;
    })
    .catch(() => {
      const resolved: LandmarkMap = {};
      cache = resolved;
      return resolved;
    });
  inFlight = promise;
  return promise;
}

// Returns null while loading (callers should fall back to the small
// hardcoded set in city-landmarks.ts in the meantime) or the full
// ~200-city curated map once fetched.
export function useLandmarkMap(): LandmarkMap | null {
  const [map, setMap] = useState<LandmarkMap | null>(cache);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    load().then((m) => {
      if (!cancelled) setMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}
