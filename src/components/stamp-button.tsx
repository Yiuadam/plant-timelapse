"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StampButton({
  tripId,
  title,
  destination,
}: {
  tripId: string;
  title: string;
  destination: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStamp() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/passport/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to stamp");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3 dark:border-white/20">
      <div className="min-w-0">
        <div className="truncate font-medium">{destination}</div>
        <div className="truncate text-xs text-black/50 dark:text-white/50">
          {title}
        </div>
        {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </div>
      <button
        type="button"
        onClick={handleStamp}
        disabled={loading}
        className="shrink-0 rounded-xl bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {loading ? "Stamping..." : "Stamp it"}
      </button>
    </div>
  );
}
