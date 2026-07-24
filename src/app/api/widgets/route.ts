import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { widgetCreateSchema } from "@/lib/validation";
import { getOrCreateWidgets } from "@/lib/widgets";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const widgets = await getOrCreateWidgets(userId);
  return NextResponse.json({ widgets });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = widgetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  if (parsed.data.type !== "sticky") {
    return NextResponse.json(
      { error: "Only sticky notes can be added" },
      { status: 400 },
    );
  }

  const maxZ = await prisma.widget.aggregate({
    where: { userId },
    _max: { zIndex: true },
  });

  const widget = await prisma.widget.create({
    data: {
      userId,
      type: "sticky",
      x: parsed.data.x ?? 10,
      y: parsed.data.y ?? 10,
      w: 180,
      h: 180,
      rotation: Math.random() * 8 - 4,
      color: parsed.data.color ?? "yellow",
      content: parsed.data.content ?? "",
      zIndex: (maxZ._max.zIndex ?? 0) + 1,
    },
  });

  return NextResponse.json({ widget }, { status: 201 });
}
