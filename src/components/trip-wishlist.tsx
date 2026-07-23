"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { MapLocation } from "@/components/trip-map";

const TripMap = dynamic(() => import("@/components/trip-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-black/50">
      Loading map...
    </div>
  ),
});

type SearchResult = {
  name: string;
  lat: number;
  lng: number;
};

export default function TripWishlist({
  tripId,
  locations,
}: {
  tripId: string;
  locations: MapLocation[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setSearching(true);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        setError("Search failed");
        return;
      }
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(result: SearchResult) {
    setError(null);
    setAddingKey(`${result.lat},${result.lng}`);

    try {
      const res = await fetch(`/api/trips/${tripId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.name,
          lat: result.lat,
          lng: result.lng,
          visited: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add to wishlist");
        return;
      }

      setResults([]);
      setQuery("");
      router.refresh();
    } finally {
      setAddingKey(null);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-80 w-full overflow-hidden rounded-2xl border border-black/10 dark:border-white/20">
        <TripMap locations={locations} />
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20"
          placeholder="Search for a place to add..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-xl bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((result) => {
            const key = `${result.lat},${result.lng}`;
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20"
              >
                <span className="truncate">{result.name}</span>
                <button
                  onClick={() => handleAdd(result)}
                  disabled={addingKey === key}
                  className="shrink-0 rounded-xl bg-foreground px-3 py-1 text-xs text-background disabled:opacity-50"
                >
                  {addingKey === key ? "Adding..." : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {locations.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="flex items-center justify-between rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20"
            >
              <div>
                <div className="font-medium">{loc.name}</div>
                {loc.notes && (
                  <div className="text-black/60 dark:text-white/60">
                    {loc.notes}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(loc.id)}
                className="text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          Search above to add places you want to visit.
        </p>
      )}
    </div>
  );
}
