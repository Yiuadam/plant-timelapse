import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { locationCardSchema } from "@/lib/validation";
import { canAccessTrip } from "@/lib/trip-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location || !(await canAccessTrip(location.tripId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = locationCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const updated = await prisma.location.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location || !(await canAccessTrip(location.tripId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.location.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
