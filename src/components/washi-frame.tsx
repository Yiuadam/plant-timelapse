"use client";

import { hashSeed, mulberry32 } from "@/lib/seeded-random";

// Two strips of "washi tape" pinned at opposite corners, like a photo taped
// into a scrapbook -- angle is seeded so it's stable across re-renders but
// varies per widget.
export function WashiFrame({ seed, accent }: { seed: string; accent: string }) {
  const rand = mulberry32(hashSeed(seed));
  const angleA = -20 + rand() * 12;
  const angleB = 160 + rand() * 12;
  const tape = `repeating-linear-gradient(45deg, ${accent}55, ${accent}55 4px, ${accent}25 4px, ${accent}25 8px)`;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div
        className="absolute h-5 w-16 rounded-[2px] shadow-sm"
        style={{ top: -8, left: "12%", transform: `rotate(${angleA}deg)`, background: tape }}
      />
      <div
        className="absolute h-5 w-16 rounded-[2px] shadow-sm"
        style={{ bottom: -8, right: "12%", transform: `rotate(${angleB}deg)`, background: tape }}
      />
    </div>
  );
}
