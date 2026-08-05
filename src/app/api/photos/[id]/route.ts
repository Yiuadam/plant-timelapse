import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/uploads";
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
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo || !(await canAccessTrip(photo.tripId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.photo.delete({ where: { id } });

  await deleteStoredFile(photo.filePath).catch(() => {});

  return NextResponse.json({ ok: true });
}
