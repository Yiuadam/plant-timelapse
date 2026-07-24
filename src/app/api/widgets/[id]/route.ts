import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { widgetUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const widget = await prisma.widget.findUnique({ where: { id } });
  if (!widget || widget.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = widgetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const updated = await prisma.widget.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ widget: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const widget = await prisma.widget.findUnique({ where: { id } });
  if (!widget || widget.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (widget.type !== "sticky") {
    return NextResponse.json(
      { error: "Only sticky notes can be removed" },
      { status: 400 },
    );
  }

  await prisma.widget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
