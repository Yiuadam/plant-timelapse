"use client";

import { useRef, useState } from "react";

export type StackCardDef = {
  key: string;
  title: string;
  content: React.ReactNode;
};

const CARD_HEIGHT = 520;
const PEEK = 8; // % of container width visible as a peek on each side
const FRONT_WIDTH = 100 - 2 * PEEK;
const SWIPE_THRESHOLD_RATIO = 0.18;

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

  function go(delta: number) {
    setActiveIndex((i) => (i + delta + total) % total);
  }

  function handlePointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, button, a, label")) return;
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
      style={{ height: CARD_HEIGHT }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {cards.map((card, index) => {
        const offset = shortestOffset(index, activeIndex, total);
        const isFront = offset === 0;
        const isVisible = Math.abs(offset) <= 1;

        let leftPercent: number;
        if (offset === 0) leftPercent = PEEK;
        else if (offset < 0) leftPercent = PEEK - FRONT_WIDTH;
        else leftPercent = 100 - PEEK;

        const dragPx = isDragging ? dragX : 0;

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
            className={`absolute inset-y-0 flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-background dark:border-white/10 ${
              isFront ? "shadow-2xl" : "cursor-pointer shadow-md"
            } ${isVisible ? "" : "invisible"}`}
            style={{
              left: `${leftPercent}%`,
              width: `${FRONT_WIDTH}%`,
              zIndex: isFront ? 10 : 5,
              transform: `translateX(${dragPx}px)`,
              transition: isDragging
                ? "none"
                : "left 300ms ease-out, transform 300ms ease-out, box-shadow 300ms ease-out",
            }}
          >
            <div
              className={`flex h-12 shrink-0 items-center justify-between border-b px-5 font-medium ${
                isFront
                  ? "border-black/10 dark:border-white/10"
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
  );
}
