// Thin wrapper around Nominatim's search endpoint that also returns the
// matched place's own `type` (e.g. "city", "suburb", "attraction") --
// used by the nearby-places area picker to tell a whole-city match
// ("shenzhen") apart from an already-specific one ("Nanshan, Shenzhen").
export type GeocodedPlace = { lat: number; lng: number; type: string };

type NominatimResult = { lat: string; lon: string; type: string };

export async function geocodeDestination(query: string): Promise<GeocodedPlace | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query.slice(0, 200));
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TravelLog/1.0 (personal travel journal app)" },
    });
    if (!res.ok) return null;
    const data: NominatimResult[] = await res.json();
    const first = data[0];
    if (!first) return null;
    return { lat: Number(first.lat), lng: Number(first.lon), type: first.type };
  } catch {
    return null;
  }
}

// Nominatim `type` values broad enough that "nearby" results centered on
// the raw geocoded point would be too vague to be useful -- worth asking
// the user to narrow down to a specific area first.
export const BROAD_ADDRESS_TYPES = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "municipality",
  "administrative",
  "state",
  "county",
  "country",
]);

export function isBroadDestination(addressType: string | null | undefined) {
  return !!addressType && BROAD_ADDRESS_TYPES.has(addressType);
}
