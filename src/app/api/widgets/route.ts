import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { widgetCreateSchema } from "@/lib/validation";
import { getOrCreateWidgets } from "@/lib/widgets";
import { WIDGET_LIBRARY } from "@/lib/default-widgets";

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

  const defaults = WIDGET_LIBRARY[parsed.data.type];
  if (!defaults) {
    return NextResponse.json({ error: "Unknown widget type" }, { status: 400 });
  }

  const maxZ = await prisma.widget.aggregate({
    where: { userId },
    _max: { zIndex: true },
  });

  const widget = await prisma.widget.create({
    data: {
      userId,
      type: parsed.data.type,
      x: parsed.data.x ?? 10,
      y: parsed.data.y ?? 10,
      w: defaults.w,
      h: defaults.h,
      rotation: Math.random() * 8 - 4,
      color: parsed.data.color ?? defaults.color,
      content: parsed.data.content ?? "",
      zIndex: (maxZ._max.zIndex ?? 0) + 1,
    },
  });

  return NextResponse.json({ widget }, { status: 201 });
}
