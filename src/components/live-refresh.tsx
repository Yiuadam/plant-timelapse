"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Periodically re-fetches this page's server-rendered data so edits made by
// other collaborators (or on another tab) show up without a manual reload.
// router.refresh() only replays server components -- it doesn't reset
// client component state, so an in-progress "add" form elsewhere on the
// page is unaffected.
export default function LiveRefresh({ intervalMs = 7000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
