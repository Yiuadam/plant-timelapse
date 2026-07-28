import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";
import { fetchNearbyPlaces } from "@/lib/nearby-places";

export const maxDuration = 30;

type NominatimResult = { lat: string; lon: string };

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query.slice(0, 200));
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TravelLog/1.0 (personal travel journal app)" },
    });
    if (!res.ok) return null;
    const data: NominatimResult[] = await res.json();
    const first = data[0];
    if (!first) return null;
    return { lat: Number(first.lat), lng: Number(first.lon) };
  } catch {
    return null;
  }
}

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

  if (lat == null || lng == null) {
    const geocoded = await geocode(trip.destination);
    if (!geocoded) {
      return NextResponse.json(
        { error: "Couldn't locate that destination" },
        { status: 200 },
      );
    }
    lat = geocoded.lat;
    lng = geocoded.lng;
    await prisma.trip.update({
      where: { id },
      data: { destLat: lat, destLng: lng },
    });
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
