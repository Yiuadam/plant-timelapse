"use client";

import { useRef, useState } from "react";
import {
  TripsWidget,
  ClockWidget,
  PhotosWidget,
  MapWidget,
  NotesWidget,
  StickyWidget,
  type TripSummary,
  type PhotoSummary,
  type MapLoc,
} from "@/components/widget-content";

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 880;
const STICKY_COLOR_CYCLE = ["yellow", "pink", "blue", "green"];

type Widget = {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  zIndex: number;
  color: string | null;
  content: string | null;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function WidgetBoard({
  initialWidgets,
  trips,
  recentPhotos,
  mapLocations,
}: {
  initialWidgets: Widget[];
  trips: TripSummary[];
  recentPhotos: PhotoSummary[];
  mapLocations: MapLoc[];
}) {
  const [widgets, setWidgets] = useState(initialWidgets);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragState = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    zIndex: number;
  } | null>(null);

  function updateLocal(id: string, patch: Partial<Widget>) {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    );
  }

  function persist(id: string, patch: Record<string, unknown>) {
    fetch(`/api/widgets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }

  function handlePointerDown(e: React.PointerEvent, widget: Widget) {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const maxZ = widgets.reduce((m, w) => Math.max(m, w.zIndex), 1);
    const newZ = maxZ + 1;
    dragState.current = {
      id: widget.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: widget.x,
      startY: widget.y,
      currentX: widget.x,
      currentY: widget.y,
      zIndex: newZ,
    };
    setDraggingId(widget.id);
    updateLocal(widget.id, { zIndex: newZ });
  }

  function handlePointerMove(e: React.PointerEvent, widget: Widget) {
    const drag = dragState.current;
    if (!drag || drag.id !== widget.id) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    const maxX = 100 - (widget.w / CANVAS_WIDTH) * 100;
    const maxY = 100 - (widget.h / CANVAS_HEIGHT) * 100;
    const nextX = clamp(drag.startX + (dx / CANVAS_WIDTH) * 100, 0, maxX);
    const nextY = clamp(drag.startY + (dy / CANVAS_HEIGHT) * 100, 0, maxY);
    drag.currentX = nextX;
    drag.currentY = nextY;
    updateLocal(widget.id, { x: nextX, y: nextY });
  }

  function handlePointerUp(e: React.PointerEvent, widget: Widget) {
    const drag = dragState.current;
    if (!drag || drag.id !== widget.id) return;
    dragState.current = null;
    setDraggingId(null);
    persist(drag.id, { x: drag.currentX, y: drag.currentY, zIndex: drag.zIndex });
  }

  async function addStickyNote() {
    const color =
      STICKY_COLOR_CYCLE[Math.floor(Math.random() * STICKY_COLOR_CYCLE.length)];
    const res = await fetch("/api/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "sticky",
        x: 10 + Math.random() * 55,
        y: 10 + Math.random() * 55,
        color,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setWidgets((prev) => [...prev, data.widget]);
    }
  }

  function removeSticky(id: string) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    fetch(`/api/widgets/${id}`, { method: "DELETE" }).catch(() => {});
  }

  function saveContent(id: string, content: string) {
    updateLocal(id, { content });
    persist(id, { content });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your board</h1>
        <button
          type="button"
          onClick={addStickyNote}
          className="rounded-xl border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
        >
          + Sticky note
        </button>
      </div>

      <div className="overflow-auto rounded-2xl">
        <div
          className="relative"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        >
          <div className="pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/15" />
          <div className="pointer-events-none absolute top-56 right-0 h-72 w-72 rounded-full bg-fuchsia-300/25 blur-3xl dark:bg-fuchsia-500/15" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-400/15" />

          {widgets.map((widget) => (
            <div
              key={widget.id}
              onPointerDown={(e) => handlePointerDown(e, widget)}
              onPointerMove={(e) => handlePointerMove(e, widget)}
              onPointerUp={(e) => handlePointerUp(e, widget)}
              onPointerCancel={(e) => handlePointerUp(e, widget)}
              className="absolute touch-none select-none"
              style={{
                left: `${widget.x}%`,
                top: `${widget.y}%`,
                width: widget.w,
                height: widget.h,
                zIndex: widget.zIndex,
                transform: `rotate(${widget.rotation}deg) scale(${
                  draggingId === widget.id ? 1.05 : 1
                })`,
                transition:
                  draggingId === widget.id
                    ? "none"
                    : "transform 0.2s ease, box-shadow 0.2s ease",
                filter:
                  draggingId === widget.id
                    ? "drop-shadow(0 20px 25px rgb(0 0 0 / 0.25))"
                    : "drop-shadow(0 4px 8px rgb(0 0 0 / 0.12))",
              }}
            >
              {widget.type === "trips" && <TripsWidget trips={trips} />}
              {widget.type === "clock" && <ClockWidget />}
              {widget.type === "photos" && (
                <PhotosWidget photos={recentPhotos} />
              )}
              {widget.type === "map" && (
                <MapWidget locations={mapLocations} />
              )}
              {widget.type === "notes" && (
                <NotesWidget
                  content={widget.content ?? ""}
                  onSave={(value) => saveContent(widget.id, value)}
                />
              )}
              {widget.type === "sticky" && (
                <StickyWidget
                  color={widget.color ?? "yellow"}
                  content={widget.content ?? ""}
                  onSave={(value) => saveContent(widget.id, value)}
                  onRemove={() => removeSticky(widget.id)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
