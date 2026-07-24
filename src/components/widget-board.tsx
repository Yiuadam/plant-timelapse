"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { InkSplash } from "@/components/ink-splash";
import { WIDGET_LIBRARY } from "@/lib/default-widgets";

const DESIGN_WIDTH = 1000;
const DESIGN_HEIGHT = 880;
// On phones the board scales against a narrower reference width than the
// desktop 1000px canvas, so widget text/controls land near their natural
// size instead of shrinking to ~0.35x (unreadable) alongside the layout.
const MOBILE_DESIGN_WIDTH = 460;
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

function AddWidgetMenu({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-xl border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
      >
        + Add widget
      </button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 flex w-44 flex-col gap-1 rounded-xl border border-black/10 bg-white p-2 shadow-lg dark:border-white/20 dark:bg-neutral-800">
          {Object.entries(WIDGET_LIBRARY).map(([type, def]) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onAdd(type);
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {def.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
  const router = useRouter();
  const [widgets, setWidgets] = useState(initialWidgets);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(DESIGN_WIDTH);
  const [containerTop, setContainerTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
      setContainerTop(el.getBoundingClientRect().top);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function update() {
      setViewportHeight(window.innerHeight);
      if (containerRef.current) {
        setContainerTop(containerRef.current.getBoundingClientRect().top);
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile = containerWidth > 0 && containerWidth < 640;
  const scale = clamp(
    containerWidth / (isMobile ? MOBILE_DESIGN_WIDTH : DESIGN_WIDTH),
    MIN_SCALE,
    1,
  );
  const fillHeight = Math.max(0, viewportHeight - containerTop - 24);
  const canvasHeight = isMobile
    ? Math.max(DESIGN_HEIGHT * scale, fillHeight)
    : DESIGN_HEIGHT * scale;

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

  function persist(id: string, patch: Record<string, unknown>, isRetry = false) {
    // keepalive so an in-flight save isn't cancelled by an immediate
    // navigation/tab-close right after a drag or resize ends.
    fetch(`/api/widgets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok && !isRetry) persist(id, patch, true);
      })
      .catch(() => {
        // One retry covers a transient network blip; a repeat failure means
        // the layout change is genuinely lost, which is better surfaced by
        // a stale reload than by retrying forever.
        if (!isRetry) persist(id, patch, true);
      });
  }

  function handlePointerDown(e: React.PointerEvent, widget: Widget) {
    if (
      (e.target as HTMLElement).closest("[data-no-drag], .leaflet-container")
    )
      return;
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

  async function addWidget(type: string) {
    const color =
      type === "sticky"
        ? STICKY_COLOR_CYCLE[
            Math.floor(Math.random() * STICKY_COLOR_CYCLE.length)
          ]
        : undefined;
    const res = await fetch("/api/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        x: 10 + Math.random() * 55,
        y: 10 + Math.random() * 55,
        ...(color ? { color } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setWidgets((prev) => [...prev, data.widget]);
    }
  }

  function removeWidget(id: string) {
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
        <AddWidgetMenu onAdd={addWidget} />
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
                  style={widget.style ?? "clean"}
                  onStyleChange={() => toggleStyle(widget.id, widget.style)}
                  onRemove={() => removeWidget(widget.id)}
                />
              )}
              {widget.type === "clock" && (
                <ClockWidget
                  color={widget.color ?? "slate"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={() => toggleStyle(widget.id, widget.style)}
                  onRemove={() => removeWidget(widget.id)}
                />
              )}
              {widget.type === "photos" && (
                <PhotosWidget
                  photos={recentPhotos}
                  color={widget.color ?? "slate"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={() => toggleStyle(widget.id, widget.style)}
                  onRemove={() => removeWidget(widget.id)}
                  trips={trips}
                  onUploaded={() => router.refresh()}
                />
              )}
              {widget.type === "map" && (
                <MapWidget
                  locations={mapLocations}
                  color={widget.color ?? "blue"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={() => toggleStyle(widget.id, widget.style)}
                  onRemove={() => removeWidget(widget.id)}
                />
              )}
              {widget.type === "notes" && (
                <NotesWidget
                  content={widget.content ?? ""}
                  color={widget.color ?? "yellow"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={() => toggleStyle(widget.id, widget.style)}
                  onRemove={() => removeWidget(widget.id)}
                  onSave={(value) => saveContent(widget.id, value)}
                />
              )}
              {widget.type === "sticky" && (
                <StickyWidget
                  color={widget.color ?? "yellow"}
                  content={widget.content ?? ""}
                  onSave={(value) => saveContent(widget.id, value)}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={() => toggleStyle(widget.id, widget.style)}
                  onRemove={() => removeWidget(widget.id)}
                />
              )}
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
