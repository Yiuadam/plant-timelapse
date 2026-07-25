"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";

export type TripListItemData = {
  id: string;
  title: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
};

const DELETE_WIDTH = 84;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// A swipe-left-to-reveal-delete row, matching the standard iOS list
// pattern: the card slides left under drag to expose a red delete button
// pinned to the right edge underneath it. Only trip owners get this --
// collaborators can't delete a shared trip (the DELETE route 404s for
// them anyway), so for them this is just a plain link.
export default function TripListItem({
  trip,
  isOwner,
  isShared,
}: {
  trip: TripListItemData;
  isOwner: boolean;
  isShared: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dragState = useRef<{ startClientX: number; startDragX: number } | null>(null);
  const draggedRef = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (!isOwner) return;
    dragState.current = { startClientX: e.clientX, startDragX: dragX };
    draggedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;
    const delta = e.clientX - drag.startClientX;
    if (Math.abs(delta) > 6) draggedRef.current = true;
    setDragging(true);
    setDragX(clamp(drag.startDragX + delta, -DELETE_WIDTH, 0));
  }

  function onPointerUp() {
    if (!dragState.current) return;
    dragState.current = null;
    setDragging(false);
    setDragX((x) => (x < -DELETE_WIDTH / 2 ? -DELETE_WIDTH : 0));
  }

  function handleClick(e: React.MouseEvent) {
    // A real swipe, or the row already sitting open, means this click is
    // part of the swipe gesture (or a tap meant to close it) rather than
    // an intent to navigate into the trip.
    if (draggedRef.current || dragX < 0) {
      e.preventDefault();
      draggedRef.current = false;
      setDragX(0);
    }
  }

  async function handleDelete() {
    if (!confirm(t("trips_delete_confirm", { title: trip.title }))) return;
    setDeleting(true);
    try {
      await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className="relative overflow-hidden rounded-2xl">
      {isOwner && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`${t("delete")} ${trip.title}`}
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600 text-sm font-medium text-white disabled:opacity-60"
          style={{ width: DELETE_WIDTH }}
        >
          {deleting ? "…" : t("delete")}
        </button>
      )}
      <Link
        href={`/trips/${trip.id}`}
        prefetch={true}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={handleClick}
        className="relative flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/50 px-5 py-4 shadow-sm transition hover:bg-white/80 dark:border-white/15 dark:bg-black/20 dark:hover:bg-black/30"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
      >
        <div className="min-w-0">
          <div className="truncate font-medium">{trip.title}</div>
          {(trip.destination || trip.startDate) && (
            <div className="truncate text-sm text-black/60 dark:text-white/60">
              {trip.destination}
              {trip.startDate &&
                `${trip.destination ? " · " : ""}${new Date(trip.startDate).toLocaleDateString()}${
                  trip.endDate
                    ? ` – ${new Date(trip.endDate).toLocaleDateString()}`
                    : ""
                }`}
            </div>
          )}
        </div>
        {isShared && (
          <span className="shrink-0 rounded-full bg-black/5 px-2 py-1 text-xs text-black/50 dark:bg-white/10 dark:text-white/50">
            {t("trips_shared")}
          </span>
        )}
      </Link>
    </li>
  );
}
