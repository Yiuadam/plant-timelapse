"use client";

import { useEffect, useRef, useState } from "react";

export type StackCardDef = {
  key: string;
  title: string;
  content: React.ReactNode;
};

const CARD_HEIGHT = 520;
const CARD_WIDTH_RATIO = 0.82; // card width as a fraction of container width
const STEP_DEG = 42; // rotation between adjacent drum slots
const SWIPE_THRESHOLD_RATIO = 0.18;

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
  // Each card's rotation offset is tracked as a continuous, unwrapped
  // number of drum steps rather than recomputed fresh via shortestOffset()
  // every render. Re-deriving the shortest wrap-around each render means a
  // card not involved in a swap can have its offset LABEL flip sign (say
  // -1 to +1) between commits even though nothing rotated past it — that
  // discontinuity used to render as a visible swing/teleport across the
  // front. Updating each card's own offset by -delta on every go() instead
  // keeps it rotating continuously in the direction it was already
  // heading (fading out further before it can ever reappear), which is
  // both correct and matches how a real drum behaves.
  const [railOffsets, setRailOffsets] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    cards.forEach((card, index) => {
      initial[card.key] = shortestOffset(index, activeIndex, total);
    });
    return initial;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keep railOffsets in sync if the set of cards ever changes (new keys
  // get a starting offset, removed keys are dropped); a no-op on every
  // render where the card list is stable.
  useEffect(() => {
    const kickoff = setTimeout(() => {
      setRailOffsets((prev) => {
        let changed = false;
        const next: Record<string, number> = {};
        cards.forEach((card, index) => {
          if (card.key in prev) {
            next[card.key] = prev[card.key];
          } else {
            next[card.key] = shortestOffset(index, activeIndex, total);
            changed = true;
          }
        });
        if (!changed && Object.keys(prev).length === Object.keys(next).length) {
          return prev;
        }
        return next;
      });
    }, 0);
    return () => clearTimeout(kickoff);
  }, [cards, activeIndex, total]);

  function go(delta: number) {
    setActiveIndex((i) => {
      const newIndex = (i + delta + total) % total;
      // The amount every card must rotate by is whatever offset the
      // NEW front card currently holds, not `delta` — delta is only a
      // ring index step (±1, or the clicked card's own index distance),
      // while a card can have drifted arbitrarily far from ±1 after
      // several swipes in the same direction. Shifting everyone by the
      // target's own current offset always lands it exactly on 0 and
      // keeps every other card's motion physically continuous.
      setRailOffsets((prev) => {
        const targetCard = cards[newIndex];
        const rotationAmount = targetCard
          ? (prev[targetCard.key] ?? shortestOffset(newIndex, i, total))
          : delta;
        const next: Record<string, number> = {};
        for (const key in prev) next[key] = prev[key] - rotationAmount;
        return next;
      });
      return newIndex;
    });
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

  function handleCardClick(offset: number, isFront: boolean) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (!isFront) go(offset);
  }

  const width = containerWidth || 1;
  const cardWidthPx = width * CARD_WIDTH_RATIO;
  const radius = cardWidthPx / 2 / Math.tan((STEP_DEG * Math.PI) / 180 / 2);
  // Continuous drag progress in units of "drum slots" — unclamped, so the
  // drum keeps rotating for as long as the drag continues instead of
  // saturating (rotateY/translateZ never blow up the way an unbounded
  // pixel translate would, so there's nothing to clamp against).
  const progress = isDragging ? dragX / width : 0;

  return (
    <div
      ref={containerRef}
      className="relative touch-pan-y select-none overflow-hidden"
      style={{ height: CARD_HEIGHT, perspective: 1600 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
          // Pull the whole drum back by its radius so a card at rotateY(0)
          // nets back to zero depth instead of being thrust toward the
          // viewer (and magnified by perspective) by translateZ(radius)
          // below. Side cards then recede naturally as they rotate.
          transform: `translateZ(${-radius}px)`,
        }}
      >
        {cards.map((card, index) => {
          const isFront = index === activeIndex;
          const offset =
            railOffsets[card.key] ?? shortestOffset(index, activeIndex, total);
          const v = offset + progress;
          const angleDeg = v * STEP_DEG;
          const rad = (angleDeg * Math.PI) / 180;
          const facing = Math.cos(rad);
          // Cubed so opacity collapses quickly away from dead-center instead
          // of fading linearly with angle — outgoing/incoming cards mid-swap
          // otherwise stay simultaneously legible and visually overlap
          // (worse on iOS Safari, where backface culling during a live
          // rotateY is less reliable than Chromium's).
          const opacity = clamp(0.06 + 0.94 * Math.max(0, facing) ** 3, 0.06, 1);
          const depth = Math.round(facing * 1000);

          return (
            <div
              key={card.key}
              role={isFront ? undefined : "button"}
              tabIndex={isFront ? undefined : 0}
              aria-label={isFront ? undefined : `Go to ${card.title}`}
              onClick={() => handleCardClick(offset, isFront)}
              onKeyDown={(e) => {
                if (!isFront && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  go(offset);
                }
              }}
              className={`absolute top-0 left-1/2 flex h-full flex-col overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br dark:border-white/15 ${
                GLASS_TINT[card.key] ?? DEFAULT_GLASS_TINT
              } ${isFront ? "shadow-2xl" : "cursor-pointer shadow-md"}`}
              style={{
                width: cardWidthPx,
                marginLeft: -cardWidthPx / 2,
                zIndex: 100 + depth,
                opacity,
                transform: `rotateY(${angleDeg}deg) translateZ(${radius}px)`,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                pointerEvents: facing > 0.2 ? "auto" : "none",
                // Skip the blur while actively dragging: recomputing a
                // backdrop blur every frame during the gesture is the most
                // expensive case, so drop it until motion settles.
                backdropFilter: isDragging ? undefined : "blur(12px)",
                WebkitBackdropFilter: isDragging ? undefined : "blur(12px)",
                transition: isDragging
                  ? "none"
                  : "transform 300ms ease-out, opacity 300ms ease-out, box-shadow 300ms ease-out",
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
        })}
      </div>
    </div>
  );
}
