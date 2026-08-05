import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";
import {
  fetchNearbyPlaces,
  fetchCityAreas,
  fetchCityAreaShapes,
} from "@/lib/nearby-places";
import { geocodeDestination, isBroadDestination } from "@/lib/geocode-destination";
import {
  readCache,
  writeCache,
  readSharedCache,
  writeSharedCache,
} from "@/lib/nearby-cache";
import type { NearbyResult } from "@/lib/nearby-places";
import type { AreaShape } from "@/lib/area-shapes";

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

  // A fresh cached answer short-circuits everything below -- no geocode,
  // no Overpass call, no area prompt (the area question was already
  // settled when this was cached).
  const cached = readCache(trip);
  if (cached && !cached.stale) {
    return NextResponse.json(cached.result);
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
    // Boundary geometry first, so the picker can draw the city's real
    // shape. Only administrative relations have an outline to draw, so
    // this comes back empty for places mapped only as informal nodes --
    // hence the centroid list below as the fallback.
    const shapes =
      (await readSharedCache<AreaShape[]>("shapes", lat, lng)) ??
      (await fetchCityAreaShapes(lat, lng));
    if (shapes && shapes.length > 0) {
      await writeSharedCache("shapes", lat, lng, shapes);
      return NextResponse.json({
        needsAreaSelection: true,
        cityLabel: trip.destination,
        areas: shapes.map(({ name, lat: aLat, lng: aLng, distanceMeters }) => ({
          name,
          lat: aLat,
          lng: aLng,
          distanceMeters,
        })),
        shapes,
      });
    }

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

  // Someone else's lookup of this same place counts -- "what is near
  // these coordinates" is the same answer for every trip and every user.
  const shared = await readSharedCache<NearbyResult>("nearby", lat, lng);
  if (shared) {
    await writeCache(id, shared);
    return NextResponse.json(shared);
  }

  const nearby = await fetchNearbyPlaces(lat, lng);
  if (!nearby) {
    // Overpass is having a bad day. A stale answer for these same
    // coordinates beats an error message -- the places haven't moved.
    if (cached) {
      return NextResponse.json(cached.result);
    }
    return NextResponse.json(
      { error: "Nearby lookup is temporarily unavailable — try again shortly" },
      { status: 200 },
    );
  }

  await writeCache(id, nearby);
  await writeSharedCache("nearby", lat, lng, nearby);
  return NextResponse.json(nearby);
}
