"use client";

import { useEffect, useState } from "react";

type NearbyPlace = {
  id: number;
  name: string;
  category: string;
  distanceMeters: number;
};

type NearbyResult = { attractions: NearbyPlace[]; food: NearbyPlace[] };

function formatDistance(meters: number) {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function PlaceList({
  places,
  emptyText,
}: {
  places: NearbyPlace[];
  emptyText: string;
}) {
  if (places.length === 0) {
    return <p className="text-sm text-black/50 dark:text-white/50">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {places.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">{p.name}</div>
            <div className="truncate text-xs text-black/50 capitalize dark:text-white/50">
              {p.category}
            </div>
          </div>
          <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
            {formatDistance(p.distanceMeters)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function TripNearby({
  tripId,
  destination,
}: {
  tripId: string;
  destination: string | null;
}) {
  const [data, setData] = useState<NearbyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!destination);

  useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    fetch(`/api/trips/${tripId}/nearby`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load nearby places");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, destination]);

  const flightsUrl = destination
    ? `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights to ${destination}`)}`
    : null;
  const transportUrl = destination
    ? `https://www.google.com/search?q=${encodeURIComponent(`trains and transportation to ${destination}`)}`
    : null;

  return (
    <div className="flex flex-col gap-4">
      {(flightsUrl || transportUrl) && (
        <div className="flex flex-wrap gap-2">
          {flightsUrl && (
            <a
              href={flightsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
            >
              ✈️ Search flights
            </a>
          )}
          {transportUrl && (
            <a
              href={transportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
            >
              🚆 Search trains & transport
            </a>
          )}
        </div>
      )}

      {!destination && (
        <p className="text-sm text-black/50 dark:text-white/50">
          Set a destination on this trip to see nearby recommendations.
        </p>
      )}

      {destination && loading && (
        <p className="text-sm text-black/50 dark:text-white/50">Finding what&apos;s nearby…</p>
      )}

      {destination && !loading && error && (
        <p className="text-sm text-black/50 dark:text-white/50">{error}</p>
      )}

      {data && (
        <>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-black/70 dark:text-white/70">
              Nearby attractions
            </h3>
            <PlaceList places={data.attractions} emptyText="No attractions found nearby." />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-black/70 dark:text-white/70">
              Nearby food
            </h3>
            <PlaceList places={data.food} emptyText="No restaurants found nearby." />
          </div>
        </>
      )}
    </div>
  );
}
