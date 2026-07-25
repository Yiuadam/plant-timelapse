import type { LandmarkKey } from "@/lib/city-landmarks";

// Line-art silhouettes for a curated set of famous tourist-city landmarks
// -- same drawing convention as the generic LandmarkIcon in
// passport-stamp.tsx (stroke only, no fill, centered around the same
// translate(50 34) anchor so they sit identically inside the stamp ring),
// just specific to a real building/monument instead of an abstract shape.
// Each carries a couple of extra identifying details (lattice bracing,
// window rows, dome count, ...) beyond a bare outline so it reads as its
// specific landmark rather than a generic tower/dome/gate silhouette.
export function CuratedLandmarkIcon({
  landmarkKey,
  ink,
}: {
  landmarkKey: LandmarkKey;
  ink: string;
}) {
  const common = { stroke: ink, strokeWidth: 1.6, strokeLinecap: "round" as const, fill: "none" };
  const fine = { stroke: ink, strokeWidth: 1, strokeLinecap: "round" as const, fill: "none" };

  switch (landmarkKey) {
    case "eiffel-tower":
      return (
        <g transform="translate(50 34)">
          <path
            d="M0 -18 L0 -14 M-9 14 L-1 -14 L1 -14 L9 14 M-11 14 L11 14 M-6.4 6 L6.4 6 M-4 -3.5 L4 -3.5 M-7.3 10 L7.3 10"
            {...common}
          />
          {/* Diagonal lattice bracing between the legs, tiered like the real structure. */}
          <path
            d="M-9 14 L-4 -3.5 M9 14 L4 -3.5 M-6.4 6 L0 -14 M6.4 6 L0 -14 M-7.3 10 L-1 -14 M7.3 10 L1 -14"
            {...fine}
          />
        </g>
      );
    case "big-ben":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-5 14 L-5 -6 L5 -6 L5 14 M-5 -6 L-5 -10 L5 -10 L5 -6 M0 -10 L0 -16 M-2.5 -16 L2.5 -16 M-2.5 -16 L-2.5 -14 M2.5 -16 L2.5 -14"
            {...common}
          />
          {/* Clock face with hands, and window slits down the tower shaft. */}
          <circle cx="0" cy="-8" r="2.4" {...common} />
          <path d="M0 -8 L0 -9.4 M0 -8 L1 -7.6" {...fine} />
          <path d="M-3 0 L-3 10 M0 0 L0 10 M3 0 L3 10" {...fine} />
        </g>
      );
    case "statue-of-liberty":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-4 14 L-4 -2 C -4 -8 4 -8 4 -2 L4 14 M4 -6 L8 -12 L8 -15 M6 -15 L10 -15 M-4 -2 L-6 2 L-4 14 M4 -2 L6 4 L4 14"
            {...common}
          />
          {/* Seven-pointed crown, and the tablet held at her side. */}
          <path
            d="M-3.5 -8 L-2.5 -12 L-1.5 -8.5 L-0.6 -12.5 L0.6 -12.5 L1.5 -8.5 L2.5 -12 L3.5 -8"
            {...common}
          />
          <path d="M-6 0 L-7.5 -1 L-7.5 3 L-6 3" {...fine} />
        </g>
      );
    case "golden-gate-bridge":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-11 6 L11 6 M-8 6 L-8 -13 M8 6 L8 -13 M-8 -13 L-8 -15 M8 -13 L8 -15 M-8 -6 C -8 -10 8 -10 8 -6 M-11 6 L-11 9 M11 6 L11 9"
            {...common}
          />
          {/* Art Deco cross-bracing on the towers, and suspension hangers along the deck. */}
          <path d="M-8 -13 L-8 -6 M8 -13 L8 -6" {...fine} />
          <path
            d="M-6.4 6 L-6.4 1.4 M-3.2 6 L-3.2 0.2 M0 6 L0 -0.2 M3.2 6 L3.2 0.2 M6.4 6 L6.4 1.4"
            {...fine}
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
          {/* A second, upper arcade ring and the ruined-wall notch on top. */}
          <path
            d="M-10 2 C -10 -8 10 -8 10 2 M-10 2 L-6 2 M-2.5 2 L2.5 2 M6 2 L10 2"
            {...fine}
          />
          <path d="M2 -6 L4 -8 L6 -6" {...fine} />
        </g>
      );
    case "sagrada-familia":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-9 14 L-9 -4 L-7 -10 L-5 -4 L-5 14 M-2 14 L-2 -8 L0 -16 L2 -8 L2 14 M5 14 L5 -4 L7 -9 L9 -4 L9 14"
            {...common}
          />
          {/* Perforated spire tips, the trademark detail of the real towers. */}
          <path d="M-7 -10 L-7 -13 M0 -16 L0 -19 M7 -9 L7 -12" {...fine} />
          <path d="M-8 -1 L-6 -1 M-1 -3 L1 -3 M6 -1 L8 -1" {...fine} />
        </g>
      );
    case "great-wall":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-14 8 L-8 2 L-8 -2 L-5 -2 L-5 -5 L-2 -5 L-2 -2 L2 -2 L2 -5 L5 -5 L5 -2 L8 -2 L8 2 L14 8"
            {...common}
          />
          {/* A corner watchtower rising out of the wall, plus a base course line. */}
          <path
            d="M2 -2 L2 -8 L4 -10 L6 -8 L6 -2 M2 -6 L6 -6"
            {...fine}
          />
          <path d="M-8 2 L8 2" {...fine} />
        </g>
      );
    case "tokyo-tower":
      return (
        <g transform="translate(50 34)">
          <path
            d="M0 -16 L0 -12 M-7 14 L-2 -12 L2 -12 L7 14 M-9 14 L9 14 M-5.2 6 L5.2 6 M-3.3 -3 L3.3 -3"
            {...common}
          />
          {/* Two observation decks (the real tower's distinguishing feature vs. the Eiffel) and lattice diagonals. */}
          <path d="M-4.2 1 L4.2 1 L3.6 3.4 L-3.6 3.4 Z M-2.4 -6.4 L2.4 -6.4 L2 -4.6 L-2 -4.6 Z" {...fine} />
          <path d="M-7 14 L-3.3 -3 M7 14 L3.3 -3" {...fine} />
        </g>
      );
    case "oriental-pearl-tower":
      return (
        <g transform="translate(50 34)">
          <path
            d="M0 14 L0 -14 M-4 14 L4 14 M-7 8 C -7 3 7 3 7 8 C 7 13 -7 13 -7 8 M-3 -6 C -3 -9.5 3 -9.5 3 -6 C 3 -2.5 -3 -2.5 -3 -6"
            {...common}
          />
          {/* Third, smaller sphere near the top and tripod support legs, both distinctive of the real tower. */}
          <path d="M-1.6 -12 C -1.6 -13.6 1.6 -13.6 1.6 -12 C 1.6 -10.4 -1.6 -10.4 -1.6 -12" {...fine} />
          <path d="M-2 14 L-6 10 M2 14 L6 10" {...fine} />
        </g>
      );
    case "marina-bay-sands":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-8 14 L-8 -8 M0 14 L0 -10 M8 14 L8 -8 M-10 -8 C -10 -13 10 -13 10 -8"
            {...common}
          />
          {/* The SkyPark platform's edge line and window banding on the towers. */}
          <path d="M-10 -8 L10 -8" {...fine} />
          <path d="M-8 0 L-8 -6 M0 -1 L0 -8 M8 0 L8 -6" {...fine} />
        </g>
      );
    case "sydney-opera-house":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 8 L12 8 M-9 8 C -9 -2 -3 -8 1 -3 C -3 0 -6 4 -6 8 M-1 8 C -1 -6 7 -10 9 -3 C 4 -1 1 4 1 8"
            {...common}
          />
          {/* A third, smaller shell layered in front -- the real roof is a cluster of overlapping sails. */}
          <path d="M-5 8 C -5 2 -1 -2 2 1 C -1 3 -3 5 -3 8" {...fine} />
        </g>
      );
    case "christ-the-redeemer":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 -4 L12 -4 M0 -4 L0 -14 M-2 -16 L2 -16 L2 -14 L-2 -14 Z M0 -4 L-3 14 M0 -4 L3 14 M-3 14 L3 14"
            {...common}
          />
          {/* Robe drape folds and the stepped pedestal it stands on. */}
          <path d="M-1.5 -4 L-2 6 M1.5 -4 L2 6" {...fine} />
          <path d="M-5 14 L5 14 M-6 16 L6 16" {...fine} />
        </g>
      );
    case "burj-khalifa":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-6 14 L-6 2 L-4 2 L-4 -6 L-2 -6 L-2 -14 L0 -14 L0 -18 M6 14 L6 2 L4 2 L4 -6 L2 -6 L2 -14 L0 -14"
            {...common}
          />
          {/* An extra mid setback and horizontal banding to sell the tiered, spiralling facade. */}
          <path d="M-6 8 L-4 8 M6 8 L4 8 M-4 -2 L-2 -2 M4 -2 L2 -2" {...fine} />
        </g>
      );
    case "pyramids-of-giza":
      return (
        <g transform="translate(50 34)">
          <path d="M-13 8 L-8 -6 L-3 8 Z M-4 8 L2 -8 L8 8 Z M6 8 L9 0 L12 8 Z" {...common} />
          {/* Coursed-stone texture lines on the great pyramid. */}
          <path d="M-6 2 L0 2 M-5 -1 L-1 -1 M-3.5 -4 L0.5 -4" {...fine} />
          <circle cx="10" cy="-10" r="2" {...common} />
        </g>
      );
    case "brandenburg-gate":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-10 14 L-10 -6 M-6 14 L-6 -6 M-2 14 L-2 -6 M2 14 L2 -6 M6 14 L6 -6 M10 14 L10 -6 M-12 -6 L12 -6 M-12 -6 L-12 -9 L12 -9 L12 -6"
            {...common}
          />
          {/* The quadriga (chariot statue) on top, the gate's signature crown. */}
          <path d="M-3 -9 L3 -9 M-1.5 -9 L-1.5 -11.5 L1.5 -11.5 L1.5 -9 M0 -11.5 L0 -13" {...fine} />
        </g>
      );
    case "parthenon":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-10 8 L-10 -4 M-6 8 L-6 -4 M-2 8 L-2 -4 M2 8 L2 -4 M6 8 L6 -4 M10 8 L10 -4 M-12 8 L12 8 M-12 -4 L0 -12 L12 -4"
            {...common}
          />
          {/* Pediment sculpture line and the entablature course under the roof. */}
          <path d="M-12 -4 L12 -4" {...fine} />
          <path d="M-5 -5.5 L5 -5.5" {...fine} />
        </g>
      );
    case "hagia-sophia":
      return (
        <g transform="translate(50 34)">
          <path
            d="M0 8 C -8 8 -8 -2 0 -2 C 8 -2 8 8 0 8 M0 -2 L0 -6 M-2 -6 L2 -6 M-12 8 L-12 -10 M12 8 L12 -10 M-13 -10 L-11 -10 M11 -10 L13 -10"
            {...common}
          />
          {/* Two flanking semi-domes (the real basilica's dome is buttressed by smaller half-domes). */}
          <path d="M-5 8 C -5 4.5 -2.5 1.8 0 1.8 M5 8 C 5 4.5 2.5 1.8 0 1.8" {...fine} />
          <path d="M-12 4 L-10 4 M12 4 L10 4" {...fine} />
        </g>
      );
    case "saint-basils":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-9 14 L-9 2 C -9 -4 -5 -4 -5 2 L-5 14 M-2 14 L-2 -2 C -2 -10 2 -10 2 -2 L2 14 M5 14 L5 2 C 5 -4 9 -4 9 2 L9 14"
            {...common}
          />
          {/* A fourth, shorter onion dome and spiral banding on the domes -- the cathedral's cluster of towers. */}
          <path d="M-11.5 14 L-11.5 6 C -11.5 3 -8.5 3 -8.5 6 L-8.5 14" {...fine} />
          <path d="M-9 0 C -7 1 -7 -1 -9 -2 M-2 -4 C 0 -3 0 -5 -2 -6 M5 0 C 7 1 7 -1 5 -2" {...fine} />
        </g>
      );
    case "wat-arun":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-6 14 L-4 6 L-3 6 L-2 -2 L-1 -2 L0 -14 L1 -2 L2 -2 L3 6 L4 6 L6 14 Z"
            {...common}
          />
          {/* Tiered ring lines and finial spire, matching the prang's stacked-terrace shape. */}
          <path d="M-5.4 10 L5.4 10 M-3.5 2 L3.5 2 M0 -14 L0 -17" {...fine} />
        </g>
      );
    case "taipei-101":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-5 14 L-5 10 L-6 9 L-6 5 L-5 4 L-5 0 L-6 -1 L-6 -5 L-5 -6 L-5 -10 L-3 -14 M5 14 L5 10 L6 9 L6 5 L5 4 L5 0 L6 -1 L6 -5 L5 -6 L5 -10 L3 -14"
            {...common}
          />
          {/* Flared caps at each segment joint, echoing the tower's ruyi/bamboo-shaped tiers. */}
          <path d="M-6 9 L6 9 M-6 5 L6 5 M-6 -1 L6 -1 M-6 -5 L6 -5" {...fine} />
          <path d="M0 -14 L0 -18" {...fine} />
        </g>
      );
    case "table-mountain":
      return (
        <g transform="translate(50 34)">
          <path d="M-14 8 L-9 -6 L9 -6 L14 8 Z M-9 -6 L9 -6" {...common} />
          {/* The "tablecloth" cloud that famously spills over the flat top, and the cableway line. */}
          <path d="M-9 -6 C -6 -8.5 6 -8.5 9 -6" {...fine} />
          <path d="M-8 -4 L6 4" {...fine} />
        </g>
      );
    case "venice-canal":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-10 6 C -10 2 10 2 10 6 L8 8 L-8 8 Z M6 6 L6 -6 C 8 -6 8 -2 6 0"
            {...common}
          />
          {/* A backdrop of canal-side buildings and water ripples, setting the gondola in its canal. */}
          <path d="M-9 2 L-9 -4 L-6 -6 L-3 -4 L-3 2" {...fine} />
          <path d="M-11 9.5 L-6 9.5 M2 9.5 L11 9.5" {...fine} />
        </g>
      );
    case "amsterdam-canal-houses":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 8 L-12 -2 L-9 -6 L-6 -2 L-6 8 M-6 8 L-6 -4 L-2 -8 L2 -4 L2 8 M2 8 L2 -2 L6 -6 L10 -2 L10 8"
            {...common}
          />
          {/* Windows on each stepped-gable house, the row's defining detail. */}
          <path d="M-10.5 1 L-10.5 4 M-7.5 1 L-7.5 4 M-5.4 3 L-5.4 6 M-2.6 3 L-2.6 6 M-0.4 -1 L-0.4 2 M2.6 -1 L2.6 2 M4.8 1 L4.8 4 M7.6 1 L7.6 4" {...fine} />
        </g>
      );
    case "hong-kong-skyline":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-14 8 L-14 0 L-11 0 L-11 -4 L-8 -4 L-8 2 L-5 2 L-5 -6 L-2 -6 L-2 4 L1 4 L1 -8 L4 -8 L4 6 L7 6 L7 -2 L10 -2 L10 8"
            {...common}
          />
          {/* Victoria Peak's ridge behind the skyline and window rows on the tallest tower. */}
          <path d="M2 -8 C 6 -12 10 -12 13 -8" {...fine} />
          <path d="M0 -6 L2 -6 M0 -3 L2 -3 M0 0 L2 0" {...fine} />
        </g>
      );
    case "namsan-tower":
      return (
        <g transform="translate(50 34)">
          <path
            d="M-12 10 C -12 6 12 6 12 10 M0 6 L0 -10 M-3 -10 C -3 -14 3 -14 3 -10 C 3 -6 -3 -6 -3 -10"
            {...common}
          />
          {/* The tower's mid-shaft observation ring and treed-hill texture at the base. */}
          <path d="M-1.6 -1 L1.6 -1 L1.6 1.4 L-1.6 1.4 Z" {...fine} />
          <path d="M-8 9 L-6 6 M-3 9.5 L-1 6.5 M4 9.5 L6 6.5 M8 9 L10 6" {...fine} />
        </g>
      );
  }
}
