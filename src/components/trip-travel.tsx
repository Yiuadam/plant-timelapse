"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type TravelItemData = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  notes: string | null;
};

const TRAVEL_TYPES = ["flight", "hotel", "train"] as const;

const TYPE_META: Record<
  (typeof TRAVEL_TYPES)[number],
  { label: string; icon: string }
> = {
  flight: { label: "Flight", icon: "✈️" },
  hotel: { label: "Hotel", icon: "🏨" },
  train: { label: "Train", icon: "🚆" },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TripTravel({
  tripId,
  items,
}: {
  tripId: string;
  items: TravelItemData[];
}) {
  const router = useRouter();
  const [type, setType] = useState<(typeof TRAVEL_TYPES)[number]>("flight");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/travel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          detail,
          location,
          startAt,
          endAt,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add");
        return;
      }
      setTitle("");
      setDetail("");
      setLocation("");
      setStartAt("");
      setEndAt("");
      setNotes("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/travel/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const sorted = [...items].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/20"
      >
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TRAVEL_TYPES)[number])}
            className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
          >
            {TRAVEL_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_META[t].icon} {TYPE_META[t].label}
              </option>
            ))}
          </select>
          <input
            className="flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20"
            placeholder={
              type === "flight"
                ? "Airline (e.g. Cathay Pacific)"
                : type === "hotel"
                  ? "Hotel name"
                  : "Train operator"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20"
            placeholder={
              type === "flight"
                ? "Flight no. / confirmation"
                : "Confirmation / room no."
            }
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <input
            className="flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20"
            placeholder={
              type === "hotel" ? "Address" : "Route (e.g. HKG → NRT)"
            }
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-black/50 dark:text-white/50">
            {type === "hotel" ? "Check-in" : "Departs"}
            <input
              type="datetime-local"
              className="mt-0.5 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </label>
          <label className="flex-1 text-xs text-black/50 dark:text-white/50">
            {type === "hotel" ? "Check-out" : "Arrives"} (optional)
            <input
              type="datetime-local"
              className="mt-0.5 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </label>
        </div>
        <input
          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-xl bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
      </form>

      {sorted.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {sorted.map((item) => {
            const meta = TYPE_META[item.type as (typeof TRAVEL_TYPES)[number]] ?? {
              label: item.type,
              icon: "🧳",
            };
            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20"
              >
                <div className="flex gap-2">
                  <span aria-hidden>{meta.icon}</span>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-black/60 dark:text-white/60">
                      {formatDateTime(item.startAt)}
                      {item.endAt && ` – ${formatDateTime(item.endAt)}`}
                    </div>
                    {(item.location || item.detail) && (
                      <div className="text-xs text-black/50 dark:text-white/50">
                        {[item.location, item.detail].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-black/50 dark:text-white/50">
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="shrink-0 text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          Add flights, hotels, and train rides to keep your bookings in one
          place.
        </p>
      )}
    </div>
  );
}
