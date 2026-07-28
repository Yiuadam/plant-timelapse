"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function QuickTripStart() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: destination,
          destination,
          startDate: "",
          endDate: "",
          notes: "",
          mood: "",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't start that trip");
        return;
      }

      const trip = await res.json();
      router.push(`/trips/${trip.id}`);
      router.refresh();
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Where are you headed?</h1>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <input
          autoFocus
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-center text-lg outline-none focus:border-black/30 dark:border-white/20 dark:bg-transparent dark:focus:border-white/40"
          placeholder="Tokyo, Japan"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-foreground px-4 py-3 text-lg text-background disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start planning"}
        </button>
      </form>
    </div>
  );
}
