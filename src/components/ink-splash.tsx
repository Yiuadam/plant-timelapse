"use client";

import { hashSeed, mulberry32 } from "@/lib/seeded-random";

export function InkSplash({ seed, accent }: { seed: string; accent: string }) {
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
