"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  TripsWidget,
  ClockWidget,
  PhotosWidget,
  MapWidget,
  NotesWidget,
  StickyWidget,
  TravelWidget,
  PassportWidget,
  ACCENT_HEX,
  type TripSummary,
  type PhotoSummary,
  type MapLoc,
  type TravelSummary,
  type PassportStampSummary,
} from "@/components/widget-content";
import { InkSplash } from "@/components/ink-splash";
import { SketchBorder } from "@/components/sketch-border";
import { WashiFrame } from "@/components/washi-frame";
import { WIDGET_LIBRARY } from "@/lib/default-widgets";
import { useLanguage } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionary";

const DESIGN_WIDTH = 1000;
const DESIGN_HEIGHT = 880;
// On phones the board scales against a narrower reference width than the
// desktop 1000px canvas, so widget text/controls land at (or above) their
// full native size — scale is clamped to a max of 1 below, so this just
// controls how quickly mobile hits that ceiling — instead of shrinking
// proportionally with the layout the way the desktop 1000px canvas does.
const MOBILE_DESIGN_WIDTH = 320;
const MIN_SCALE = 0.36;
const STICKY_COLOR_CYCLE = ["yellow", "pink", "blue", "green"];
const DEFAULT_COLOR_BY_TYPE: Record<string, string> = {
  trips: "violet",
  clock: "slate",
  photos: "slate",
  map: "blue",
  notes: "yellow",
  sticky: "yellow",
  travel: "blue",
  passport: "indigo",
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

function bottomOf(w: Widget) {
  return w.y + (w.h / DESIGN_HEIGHT) * 100;
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

const WIDGET_TYPE_KEYS: Record<string, DictKey> = {
  trips: "widget_trips",
  clock: "widget_clock",
  photos: "widget_photos",
  map: "widget_map",
  notes: "widget_notes",
  sticky: "widget_sticky",
  travel: "widget_travel",
  passport: "widget_passport",
};

// Short subtitle shown under each widget's name in the picker, so a card
// reads like "Trips — Your trip list" rather than just a bare label.
const WIDGET_DESCRIPTIONS: Record<string, string> = {
  trips: "Your trip list",
  clock: "Local time",
  photos: "Recent photos",
  map: "Pinned locations",
  notes: "Quick notes",
  sticky: "Sticky note",
  travel: "Flights & stays",
  passport: "Stamp collection",
};

const noop = () => {};
const noopAsync = () => {};

// A real, live, non-interactive instance of the widget itself -- scaled
// down and cropped to fill a fixed-size thumbnail -- rather than an
// abstract icon, so a picker card shows exactly what adding it will
// actually put on the board (real trip titles, the real ticking clock
// face, actual photos), the same way a phone's own widget gallery shows
// live previews instead of generic glyphs. pointer-events-none makes it
// purely decorative: every control the real widget renders (remove,
// color picker, etc.) is visible but inert, so the whole card's own
// button handles the "add" tap regardless of where on it you tap.
const PREVIEW_W = 168;
const PREVIEW_H = 108;

function WidgetLivePreview({
  type,
  trips,
  recentPhotos,
  mapLocations,
  travelItems,
  passportStamps,
}: {
  type: string;
  trips: TripSummary[];
  recentPhotos: PhotoSummary[];
  mapLocations: MapLoc[];
  travelItems: TravelSummary[];
  passportStamps: PassportStampSummary[];
}) {
  const def = WIDGET_LIBRARY[type];
  const naturalW = def?.w ?? 220;
  const naturalH = def?.h ?? 220;
  // Shows the whole widget, uncropped -- this needs to look exactly like
  // what lands on the dashboard, not a zoomed-in crop of it.
  const scale = Math.min(PREVIEW_W / naturalW, PREVIEW_H / naturalH);
  const color = def?.color ?? "slate";

  function renderWidget() {
    switch (type) {
      case "trips":
        return (
          <TripsWidget
            trips={trips}
            color={color}
            onColorChange={noop}
            style="clean"
            onStyleChange={noop}
            onRemove={noop}
          />
        );
      case "clock":
        return (
          <ClockWidget color={color} onColorChange={noop} style="clean" onStyleChange={noop} onRemove={noop} />
        );
      case "photos":
        return (
          <PhotosWidget
            photos={recentPhotos}
            color={color}
            onColorChange={noop}
            style="clean"
            onStyleChange={noop}
            onRemove={noop}
            trips={trips}
            onUploaded={noopAsync}
          />
        );
      case "map":
        return (
          <MapWidget
            locations={mapLocations}
            color={color}
            onColorChange={noop}
            style="clean"
            onStyleChange={noop}
            onRemove={noop}
          />
        );
      case "notes":
        return (
          <NotesWidget
            content=""
            color={color}
            onColorChange={noop}
            style="clean"
            onStyleChange={noop}
            onRemove={noop}
            onSave={noop}
          />
        );
      case "sticky":
        return (
          <StickyWidget
            color={color}
            content=""
            onSave={noop}
            onColorChange={noop}
            style="clean"
            onStyleChange={noop}
            onRemove={noop}
          />
        );
      case "travel":
        return (
          <TravelWidget
            items={travelItems}
            color={color}
            onColorChange={noop}
            style="clean"
            onStyleChange={noop}
            onRemove={noop}
          />
        );
      case "passport":
        return <PassportWidget stamps={passportStamps} style="clean" onStyleChange={noop} onRemove={noop} />;
      default:
        return null;
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black/5 dark:bg-white/5" aria-hidden>
      <div
        className="pointer-events-none absolute top-1/2 left-1/2"
        style={{
          width: naturalW,
          height: naturalH,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {renderWidget()}
      </div>
    </div>
  );
}

// A searchable widget gallery, opened from "+ Add widget" -- a full
// picker with a preview per card rather than a bare text dropdown, so
// choosing a widget looks (and works) like picking one from a phone's own
// home-screen widget gallery.
function AddWidgetModal({
  onAdd,
  trips,
  recentPhotos,
  mapLocations,
  travelItems,
  passportStamps,
}: {
  onAdd: (type: string) => void;
  trips: TripSummary[];
  recentPhotos: PhotoSummary[];
  mapLocations: MapLoc[];
  travelItems: TravelSummary[];
  passportStamps: PassportStampSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const entries = Object.entries(WIDGET_LIBRARY).filter(([type, def]) => {
    const label = WIDGET_TYPE_KEYS[type] ? t(WIDGET_TYPE_KEYS[type]) : def.label;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return (
      label.toLowerCase().includes(needle) ||
      (WIDGET_DESCRIPTIONS[type] ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
        className="rounded-xl border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
      >
        {t("dashboard_add_widget")}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-black/10 bg-white p-4 shadow-2xl sm:max-w-md sm:rounded-2xl dark:border-white/15 dark:bg-neutral-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{t("dashboard_add_widget")}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("cancel")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
              <div className="relative mb-3 shrink-0">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("dashboard_search_widgets")}
                  autoFocus
                  className="w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 py-2.5 text-sm outline-none focus:border-black/30 dark:border-white/15 dark:bg-white/[0.05] dark:focus:border-white/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-1">
                {entries.map(([type, def]) => {
                  const label = WIDGET_TYPE_KEYS[type] ? t(WIDGET_TYPE_KEYS[type]) : def.label;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        onAdd(type);
                        setOpen(false);
                      }}
                      className="flex flex-col overflow-hidden rounded-xl border border-black/10 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/15"
                    >
                      <div style={{ height: PREVIEW_H }}>
                        <WidgetLivePreview
                          type={type}
                          trips={trips}
                          recentPhotos={recentPhotos}
                          mapLocations={mapLocations}
                          travelItems={travelItems}
                          passportStamps={passportStamps}
                        />
                      </div>
                      <div className="px-2.5 py-2">
                        <div className="truncate text-sm font-medium">{label}</div>
                        <div className="truncate text-xs text-black/50 dark:text-white/50">
                          {WIDGET_DESCRIPTIONS[type] ?? ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {entries.length === 0 && (
                  <p className="col-span-2 py-6 text-center text-sm text-black/50 dark:text-white/50">
                    {t("dashboard_no_widgets_found")}
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default function WidgetBoard({
  device,
  initialWidgets,
  trips,
  recentPhotos,
  mapLocations,
  travelItems,
  passportStamps,
}: {
  device: "desktop" | "mobile";
  initialWidgets: Widget[];
  trips: TripSummary[];
  recentPhotos: PhotoSummary[];
  mapLocations: MapLoc[];
  travelItems: TravelSummary[];
  passportStamps: PassportStampSummary[];
}) {
  const router = useRouter();
  const { t } = useLanguage();
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
  // The canvas has overflow-hidden, so a mobile stack tall enough to pass
  // DESIGN_HEIGHT (e.g. several widgets vertically stacked -- see addWidget
  // below) would otherwise get silently clipped. Grow the canvas to the
  // tallest widget's bottom edge so nothing is cut off or forced to
  // overlap the widget above it.
  const contentBottom = widgets.length > 0 ? Math.max(...widgets.map(bottomOf)) : 0;
  const canvasHeight = isMobile
    ? Math.max(DESIGN_HEIGHT * scale, fillHeight, (contentBottom / 100) * DESIGN_HEIGHT * scale + 24)
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
        if (!res.ok && !isRetry) {
          persist(id, patch, true);
          return;
        }
        if (res.ok) {
          // Invalidates Next's client-side router cache for this route so
          // a later navigation away and back doesn't remount WidgetBoard
          // with the pre-edit snapshot (only a hard reload bypassed that
          // cache, which is why the change looked "remembered" only then).
          router.refresh();
        }
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
    // Widgets are near full-width on narrow phones, so the desktop
    // scatter-them-randomly placement stacked them almost directly on top
    // of each other. Stack new widgets vertically below the lowest one
    // instead, so the mobile board reads as a list rather than a jumble.
    const x = isMobile ? 4 : 10 + Math.random() * 55;
    // Not capped to keep it on one screen -- the canvas itself grows to
    // fit (see contentBottom above), so a long stack just makes the board
    // taller and scrollable instead of overlapping to squeeze in.
    const y = isMobile
      ? widgets.length === 0
        ? 4
        : Math.max(...widgets.map(bottomOf)) + 3
      : 10 + Math.random() * 55;
    const res = await fetch("/api/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        device,
        x,
        y,
        ...(color ? { color } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setWidgets((prev) => [...prev, data.widget]);
      router.refresh();
    }
  }

  // Re-lays-out every widget with no overlaps, as a shelf bin-pack --
  // widgets sorted tallest first, placed left to right until one would run
  // past the canvas width, then wrapping to a new row below the tallest
  // item so far. Same algorithm for both devices: x/y are always
  // percentages of a fixed logical canvas (DESIGN_WIDTH x DESIGN_HEIGHT
  // for desktop, MOBILE_DESIGN_WIDTH x DESIGN_HEIGHT for mobile -- see the
  // MOBILE_DESIGN_WIDTH comment above), so packing within that same
  // reference width is what actually fills the visible board on either
  // device instead of lining widgets up in a single column.
  //
  // Widgets are only shrunk as much as needed to (a) fit within
  // DESIGN_HEIGHT and (b) actually achieve more than one column somewhere
  // -- not an unconditional flat cut. A mild single shrink pass often
  // still leaves every widget too wide to share a row on the narrow
  // mobile reference width, which read as "tidy just makes things smaller
  // without ever reordering them"; checking for real multi-column packing
  // (not just vertical fit) and continuing to shrink until it's achieved
  // fixes that. Pressing tidy again on a board that already fits *and*
  // already has multiple widgets per row is then a no-op resize-wise --
  // just a re-sort/reposition -- fixing the "shrinks a little more every
  // time it's pressed" bug.
  function packWidgets(sizes: Map<string, { w: number; h: number }>, referenceWidth: number, margin: number) {
    const sorted = [...widgets].sort((a, b) => {
      const sa = sizes.get(a.id)!;
      const sb = sizes.get(b.id)!;
      return sb.h - sa.h || sb.w - sa.w;
    });
    let shelfX = margin;
    let shelfY = margin;
    let shelfHeight = 0;
    const placed = new Map<string, { x: number; y: number }>();
    for (const w of sorted) {
      const size = sizes.get(w.id)!;
      if (shelfX > margin && shelfX + size.w > referenceWidth - margin) {
        shelfY += shelfHeight + margin;
        shelfX = margin;
        shelfHeight = 0;
      }
      placed.set(w.id, { x: shelfX, y: shelfY });
      shelfX += size.w + margin;
      shelfHeight = Math.max(shelfHeight, size.h);
    }
    const rowCounts = new Map<number, number>();
    for (const p of placed.values()) rowCounts.set(p.y, (rowCounts.get(p.y) ?? 0) + 1);
    const multiColumn = [...rowCounts.values()].some((count) => count > 1);
    return { placed, totalHeight: shelfY + shelfHeight + margin, multiColumn };
  }

  function tidyUp() {
    const referenceWidth = isMobile ? MOBILE_DESIGN_WIDTH : DESIGN_WIDTH;
    const margin = isMobile ? 6 : 16;

    let sizes = new Map(widgets.map((w) => [w.id, { w: w.w, h: w.h }]));
    let { placed, totalHeight, multiColumn } = packWidgets(sizes, referenceWidth, margin);

    const needsWork = () =>
      totalHeight > DESIGN_HEIGHT || (!multiColumn && widgets.length > 1);
    for (let i = 0; i < 14 && needsWork(); i++) {
      const factor = 0.88 ** (i + 1);
      const nextSizes = new Map(
        widgets.map((w) => [
          w.id,
          { w: clamp(Math.round(w.w * factor), 120, 480), h: clamp(Math.round(w.h * factor), 100, 480) },
        ]),
      );
      // Every widget is already at its minimum size and still can't share
      // a row -- further iterations would be identical, so stop instead
      // of spinning for no effect.
      const atFloor = [...nextSizes.values()].every((s) => s.w <= 120 && s.h <= 100);
      const prevAtFloor = [...sizes.values()].every((s) => s.w <= 120 && s.h <= 100);
      if (atFloor && prevAtFloor) break;
      sizes = nextSizes;
      ({ placed, totalHeight, multiColumn } = packWidgets(sizes, referenceWidth, margin));
    }

    const next = widgets.map((w) => {
      const p = placed.get(w.id);
      const size = sizes.get(w.id)!;
      if (!p) return { ...w, ...size };
      return {
        ...w,
        x: (p.x / referenceWidth) * 100,
        y: (p.y / DESIGN_HEIGHT) * 100,
        w: size.w,
        h: size.h,
      };
    });
    setWidgets(next);
    next.forEach((w) => persist(w.id, { x: w.x, y: w.y, w: w.w, h: w.h }));
  }

  function removeWidget(id: string) {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    fetch(`/api/widgets/${id}`, { method: "DELETE" })
      .then(() => router.refresh())
      .catch(() => {});
  }

  function saveContent(id: string, content: string) {
    updateLocal(id, { content });
    persist(id, { content });
  }

  function saveColor(id: string, color: string) {
    updateLocal(id, { color });
    persist(id, { color });
  }

  function setWidgetStyle(id: string, style: string) {
    updateLocal(id, { style });
    persist(id, { style });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("dashboard_title")}</h1>
        <div className="flex items-center gap-2">
          {widgets.length > 1 && (
            <button
              type="button"
              onClick={tidyUp}
              className="rounded-xl border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
            >
              {t("dashboard_tidy_up")}
            </button>
          )}
          <AddWidgetModal
            onAdd={addWidget}
            trips={trips}
            recentPhotos={recentPhotos}
            mapLocations={mapLocations}
            travelItems={travelItems}
            passportStamps={passportStamps}
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative isolate overflow-hidden rounded-2xl"
        style={{ height: canvasHeight }}
      >
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
              {(() => {
                if (widget.style !== "ink" && widget.style !== "sketch" && widget.style !== "frame") {
                  return null;
                }
                const accent =
                  ACCENT_HEX[widget.color ?? DEFAULT_COLOR_BY_TYPE[widget.type]] ??
                  ACCENT_HEX.slate;
                if (widget.style === "sketch") {
                  return <SketchBorder seed={widget.id} accent={accent} />;
                }
                if (widget.style === "frame") {
                  return <WashiFrame seed={widget.id} accent={accent} />;
                }
                return <InkSplash seed={widget.id} accent={accent} />;
              })()}
              {widget.type === "trips" && (
                <TripsWidget
                  trips={trips}
                  color={widget.color ?? "violet"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={(style) => setWidgetStyle(widget.id, style)}
                  onRemove={() => removeWidget(widget.id)}
                />
              )}
              {widget.type === "clock" && (
                <ClockWidget
                  color={widget.color ?? "slate"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={(style) => setWidgetStyle(widget.id, style)}
                  onRemove={() => removeWidget(widget.id)}
                />
              )}
              {widget.type === "photos" && (
                <PhotosWidget
                  photos={recentPhotos}
                  color={widget.color ?? "slate"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={(style) => setWidgetStyle(widget.id, style)}
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
                  onStyleChange={(style) => setWidgetStyle(widget.id, style)}
                  onRemove={() => removeWidget(widget.id)}
                />
              )}
              {widget.type === "travel" && (
                <TravelWidget
                  items={travelItems}
                  color={widget.color ?? "blue"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={(style) => setWidgetStyle(widget.id, style)}
                  onRemove={() => removeWidget(widget.id)}
                />
              )}
              {widget.type === "passport" && (
                <PassportWidget
                  stamps={passportStamps}
                  style={widget.style ?? "clean"}
                  onStyleChange={(style) => setWidgetStyle(widget.id, style)}
                  onRemove={() => removeWidget(widget.id)}
                />
              )}
              {widget.type === "notes" && (
                <NotesWidget
                  content={widget.content ?? ""}
                  color={widget.color ?? "yellow"}
                  onColorChange={(color) => saveColor(widget.id, color)}
                  style={widget.style ?? "clean"}
                  onStyleChange={(style) => setWidgetStyle(widget.id, style)}
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
                  onStyleChange={(style) => setWidgetStyle(widget.id, style)}
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
