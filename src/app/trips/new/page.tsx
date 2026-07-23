"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTripPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, destination, startDate, endDate, notes }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create trip");
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
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">New trip</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Destination
          <input
            className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>
        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Start date
            <input
              type="date"
              className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            End date
            <input
              type="date"
              className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Notes
          <textarea
            className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create trip"}
        </button>
      </form>
    </div>
  );
}
