import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";
import { fetchNearbyPlaces, fetchCityAreas } from "@/lib/nearby-places";
import { geocodeDestination, isBroadDestination } from "@/lib/geocode-destination";

// 3 Overpass mirrors at up to 8s each, plus a Nominatim geocode call,
// comfortably need more than the platform's 10s default.
export const maxDuration = 45;

export async function GET(
  _request: Request,
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
  if (!trip.destination?.trim()) {
    return NextResponse.json(
      { error: "Set a destination on this trip first" },
      { status: 200 },
    );
  }

  let lat = trip.destLat;
  let lng = trip.destLng;
  let addressType = trip.destAddressType;

  if (lat == null || lng == null) {
    const geocoded = await geocodeDestination(trip.destination);
    if (!geocoded) {
      return NextResponse.json(
        { error: "Couldn't locate that destination" },
        { status: 200 },
      );
    }
    lat = geocoded.lat;
    lng = geocoded.lng;
    addressType = geocoded.type;
    await prisma.trip.update({
      where: { id },
      data: { destLat: lat, destLng: lng, destAddressType: addressType },
    });
  }

  if (!trip.destAreaConfirmed && isBroadDestination(addressType)) {
    const areas = await fetchCityAreas(lat, lng);
    if (areas && areas.length > 0) {
      return NextResponse.json({
        needsAreaSelection: true,
        cityLabel: trip.destination,
        areas,
      });
    }
    // No areas found (or the lookup itself failed) -- fall through to
    // plain nearby results for the broad point rather than leaving the
    // user stuck with no way to see anything.
  }

  const nearby = await fetchNearbyPlaces(lat, lng);
  if (!nearby) {
    return NextResponse.json(
      { error: "Nearby lookup is temporarily unavailable — try again shortly" },
      { status: 200 },
    );
  }

  return NextResponse.json(nearby);
}
