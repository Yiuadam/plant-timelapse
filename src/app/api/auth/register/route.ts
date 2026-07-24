import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { DEFAULT_WIDGETS } from "@/lib/default-widgets";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const existingName = await prisma.user.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existingName) {
    return NextResponse.json(
      { error: "This name is already taken" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  // Seeded once, here, at account creation — not lazily on first dashboard
  // read, so there's no "widget count reads as 0" race that could ever
  // wipe/reset an existing user's board.
  await prisma.widget.createMany({
    data: DEFAULT_WIDGETS.map((w) => ({ ...w, userId: user.id })),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
