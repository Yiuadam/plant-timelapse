"use client";

import { useEffect, useRef, useState } from "react";

export type StackCardDef = {
  key: string;
  title: string;
  content: React.ReactNode;
};

const CARD_HEIGHT = 520;
const PEEK = 8; // % of container width visible as a peek on each side
const FRONT_WIDTH = 100 - 2 * PEEK;
const SWIPE_THRESHOLD_RATIO = 0.18;
const SIDE_ROTATE_DEG = 32; // 3D tilt applied to the peeking side cards
const SIDE_SCALE = 0.88;
const MAX_DRAG_PROGRESS = 1.3; // clamps drag-follow so it can never run away/twitch

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// Low-saturation glass tints per card, keyed by card.key.
const GLASS_TINT: Record<string, string> = {
  places: "from-sky-200/50 to-sky-100/10 dark:from-sky-400/20 dark:to-sky-300/5",
  wishlist:
    "from-amber-200/50 to-amber-100/10 dark:from-amber-400/20 dark:to-amber-300/5",
  photos:
    "from-fuchsia-200/50 to-fuchsia-100/10 dark:from-fuchsia-400/20 dark:to-fuchsia-300/5",
};
const DEFAULT_GLASS_TINT = "from-white/40 to-white/10 dark:from-white/10 dark:to-white/5";

function shortestOffset(index: number, activeIndex: number, total: number) {
  let diff = (index - activeIndex + total) % total;
  if (diff > total / 2) diff -= total;
  return diff;
}

export default function StackedCards({ cards }: { cards: StackCardDef[] }) {
  const total = cards.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    dragging: boolean;
  } | null>(null);
  const justDraggedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function go(delta: number) {
    setActiveIndex((i) => (i + delta + total) % total);
  }

  function handlePointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement;
    if (
      target.closest(
        "input, textarea, select, button, a, label, .leaflet-container",
      )
    )
      return;
    dragState.current = { pointerId: e.pointerId, startX: e.clientX, dragging: false };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const state = dragState.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const delta = e.clientX - state.startX;
    if (!state.dragging && Math.abs(delta) > 8) {
      state.dragging = true;
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (state.dragging) setDragX(delta);
  }

  function handlePointerUp(e: React.PointerEvent) {
    const state = dragState.current;
    if (!state || state.pointerId !== e.pointerId) return;
    if (state.dragging) {
      // A browser still fires a synthetic click on mouseup after a drag;
      // suppress the next click so it doesn't re-trigger card navigation.
      justDraggedRef.current = true;
      const width = containerRef.current?.offsetWidth ?? 1;
      const threshold = width * SWIPE_THRESHOLD_RATIO;
      if (dragX <= -threshold) go(1);
      else if (dragX >= threshold) go(-1);
    }
    dragState.current = null;
    setIsDragging(false);
    setDragX(0);
  }

  function handleCardClick(offset: number, isFront: boolean, isVisible: boolean) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (!isFront && isVisible) go(offset);
  }

  return (
    <div
      ref={containerRef}
      className="relative touch-pan-y select-none overflow-hidden"
      style={{ height: CARD_HEIGHT, perspective: 1400 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {(() => {
        const width = containerWidth || 1;
        const rawProgress = isDragging ? dragX / width : 0;
        const clampedProgress = clamp(
          rawProgress,
          -MAX_DRAG_PROGRESS,
          MAX_DRAG_PROGRESS,
        );
        // Uniform pixel shift applied to every card while dragging, so the
        // whole stack visually slides together (pure transform, no layout
        // thrashing from animating `left`).
        const deltaPx = clampedProgress * (FRONT_WIDTH / 100) * width;

        return cards.map((card, index) => {
          const offset = shortestOffset(index, activeIndex, total);
          const isFront = offset === 0;
          const isVisible = Math.abs(offset) <= 1;

          let leftPercent: number;
          if (offset === 0) leftPercent = PEEK;
          else if (offset < 0) leftPercent = PEEK - FRONT_WIDTH;
          else leftPercent = 100 - PEEK;

          // Virtual offset: continuously interpolates this card's
          // rotation/scale toward the neighboring slot as the drag
          // progresses, instead of snapping between two fixed states.
          const v = offset + clampedProgress;
          const vSat = clamp(v, -1, 1);
          const rotateDeg = vSat * SIDE_ROTATE_DEG;
          const scale = 1 - Math.abs(vSat) * (1 - SIDE_SCALE);
          const transformOrigin =
            v < -1e-6 ? "right center" : v > 1e-6 ? "left center" : "center center";
          const transform = `translateX(${deltaPx}px) rotateY(${rotateDeg}deg) scale(${scale})`;

          return (
          <div
            key={card.key}
            role={isFront ? undefined : "button"}
            tabIndex={isFront || !isVisible ? undefined : 0}
            aria-label={isFront ? undefined : `Go to ${card.title}`}
            onClick={() => handleCardClick(offset, isFront, isVisible)}
            onKeyDown={(e) => {
              if (!isFront && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                go(offset);
              }
            }}
            className={`absolute inset-y-0 flex flex-col overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br dark:border-white/15 ${
              GLASS_TINT[card.key] ?? DEFAULT_GLASS_TINT
            } ${isFront ? "shadow-2xl" : "cursor-pointer shadow-md"} ${
              isVisible ? "" : "invisible"
            }`}
            style={{
              left: `${leftPercent}%`,
              width: `${FRONT_WIDTH}%`,
              zIndex: isFront ? 10 : 5,
              transform,
              transformOrigin,
              transformStyle: "preserve-3d",
              // Skip the blur while actively dragging: recomputing a
              // backdrop blur every frame during the gesture is the most
              // expensive case, so drop it until motion settles.
              backdropFilter: isDragging ? undefined : "blur(12px)",
              WebkitBackdropFilter: isDragging ? undefined : "blur(12px)",
              transition: isDragging
                ? "none"
                : "left 300ms ease-out, transform 300ms ease-out, box-shadow 300ms ease-out",
            }}
          >
            <div
              className={`flex h-12 shrink-0 items-center justify-between border-b px-5 font-medium ${
                isFront
                  ? "border-white/40 dark:border-white/10"
                  : "border-transparent"
              }`}
            >
              <span>{card.title}</span>
              {!isFront && (
                <span className="text-xs text-black/40 dark:text-white/40">
                  Tap to open
                </span>
              )}
            </div>
            <div
              className={`flex-1 overflow-y-auto px-5 pb-5 ${
                isFront ? "" : "invisible"
              }`}
            >
              {card.content}
            </div>
          </div>
          );
        });
      })()}
    </div>
  );
}
