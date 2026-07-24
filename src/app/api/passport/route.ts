import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { tripAccessWhere } from "@/lib/trip-access";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [trips, stamps] = await Promise.all([
    prisma.trip.findMany({
      where: { ...tripAccessWhere(userId), destination: { not: null } },
      select: { id: true, title: true, destination: true, startDate: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.passportStamp.findMany({
      where: { userId },
      orderBy: { stampedAt: "desc" },
    }),
  ]);

  const stampedTripIds = new Set(stamps.map((s) => s.tripId));
  const available = trips.filter(
    (t) => t.destination?.trim() && !stampedTripIds.has(t.id),
  );

  return NextResponse.json({
    stamps: stamps.map((s) => ({
      id: s.id,
      tripId: s.tripId,
      city: s.city,
      stampedAt: s.stampedAt.toISOString(),
    })),
    available: available.map((t) => ({
      id: t.id,
      title: t.title,
      destination: t.destination,
      startDate: t.startDate ? t.startDate.toISOString() : null,
    })),
  });
}
