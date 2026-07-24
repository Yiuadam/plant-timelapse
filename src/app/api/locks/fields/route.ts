import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Bulk read of every currently-locked field under one resource, so a form
// with many fields can poll once instead of once per field. Field locks are
// stored as ordinary EditLocks whose resourceId is `${resourceId}:${fieldKey}`.
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

  const locks = await prisma.editLock.findMany({
    where: {
      resourceType,
      resourceId: { startsWith: `${resourceId}:` },
      expiresAt: { gt: new Date() },
    },
  });

  const editors: Record<string, { userId: string; userName: string }> = {};
  for (const lock of locks) {
    if (lock.userId === session.user.id) continue;
    const fieldKey = lock.resourceId.slice(resourceId.length + 1);
    editors[fieldKey] = { userId: lock.userId, userName: lock.userName };
  }

  return NextResponse.json({ editors });
}
