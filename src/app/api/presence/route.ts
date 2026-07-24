import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Presence rows older than this are treated as stale (tab closed, crashed,
// or just navigated away) even if never explicitly released.
const PRESENCE_TTL_MS = 20_000;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resourceType = searchParams.get("resourceType");
  const resourceId = searchParams.get("resourceId");
  const cardKey = searchParams.get("cardKey");
  if (!resourceType || !resourceId || !cardKey) {
    return NextResponse.json({ error: "Missing resource" }, { status: 400 });
  }

  const rows = await prisma.cardPresence.findMany({
    where: {
      resourceType,
      resourceId,
      cardKey,
      userId: { not: session.user.id },
      lastSeenAt: { gt: new Date(Date.now() - PRESENCE_TTL_MS) },
    },
  });

  return NextResponse.json({
    viewers: rows.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userImage: r.userImage,
    })),
  });
}

// Heartbeat: upsert this user's presence on a card.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const resourceType = body?.resourceType;
  const resourceId = body?.resourceId;
  const cardKey = body?.cardKey;
  if (
    typeof resourceType !== "string" ||
    typeof resourceId !== "string" ||
    typeof cardKey !== "string"
  ) {
    return NextResponse.json({ error: "Missing resource" }, { status: 400 });
  }

  const userName = session.user.name ?? session.user.email ?? "Someone";
  const userImage = session.user.image ?? null;

  await prisma.cardPresence.upsert({
    where: {
      userId_resourceType_resourceId_cardKey: {
        userId: session.user.id,
        resourceType,
        resourceId,
        cardKey,
      },
    },
    create: {
      userId: session.user.id,
      userName,
      userImage,
      resourceType,
      resourceId,
      cardKey,
    },
    update: { userName, userImage, lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resourceType = searchParams.get("resourceType");
  const resourceId = searchParams.get("resourceId");
  const cardKey = searchParams.get("cardKey");
  if (!resourceType || !resourceId || !cardKey) {
    return NextResponse.json({ error: "Missing resource" }, { status: 400 });
  }

  await prisma.cardPresence.deleteMany({
    where: { resourceType, resourceId, cardKey, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
