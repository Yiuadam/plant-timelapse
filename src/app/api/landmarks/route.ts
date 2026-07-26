import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public, unauthenticated -- this is just icon configuration (city name to
// landmark-icon key), not user data, so every passport-stamp render across
// every account can share one fetch. Cached for an hour since the curated
// set only changes on deploy (via prisma/seed-landmarks.mjs).
export async function GET() {
  const landmarks = await prisma.landmark.findMany();
  const map: Record<string, { landmarkKey: string; inkOverride: string | null; displayName: string }> = {};
  for (const l of landmarks) {
    map[l.cityKey] = {
      landmarkKey: l.landmarkKey,
      inkOverride: l.inkOverride,
      displayName: l.displayName,
    };
  }
  return NextResponse.json(
    { landmarks: map },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
