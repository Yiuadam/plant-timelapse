import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { travelItemSchema } from "@/lib/validation";
import { canAccessTrip } from "@/lib/trip-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId } = await params;
  if (!(await canAccessTrip(tripId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = travelItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { type, title, detail, location, startAt, endAt, notes } =
    parsed.data;

  const item = await prisma.travelItem.create({
    data: {
      tripId,
      type,
      title,
      detail: detail || null,
      location: location || null,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      notes: notes || null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
