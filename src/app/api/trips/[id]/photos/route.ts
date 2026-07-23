import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { saveUploadedPhoto, UploadError } from "@/lib/uploads";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tripId } = await params;
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const locationIdRaw = formData?.get("locationId");
  const captionRaw = formData?.get("caption");
  const locationId =
    typeof locationIdRaw === "string" && locationIdRaw ? locationIdRaw : null;
  const caption =
    typeof captionRaw === "string" && captionRaw ? captionRaw : null;

  if (locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location || location.tripId !== tripId) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
  }

  let filePath: string;
  try {
    filePath = await saveUploadedPhoto(file, tripId);
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const photo = await prisma.photo.create({
    data: { tripId, locationId, filePath, caption },
  });

  return NextResponse.json(photo, { status: 201 });
}
