"use client";

import { useState } from "react";

export type StackCardDef = {
  key: string;
  title: string;
  content: React.ReactNode;
};

const TAB_HEIGHT = 48;
const CARD_HEIGHT = 520;

export default function StackedCards({ cards }: { cards: StackCardDef[] }) {
  const [order, setOrder] = useState(cards.map((c) => c.key));
  const total = cards.length;

  function bringToFront(key: string) {
    setOrder((prev) =>
      prev[0] === key ? prev : [key, ...prev.filter((k) => k !== key)],
    );
  }

  return (
    <div
      className="relative"
      style={{ height: (total - 1) * TAB_HEIGHT + CARD_HEIGHT }}
    >
      {cards.map((card) => {
        const depth = order.indexOf(card.key);
        const isFront = depth === 0;
        const top = (total - 1 - depth) * TAB_HEIGHT;
        const scale = 1 - depth * 0.025;

        return (
          <div
            key={card.key}
            role={isFront ? undefined : "button"}
            tabIndex={isFront ? undefined : 0}
            aria-label={isFront ? undefined : `Bring ${card.title} to front`}
            onClick={() => bringToFront(card.key)}
            onKeyDown={(e) => {
              if (!isFront && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                bringToFront(card.key);
              }
            }}
            className={`absolute inset-x-0 flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-background transition-[top,transform,box-shadow] duration-300 ease-out dark:border-white/10 ${
              isFront ? "shadow-2xl" : "cursor-pointer shadow-md"
            }`}
            style={{
              top,
              height: CARD_HEIGHT,
              zIndex: total - depth,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
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
                isFront ? "" : "pointer-events-none"
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
