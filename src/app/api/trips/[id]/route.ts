import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { tripSchema, budgetTargetSchema } from "@/lib/validation";
import { canAccessTrip } from "@/lib/trip-access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await canAccessTrip(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  // Budget-target edits come from a separate, smaller form on the Budget
  // card, not the main trip-edit form, so they're validated and applied
  // independently of the full tripSchema below.
  if (
    body &&
    typeof body === "object" &&
    "budgetTarget" in body &&
    !("title" in body)
  ) {
    const parsedBudget = budgetTargetSchema.safeParse(body);
    if (!parsedBudget.success) {
      return NextResponse.json(
        { error: parsedBudget.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { budgetTarget, budgetCurrency } = parsedBudget.data;
    const updated = await prisma.trip.update({
      where: { id },
      data: {
        budgetTarget,
        ...(budgetCurrency ? { budgetCurrency } : {}),
      },
    });

    return NextResponse.json(updated);
  }

  const parsed = tripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { title, destination, startDate, endDate, notes, mood } = parsed.data;

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      title,
      destination: destination || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      notes: notes || null,
      mood: mood || null,
    },
  });

  return NextResponse.json(updated);
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
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip || trip.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.trip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
