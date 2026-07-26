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

// At rest the delete tab is just a thin colored sliver beside the card.
// Dragging the card left grows the tab's own width in lockstep with the
// drag distance (not a hidden button revealed by translateX) so it reads
// as physically being pulled open, up to this full-size cap.
const REST_WIDTH = 10;
const MAX_WIDTH = 84;
const MAX_DRAG = MAX_WIDTH - REST_WIDTH;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

// A trip row with a slim, always-visible delete tab beside it (not a
// hidden swipe-reveal button underneath) whose width grows continuously
// with how far the card is dragged left, then snaps back once released --
// tappable at any width, drag or not. Only trip owners get this --
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
  const [dragAmount, setDragAmount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dragState = useRef<{ startClientX: number; startDragAmount: number } | null>(null);
  const draggedRef = useRef(false);

  const tabWidth = REST_WIDTH + dragAmount;
  const openness = dragAmount / MAX_DRAG;

  function onPointerDown(e: React.PointerEvent) {
    if (!isOwner) return;
    dragState.current = { startClientX: e.clientX, startDragAmount: dragAmount };
    draggedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragState.current;
    if (!drag) return;
    const delta = drag.startClientX - e.clientX;
    if (Math.abs(delta) > 6) draggedRef.current = true;
    setDragging(true);
    setDragAmount(clamp(drag.startDragAmount + delta, 0, MAX_DRAG));
  }

  function onPointerUp() {
    if (!dragState.current) return;
    dragState.current = null;
    setDragging(false);
    setDragAmount(0);
  }

  function handleClick(e: React.MouseEvent) {
    // A real drag means this click is part of the gesture, not an intent
    // to navigate into the trip.
    if (draggedRef.current) {
      e.preventDefault();
      draggedRef.current = false;
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
    <li className="flex items-stretch gap-1.5">
      <Link
        href={`/trips/${trip.id}`}
        prefetch={true}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={handleClick}
        className="flex min-w-0 flex-1 items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/50 px-5 py-4 shadow-sm transition-colors hover:bg-white/80 dark:border-white/15 dark:bg-black/20 dark:hover:bg-black/30"
        style={{ touchAction: "pan-y" }}
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
      {isOwner && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`${t("delete")} ${trip.title}`}
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-red-600 text-sm font-medium text-white disabled:opacity-60"
          style={{
            width: tabWidth,
            transition: dragging ? "none" : "width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <span
            className="whitespace-nowrap"
            style={{
              opacity: dragging ? Math.max(0, openness * 1.6 - 0.6) : 0,
              transition: dragging ? "none" : "opacity 0.2s ease",
            }}
          >
            {deleting ? "…" : t("delete")}
          </span>
        </button>
      )}
    </li>
  );
}
