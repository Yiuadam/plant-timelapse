import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { tripSchema } from "@/lib/validation";
import { tripAccessWhere } from "@/lib/trip-access";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trips = await prisma.trip.findMany({
    where: tripAccessWhere(userId),
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(trips);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = tripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { title, destination, startDate, endDate, notes, mood } = parsed.data;

  const trip = await prisma.trip.create({
    data: {
      userId,
      title,
      destination: destination || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      notes: notes || null,
      mood: mood || null,
    },
  });

  return NextResponse.json(trip, { status: 201 });
}
