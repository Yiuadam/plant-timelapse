import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { inviteSchema } from "@/lib/validation";

// Returns (creating if needed) the trip's share link token. Owner-only:
// a collaborator generating a fresh link would be surprising, and the
// existing token already works for anyone already invited.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shareToken = trip.shareToken ?? randomBytes(12).toString("base64url");
  if (!trip.shareToken) {
    await prisma.trip.update({ where: { id }, data: { shareToken } });
  }

  return NextResponse.json({ shareToken });
}

// Invite a collaborator by email. Only works if they already have an
// account — there's no pending-invite/email-send flow yet, so the owner
// gets told plainly when the address isn't registered.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const invitee = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!invitee) {
    return NextResponse.json(
      { error: "No account found with that email" },
      { status: 404 },
    );
  }
  if (invitee.id === trip.userId) {
    return NextResponse.json(
      { error: "That's already the trip owner" },
      { status: 400 },
    );
  }

  const collaborator = await prisma.tripCollaborator.upsert({
    where: { tripId_userId: { tripId: id, userId: invitee.id } },
    create: { tripId: id, userId: invitee.id },
    update: {},
    include: { user: { select: { name: true, email: true, image: true } } },
  });

  return NextResponse.json({ collaborator }, { status: 201 });
}
