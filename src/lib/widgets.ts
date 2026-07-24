import { prisma } from "@/lib/prisma";

// Widgets are seeded exactly once, at account creation (register route /
// NextAuth's createUser event) — this is a plain read with no reseed-on-
// empty fallback, so neither a transient empty read nor a user
// intentionally clearing their board can ever force defaults back.
export async function getOrCreateWidgets(userId: string) {
  return prisma.widget.findMany({
    where: { userId },
    orderBy: { zIndex: "asc" },
  });
}
