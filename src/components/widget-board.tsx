"use client";

import { useEffect, useRef, useState } from "react";
import {
  TripsWidget,
  ClockWidget,
  PhotosWidget,
  MapWidget,
  NotesWidget,
  StickyWidget,
  ACCENT_HEX,
  type TripSummary,
  type PhotoSummary,
  type MapLoc,
} from "@/components/widget-content";

const DESIGN_WIDTH = 1000;
const DESIGN_HEIGHT = 880;
const MIN_SCALE = 0.36;
const STICKY_COLOR_CYCLE = ["yellow", "pink", "blue", "green"];
const DEFAULT_COLOR_BY_TYPE: Record<string, string> = {
  trips: "violet",
  clock: "slate",
  photos: "slate",
  map: "blue",
  notes: "yellow",
  sticky: "yellow",
};

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
  style: string | null;
  content: string | null;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) || 1;
}

function mulberry32(seed: number) {
  let s = seed;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function InkSplash({ seed, accent }: { seed: string; accent: string }) {
  const rand = mulberry32(hashSeed(seed));
  const blobs = Array.from({ length: 9 }).map((_, i) => {
    const angle = (i / 9) * Math.PI * 2 + rand() * 0.5;
    const radius = 44 + rand() * 12;
    const size = 10 + rand() * 22;
    return {
      left: 50 + Math.cos(angle) * radius,
      top: 50 + Math.sin(angle) * radius,
      size,
      opacity: 0.3 + rand() * 0.35,
      radius: `${40 + rand() * 30}% ${40 + rand() * 30}% ${
        40 + rand() * 30
      }% ${40 + rand() * 30}% / ${40 + rand() * 30}% ${40 + rand() * 30}% ${
        40 + rand() * 30
      }% ${40 + rand() * 30}%`,
      rotate: rand() * 360,
      blur: 1 + rand() * 2,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            height: b.size,
            marginLeft: -b.size / 2,
            marginTop: -b.size / 2,
            background: accent,
            opacity: b.opacity,
            borderRadius: b.radius,
            filter: `blur(${b.blur}px)`,
            transform: `rotate(${b.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function ResizeHandle({
  scale,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  scale: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      data-no-drag
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute right-0 bottom-0 flex h-5 w-5 cursor-nwse-resize items-center justify-center text-black/40 dark:text-white/40"
      style={{ transform: `scale(${1 / scale})`, transformOrigin: "bottom right" }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M10 2L2 10M10 6L6 10M10 10L10 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function StyleToggle({
  active,
  scale,
  onToggle,
}: {
  active: boolean;
  scale: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-no-drag
      onClick={onToggle}
      aria-label={active ? "Use clean style" : "Use ink-splash style"}
      aria-pressed={active}
      className={`absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm ${
        active
          ? "border-black/20 bg-black/80 text-white dark:border-white/30 dark:bg-white/80 dark:text-black"
          : "border-black/10 bg-white/80 text-black/50 dark:border-white/20 dark:bg-black/40 dark:text-white/60"
      }`}
      style={{ transform: `scale(${1 / scale})`, transformOrigin: "top left" }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 21c-1.1 0-2-.9-2-2 0-.4.1-.7.3-1L9 12l6-6 3 3-6 6-6.3 3.7c-.3.2-.7.3-1 .3zM14.5 4.5l3-3a1 1 0 0 1 1.4 0l2.6 2.6a1 1 0 0 1 0 1.4l-3 3-4-4z" />
      </svg>
    </button>
  );
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(DESIGN_WIDTH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = clamp(containerWidth / DESIGN_WIDTH, MIN_SCALE, 1);
  const canvasHeight = DESIGN_HEIGHT * scale;

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
    const maxX = 100 - (widget.w / DESIGN_WIDTH) * 100;
    const maxY = 100 - (widget.h / DESIGN_HEIGHT) * 100;
    const nextX = clamp(drag.startX + (dx / containerWidth) * 100, 0, maxX);
    const nextY = clamp(drag.startY + (dy / canvasHeight) * 100, 0, maxY);
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

  const [resizingId, setResizingId] = useState<string | null>(null);
  const resizeState = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
    currentW: number;
    currentH: number;
  } | null>(null);

  function handleResizeDown(e: React.PointerEvent, widget: Widget) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeState.current = {
      id: widget.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW: widget.w,
      startH: widget.h,
      currentW: widget.w,
      currentH: widget.h,
    };
    setResizingId(widget.id);
  }

  function handleResizeMove(e: React.PointerEvent, widget: Widget) {
    const rs = resizeState.current;
    if (!rs || rs.id !== widget.id) return;
    const dx = (e.clientX - rs.startClientX) / scale;
    const dy = (e.clientY - rs.startClientY) / scale;
    const nextW = clamp(rs.startW + dx, 120, 480);
    const nextH = clamp(rs.startH + dy, 100, 480);
    rs.currentW = nextW;
    rs.currentH = nextH;
    updateLocal(widget.id, { w: nextW, h: nextH });
  }

  function handleResizeUp(e: React.PointerEvent, widget: Widget) {
    const rs = resizeState.current;
    if (!rs || rs.id !== widget.id) return;
    resizeState.current = null;
    setResizingId(null);
    persist(rs.id, { w: rs.currentW, h: rs.currentH });
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

  function saveColor(id: string, color: string) {
    updateLocal(id, { color });
    persist(id, { color });
  }

  function toggleStyle(id: string, current: string | null) {
    const next = current === "ink" ? "clean" : "ink";
    updateLocal(id, { style: next });
    persist(id, { style: next });
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

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl"
        style={{ height: canvasHeight }}
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
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              className="relative h-full w-full"
              style={{
                transform: `rotate(${widget.rotation}deg) scale(${
                  draggingId === widget.id ? 1.05 : 1
                })`,
                transformOrigin: "center",
                transition:
                  draggingId === widget.id || resizingId === widget.id
                    ? "none"
                    : "transform 0.2s ease, box-shadow 0.2s ease",
                filter:
                  draggingId === widget.id
                    ? "drop-shadow(0 20px 25px rgb(0 0 0 / 0.25))"
                    : "drop-shadow(0 4px 8px rgb(0 0 0 / 0.12))",
              }}
            >
              {widget.style === "ink" && (
                <InkSplash
                  seed={widget.id}
                  accent={
                    ACCENT_HEX[
                      widget.color ?? DEFAULT_COLOR_BY_TYPE[widget.type]
                    ] ?? ACCENT_HEX.slate
                  }
                />
              )}
              {widget.type === "trips" && (
                <TripsWidget
                  trips={trips}
                  color={widget.color ?? "violet"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                />
              )}
              {widget.type === "clock" && (
                <ClockWidget
                  color={widget.color ?? "slate"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                />
              )}
              {widget.type === "photos" && (
                <PhotosWidget
                  photos={recentPhotos}
                  color={widget.color ?? "slate"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                />
              )}
              {widget.type === "map" && (
                <MapWidget
                  locations={mapLocations}
                  color={widget.color ?? "blue"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                />
              )}
              {widget.type === "notes" && (
                <NotesWidget
                  content={widget.content ?? ""}
                  color={widget.color ?? "yellow"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  onSave={(value) => saveContent(widget.id, value)}
                />
              )}
              {widget.type === "sticky" && (
                <StickyWidget
                  color={widget.color ?? "yellow"}
                  content={widget.content ?? ""}
                  onSave={(value) => saveContent(widget.id, value)}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  onRemove={() => removeSticky(widget.id)}
                />
              )}
              <StyleToggle
                active={widget.style === "ink"}
                scale={scale}
                onToggle={() => toggleStyle(widget.id, widget.style)}
              />
              <ResizeHandle
                scale={scale}
                onPointerDown={(e) => handleResizeDown(e, widget)}
                onPointerMove={(e) => handleResizeMove(e, widget)}
                onPointerUp={(e) => handleResizeUp(e, widget)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
