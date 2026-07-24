"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = { name: string; lat: number; lng: number };
type TripOption = { id: string; title: string };

export default function AddTimelineEntry({ trips }: { trips: TripOption[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [tripMode, setTripMode] = useState<"existing" | "new">(
    trips.length > 0 ? "existing" : "new",
  );
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [newTripTitle, setNewTripTitle] = useState("");

  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<SearchResult | null>(null);

  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTripMode(trips.length > 0 ? "existing" : "new");
    setTripId(trips[0]?.id ?? "");
    setNewTripTitle("");
    setPlaceQuery("");
    setPlaceResults([]);
    setPlace(null);
    setDate("");
    setDescription("");
    setFile(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!placeQuery.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(placeQuery)}`,
      );
      if (!res.ok) {
        setError("Search failed");
        return;
      }
      const data = await res.json();
      setPlaceResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!place) {
      setError("Search for and select a place first");
      return;
    }
    if (tripMode === "new" && !newTripTitle.trim()) {
      setError("Give the new trip a title");
      return;
    }
    if (tripMode === "existing" && !tripId) {
      setError("Choose a trip");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let effectiveTripId = tripId;

      if (tripMode === "new") {
        const tripRes = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTripTitle }),
        });
        if (!tripRes.ok) {
          const data = await tripRes.json().catch(() => ({}));
          setError(data.error ?? "Failed to create trip");
          return;
        }
        const trip = await tripRes.json();
        effectiveTripId = trip.id;
      }

      const locationRes = await fetch(
        `/api/trips/${effectiveTripId}/locations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            notes: description,
            visited: true,
            visitedAt: date || undefined,
          }),
        },
      );
      if (!locationRes.ok) {
        const data = await locationRes.json().catch(() => ({}));
        setError(data.error ?? "Failed to add location");
        return;
      }
      const location = await locationRes.json();

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("locationId", location.id);
        const photoRes = await fetch(
          `/api/trips/${effectiveTripId}/photos`,
          { method: "POST", body: formData },
        );
        if (!photoRes.ok) {
          const data = await photoRes.json().catch(() => ({}));
          setError(data.error ?? "Location added, but the photo failed to upload");
          return;
        }
      }

      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-foreground px-4 py-2 text-sm text-background"
      >
        + Add event
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-background p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add a timeline event</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-black/50 dark:text-white/50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Trip</span>
              {trips.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setTripMode("existing")}
                    className={`rounded-lg px-3 py-1 ${tripMode === "existing" ? "bg-foreground text-background" : "border border-black/10 dark:border-white/20"}`}
                  >
                    Existing trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripMode("new")}
                    className={`rounded-lg px-3 py-1 ${tripMode === "new" ? "bg-foreground text-background" : "border border-black/10 dark:border-white/20"}`}
                  >
                    New trip
                  </button>
                </div>
              )}
              {tripMode === "existing" && trips.length > 0 ? (
                <select
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
                >
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={newTripTitle}
                  onChange={(e) => setNewTripTitle(e.target.value)}
                  placeholder="New trip title"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20"
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Place</span>
              {place ? (
                <div className="flex items-center justify-between rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20">
                  <span className="truncate">{place.name}</span>
                  <button
                    type="button"
                    onClick={() => setPlace(null)}
                    className="shrink-0 text-xs text-red-600"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      value={placeQuery}
                      onChange={(e) => setPlaceQuery(e.target.value)}
                      placeholder="Search for a place..."
                      className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20"
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={searching}
                      className="rounded-xl border border-black/10 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
                    >
                      {searching ? "..." : "Search"}
                    </button>
                  </div>
                  {placeResults.length > 0 && (
                    <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                      {placeResults.map((r) => (
                        <li key={`${r.lat},${r.lng}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setPlace(r);
                              setPlaceResults([]);
                            }}
                            className="block w-full truncate rounded-lg px-2 py-1 text-left text-sm hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            {r.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <label className="flex flex-col gap-1 text-sm">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Photo (optional)
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add to timeline"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
