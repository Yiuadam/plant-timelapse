"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type TripFormValues = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export default function TripForm({
  mode,
  tripId,
  initialValues,
}: {
  mode: "create" | "edit";
  tripId?: string;
  initialValues?: TripFormValues;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [destination, setDestination] = useState(
    initialValues?.destination ?? "",
  );
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = mode === "create" ? "/api/trips" : `/api/trips/${tripId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, destination, startDate, endDate, notes }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ?? (mode === "create" ? "Failed to create trip" : "Failed to save changes"),
        );
        return;
      }

      const trip = await res.json();
      router.push(`/trips/${trip.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Destination
        <input
          className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </label>
      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Start date
          <input
            type="date"
            className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          End date
          <input
            type="date"
            className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Notes
        <textarea
          className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {loading
          ? mode === "create"
            ? "Creating..."
            : "Saving..."
          : mode === "create"
            ? "Create trip"
            : "Save changes"}
      </button>
    </form>
  );
}
