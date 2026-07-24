import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Locks expire on their own if the holder's tab stops heartbeating (crash,
// closed tab, lost connection) so a lock can never get stuck forever.
const LOCK_TTL_MS = 45_000;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resourceType = searchParams.get("resourceType");
  const resourceId = searchParams.get("resourceId");
  if (!resourceType || !resourceId) {
    return NextResponse.json({ error: "Missing resource" }, { status: 400 });
  }

  const lock = await prisma.editLock.findUnique({
    where: { resourceType_resourceId: { resourceType, resourceId } },
  });

  if (!lock || lock.expiresAt < new Date() || lock.userId === session.user.id) {
    return NextResponse.json({ lock: null });
  }

  return NextResponse.json({
    lock: { userId: lock.userId, userName: lock.userName },
  });
}

// Acquire or heartbeat a lock. Succeeds if the resource is unlocked,
// expired, or already held by the requesting user; otherwise 409 with
// who currently holds it.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const resourceType = body?.resourceType;
  const resourceId = body?.resourceId;
  if (typeof resourceType !== "string" || typeof resourceId !== "string") {
    return NextResponse.json({ error: "Missing resource" }, { status: 400 });
  }

  const userName = session.user.name ?? session.user.email ?? "Someone";
  const expiresAt = new Date(Date.now() + LOCK_TTL_MS);

  const existing = await prisma.editLock.findUnique({
    where: { resourceType_resourceId: { resourceType, resourceId } },
  });

  if (existing && existing.userId !== session.user.id && existing.expiresAt > new Date()) {
    return NextResponse.json(
      { lock: { userId: existing.userId, userName: existing.userName } },
      { status: 409 },
    );
  }

  await prisma.editLock.upsert({
    where: { resourceType_resourceId: { resourceType, resourceId } },
    create: {
      resourceType,
      resourceId,
      userId: session.user.id,
      userName,
      expiresAt,
    },
    update: { userId: session.user.id, userName, expiresAt },
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
  if (!resourceType || !resourceId) {
    return NextResponse.json({ error: "Missing resource" }, { status: 400 });
  }

  await prisma.editLock.deleteMany({
    where: { resourceType, resourceId, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
