import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, collaboratorId } = await params;
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.tripCollaborator.deleteMany({
    where: { id: collaboratorId, tripId: id },
  });

  return NextResponse.json({ ok: true });
}
