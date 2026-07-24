"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { MapLocation } from "@/components/trip-map";
import { useFieldLocks, useFieldEditing } from "@/hooks/use-field-lock";

const TripMap = dynamic(() => import("@/components/trip-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-black/50">
      Loading map...
    </div>
  ),
});

export default function TripLocations({
  tripId,
  locations,
}: {
  tripId: string;
  locations: MapLocation[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const editors = useFieldLocks("trip-field", tripId);
  const nameLock = useFieldEditing("trip-field", tripId, "new-location-name");
  const notesLock = useFieldEditing("trip-field", tripId, "new-location-notes");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/trips/${tripId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, notes, lat: pending.lat, lng: pending.lng }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add location");
        return;
      }

      setName("");
      setNotes("");
      setPending(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-80 w-full overflow-hidden rounded-2xl border border-black/10 dark:border-white/20">
        <TripMap
          locations={locations}
          pendingMarker={pending}
          onMapClick={(lat, lng) => setPending({ lat, lng })}
        />
      </div>

      {pending ? (
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/20"
        >
          <p className="text-sm text-black/60 dark:text-white/60">
            Pinned at {pending.lat.toFixed(4)}, {pending.lng.toFixed(4)}
          </p>
          <div className="relative">
            {editors["new-location-name"] && (
              <span className="pointer-events-none absolute -top-2 right-2 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                {editors["new-location-name"].userName} is editing
              </span>
            )}
            <input
              className={`w-full text-sm ${
                editors["new-location-name"]
                  ? "rounded-xl border border-amber-500 px-3 py-2 ring-2 ring-amber-300 dark:ring-amber-400/40"
                  : "rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
              }`}
              placeholder="Place name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={nameLock.onFocus}
              onBlur={nameLock.onBlur}
              required
            />
          </div>
          <div className="relative">
            {editors["new-location-notes"] && (
              <span className="pointer-events-none absolute -top-2 right-2 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                {editors["new-location-notes"].userName} is editing
              </span>
            )}
            <input
              className={`w-full text-sm ${
                editors["new-location-notes"]
                  ? "rounded-xl border border-amber-500 px-3 py-2 ring-2 ring-amber-300 dark:ring-amber-400/40"
                  : "rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
              }`}
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={notesLock.onFocus}
              onBlur={notesLock.onBlur}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add location"}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-xl border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          Click the map to pin a place you visited.
        </p>
      )}

      {locations.length > 0 && (
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
      )}
    </div>
  );
}
