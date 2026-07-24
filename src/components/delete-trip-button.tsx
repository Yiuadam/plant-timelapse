"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteTripButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this trip and everything in it? This can't be undone.")) {
      return;
    }
    setLoading(true);
    try {
      await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-600 disabled:opacity-50"
    >
      {loading ? "Deleting..." : "Delete trip"}
    </button>
  );
}
