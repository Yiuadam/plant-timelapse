"use client";

import { useCallback, useEffect, useState } from "react";

type NearbyPlace = {
  id: number;
  name: string;
  category: string;
  distanceMeters: number;
};

type NearbyResult = { attractions: NearbyPlace[]; food: NearbyPlace[] };

type CityArea = { name: string; lat: number; lng: number; distanceMeters: number };

type AreaPrompt = { cityLabel: string; areas: CityArea[] };

function formatDistance(meters: number) {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

const SCAN_MESSAGES = [
  "Finding what's nearby…",
  "Scouting the area…",
  "Checking the map…",
  "Almost there…",
];

function ScanningIndicator() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % SCAN_MESSAGES.length);
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="nearby-scan-ring" aria-hidden />
        <span className="nearby-scan-ring nearby-scan-ring-delay" aria-hidden />
        <span className="nearby-scan-compass text-3xl" aria-hidden>
          🧭
        </span>
      </div>
      <p className="text-sm text-black/50 dark:text-white/50">{SCAN_MESSAGES[messageIndex]}</p>
      <div className="relative h-1.5 w-40 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div className="nearby-scan-progress-bar" aria-hidden />
      </div>
    </div>
  );
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
  const [areaPrompt, setAreaPrompt] = useState<AreaPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!destination);
  const [pickingArea, setPickingArea] = useState(false);

  // Split so the mount effect can fetch without a synchronous setState
  // call in its body (only the terminal, async-resolved updates below) --
  // the retry button below calls `retry`, which resets state first since
  // it's a real event handler, not an effect.
  const runFetch = useCallback(() => {
    if (!destination) return;
    fetch(`/api/trips/${tripId}/nearby`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else if (json.needsAreaSelection) {
          setAreaPrompt({ cityLabel: json.cityLabel, areas: json.areas });
        } else {
          setData(json);
        }
      })
      .catch(() => setError("Couldn't load nearby places"))
      .finally(() => setLoading(false));
  }, [tripId, destination]);

  useEffect(() => {
    runFetch();
  }, [runFetch]);

  function retry() {
    setLoading(true);
    setError(null);
    setAreaPrompt(null);
    runFetch();
  }

  function pickArea(area: string | null) {
    setPickingArea(true);
    setError(null);
    fetch(`/api/trips/${tripId}/area`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area: area ?? "" }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
          setAreaPrompt(null);
        }
      })
      .catch(() => setError("Couldn't save that area"))
      .finally(() => setPickingArea(false));
  }

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

      {destination && loading && <ScanningIndicator />}

      {destination && !loading && error && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-black/50 dark:text-white/50">{error}</p>
          <button
            onClick={retry}
            className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1 text-xs dark:border-white/20"
          >
            Try again
          </button>
        </div>
      )}

      {areaPrompt && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            Which part of <span className="font-medium">{areaPrompt.cityLabel}</span> are you
            focusing on? Picking an area gives more precise recommendations.
          </p>
          <div className="flex flex-wrap gap-2">
            {areaPrompt.areas.map((a) => (
              <button
                key={a.name}
                disabled={pickingArea}
                onClick={() => pickArea(a.name)}
                className="rounded-xl border border-black/10 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
              >
                {a.name}
              </button>
            ))}
          </div>
          <button
            disabled={pickingArea}
            onClick={() => pickArea(null)}
            className="self-start text-xs underline disabled:opacity-50"
          >
            {pickingArea ? "Saving…" : "Skip — keep it general"}
          </button>
        </div>
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
