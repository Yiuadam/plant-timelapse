import type { LandmarkKey } from "@/lib/city-landmarks";

// Minimal line-art silhouettes for a curated set of famous tourist-city
// landmarks -- same drawing convention as the generic LandmarkIcon in
// passport-stamp.tsx (stroke only, no fill, centered around the same
// translate(50 34) anchor so they sit identically inside the stamp ring),
// just specific to a real building/monument instead of an abstract shape.
export function CuratedLandmarkIcon({
  landmarkKey,
  ink,
}: {
  landmarkKey: LandmarkKey;
  ink: string;
}) {
  const common = { stroke: ink, strokeWidth: 1.6, strokeLinecap: "round" as const, fill: "none" };

  switch (landmarkKey) {
    case "eiffel-tower":
      return (
        <g transform="translate(50 34)">
          <path
            d="M0 -18 L0 -14 M-9 14 L-1 -14 L1 -14 L9 14 M-6 7 L6 7 M-3 -3 L3 -3"
            {...common}
          />
        </g>
      );
    case "big-ben":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-5 14 L-5 -6 L5 -6 L5 14 M-5 -6 L-5 -10 L5 -10 L5 -6 M0 -10 L0 -16 M-2 -16 L2 -16"
            {...common}
          />
          <circle cx="0" cy="-8" r="2.2" {...common} />
        </g>
      );
    case "statue-of-liberty":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-4 14 L-4 -2 C -4 -8 4 -8 4 -2 L4 14 M4 -6 L8 -12 L8 -15 M6 -15 L10 -15 M-3 -8 L-1 -12 L1 -8 L3 -12"
            {...common}
          />
        </g>
      );
    case "golden-gate-bridge":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-11 6 L11 6 M-8 6 L-8 -13 M8 6 L8 -13 M-8 -13 L-8 -15 M8 -13 L8 -15 M-8 -6 C -8 -10 8 -10 8 -6 M-11 6 L-11 9 M11 6 L11 9"
            {...common}
          />
        </g>
      );
    case "colosseum":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 8 C -12 -6 12 -6 12 8 M-8 8 L-8 2 M-4 8 L-4 0 M0 8 L0 -1 M4 8 L4 0 M8 8 L8 2 M-12 8 L12 8"
            {...common}
          />
        </g>
      );
    case "sagrada-familia":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-8 14 L-8 -6 L-5 -14 L-2 -6 L-2 14 M2 14 L2 -8 L5 -16 L8 -8 L8 14"
            {...common}
          />
        </g>
      );
    case "great-wall":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-14 8 L-8 2 L-8 -2 L-5 -2 L-5 -5 L-2 -5 L-2 -2 L2 -2 L2 -5 L5 -5 L5 -2 L8 -2 L8 2 L14 8"
            {...common}
          />
        </g>
      );
    case "tokyo-tower":
      return (
        <g transform="translate(50 34)">
          <path
            d="M0 -16 L0 -12 M-7 14 L-2 -12 L2 -12 L7 14 M-5 6 L5 6 M-3 0 L3 0"
            {...common}
          />
        </g>
      );
    case "oriental-pearl-tower":
      return (
        <g transform="translate(50 34)">
          <path
            d="M0 14 L0 -14 M-4 14 L4 14 M-6 6 C -6 2 6 2 6 6 C 6 10 -6 10 -6 6 M-3 -6 C -3 -9 3 -9 3 -6 C 3 -3 -3 -3 -3 -6"
            {...common}
          />
        </g>
      );
    case "marina-bay-sands":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-8 14 L-8 -8 M0 14 L0 -10 M8 14 L8 -8 M-10 -8 C -10 -13 10 -13 10 -8"
            {...common}
          />
        </g>
      );
    case "sydney-opera-house":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 8 L12 8 M-9 8 C -9 -2 -3 -8 1 -3 C -3 0 -6 4 -6 8 M-1 8 C -1 -6 7 -10 9 -3 C 4 -1 1 4 1 8"
            {...common}
          />
        </g>
      );
    case "christ-the-redeemer":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 -4 L12 -4 M0 -4 L0 -14 M-2 -16 L2 -16 L2 -14 L-2 -14 Z M0 -4 L-3 14 M0 -4 L3 14 M-3 14 L3 14"
            {...common}
          />
        </g>
      );
    case "burj-khalifa":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-6 14 L-6 2 L-4 2 L-4 -6 L-2 -6 L-2 -14 L0 -14 L0 -18 M6 14 L6 2 L4 2 L4 -6 L2 -6 L2 -14 L0 -14"
            {...common}
          />
        </g>
      );
    case "pyramids-of-giza":
      return (
        <g transform="translate(50 34)">
          <path d="M-12 8 L-5 -8 L2 8 Z M-1 8 L5 -3 L11 8 Z" {...common} />
          <circle cx="8" cy="-10" r="2" {...common} />
        </g>
      );
    case "brandenburg-gate":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-10 14 L-10 -6 M-6 14 L-6 -6 M-2 14 L-2 -6 M2 14 L2 -6 M6 14 L6 -6 M10 14 L10 -6 M-12 -6 L12 -6 M-12 -6 L-12 -9 L12 -9 L12 -6"
            {...common}
          />
        </g>
      );
    case "parthenon":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-10 8 L-10 -4 M-6 8 L-6 -4 M-2 8 L-2 -4 M2 8 L2 -4 M6 8 L6 -4 M10 8 L10 -4 M-12 8 L12 8 M-12 -4 L0 -12 L12 -4"
            {...common}
          />
        </g>
      );
    case "hagia-sophia":
      return (
        <g transform="translate(50 34)">
          <path
            d="M0 8 C -8 8 -8 -2 0 -2 C 8 -2 8 8 0 8 M0 -2 L0 -6 M-2 -6 L2 -6 M-12 8 L-12 -10 M12 8 L12 -10 M-13 -10 L-11 -10 M11 -10 L13 -10"
            {...common}
          />
        </g>
      );
    case "saint-basils":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-9 14 L-9 2 C -9 -4 -5 -4 -5 2 L-5 14 M-2 14 L-2 -2 C -2 -10 2 -10 2 -2 L2 14 M5 14 L5 2 C 5 -4 9 -4 9 2 L9 14"
            {...common}
          />
        </g>
      );
    case "wat-arun":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-6 14 L-4 6 L-3 6 L-2 -2 L-1 -2 L0 -14 L1 -2 L2 -2 L3 6 L4 6 L6 14 Z"
            {...common}
          />
        </g>
      );
    case "taipei-101":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-5 14 L-5 10 L-6 9 L-6 5 L-5 4 L-5 0 L-6 -1 L-6 -5 L-5 -6 L-5 -10 L-3 -14 M5 14 L5 10 L6 9 L6 5 L5 4 L5 0 L6 -1 L6 -5 L5 -6 L5 -10 L3 -14"
            {...common}
          />
        </g>
      );
    case "table-mountain":
      return (
        <g transform="translate(50 34)">
          <path d="M-14 8 L-9 -6 L9 -6 L14 8 Z M-9 -6 L9 -6" {...common} />
        </g>
      );
    case "venice-canal":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-10 6 C -10 2 10 2 10 6 L8 8 L-8 8 Z M6 6 L6 -6 C 8 -6 8 -2 6 0"
            {...common}
          />
        </g>
      );
    case "amsterdam-canal-houses":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 8 L-12 -2 L-9 -6 L-6 -2 L-6 8 M-6 8 L-6 -4 L-2 -8 L2 -4 L2 8 M2 8 L2 -2 L6 -6 L10 -2 L10 8"
            {...common}
          />
        </g>
      );
    case "hong-kong-skyline":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-14 8 L-14 0 L-11 0 L-11 -4 L-8 -4 L-8 2 L-5 2 L-5 -6 L-2 -6 L-2 4 L1 4 L1 -8 L4 -8 L4 6 L7 6 L7 -2 L10 -2 L10 8"
            {...common}
          />
        </g>
      );
    case "namsan-tower":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 10 C -12 6 12 6 12 10 M0 6 L0 -10 M-3 -10 C -3 -14 3 -14 3 -10 C 3 -6 -3 -6 -3 -10"
            {...common}
          />
        </g>
      );
  }
}
