import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { expenseSchema } from "@/lib/validation";

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

  const body = await request.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { category, amount, currency, note, spentAt } = parsed.data;

  const expense = await prisma.expense.create({
    data: {
      tripId,
      category,
      amount,
      currency,
      note: note || null,
      spentAt: spentAt ? new Date(spentAt) : new Date(),
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
