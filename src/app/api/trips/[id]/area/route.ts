import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";
import { fetchNearbyPlaces } from "@/lib/nearby-places";
import { geocodeDestination } from "@/lib/geocode-destination";
import {
  CLEAR_NEARBY_CACHE,
  writeCache,
  readSharedCache,
  writeSharedCache,
} from "@/lib/nearby-cache";
import type { NearbyResult } from "@/lib/nearby-places";

export const maxDuration = 45;

// Confirms a precise area for a trip's destination -- either a specific
// district picked from the nearby route's area-selection prompt, or an
// explicit "keep it general" skip (area omitted/empty) -- then returns
// nearby results for wherever that lands, so the client doesn't need a
// second round trip.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await canAccessTrip(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const area = typeof body?.area === "string" ? body.area.trim() : "";

  let lat = trip.destLat;
  let lng = trip.destLng;

  if (area) {
    const geocoded = await geocodeDestination(`${area}, ${trip.destination ?? ""}`);
    if (!geocoded) {
      return NextResponse.json({ error: "Couldn't locate that area" }, { status: 200 });
    }
    lat = geocoded.lat;
    lng = geocoded.lng;
    await prisma.trip.update({
      where: { id },
      data: {
        destLat: lat,
        destLng: lng,
        destAddressType: geocoded.type,
        destAreaConfirmed: true,
        // The coordinates just moved, so anything cached for the old
        // ones no longer describes this trip.
        ...CLEAR_NEARBY_CACHE,
      },
    });
  } else {
    await prisma.trip.update({ where: { id }, data: { destAreaConfirmed: true } });
  }

  if (lat == null || lng == null) {
    return NextResponse.json(
      { error: "Couldn't locate that destination" },
      { status: 200 },
    );
  }

  const nearby =
    (await readSharedCache<NearbyResult>("nearby", lat, lng)) ??
    (await fetchNearbyPlaces(lat, lng));
  if (!nearby) {
    return NextResponse.json(
      { error: "Nearby lookup is temporarily unavailable — try again shortly" },
      { status: 200 },
    );
  }

  await writeCache(id, nearby);
  await writeSharedCache("nearby", lat, lng, nearby);
  return NextResponse.json(nearby);
}
