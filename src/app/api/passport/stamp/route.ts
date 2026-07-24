import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const tripId = body?.tripId;
  if (typeof tripId !== "string" || !tripId) {
    return NextResponse.json({ error: "Missing tripId" }, { status: 400 });
  }

  if (!(await canAccessTrip(tripId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { destination: true },
  });
  const city = trip?.destination?.trim();
  if (!city) {
    return NextResponse.json(
      { error: "This trip has no destination set yet" },
      { status: 400 },
    );
  }

  const existing = await prisma.passportStamp.findUnique({
    where: { userId_tripId: { userId, tripId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already stamped" }, { status: 409 });
  }

  const stamp = await prisma.passportStamp.create({
    data: { userId, tripId, city },
  });

  return NextResponse.json(
    {
      stamp: {
        id: stamp.id,
        tripId: stamp.tripId,
        city: stamp.city,
        stampedAt: stamp.stampedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
