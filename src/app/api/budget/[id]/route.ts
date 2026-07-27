import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.budgetItem.findUnique({ where: { id } });
  if (!item || !(await canAccessTrip(item.tripId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.budgetItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
