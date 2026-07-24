import { prisma } from "@/lib/prisma";
import type { WidgetDevice } from "@/lib/device";

// Widgets are seeded exactly once, at account creation (register route /
// NextAuth's createUser event) — this is a plain read with no reseed-on-
// empty fallback, so neither a transient empty read nor a user
// intentionally clearing their board can ever force defaults back.
// Desktop and mobile each have their own independent set.
export async function getOrCreateWidgets(userId: string, device: WidgetDevice) {
  return prisma.widget.findMany({
    where: { userId, device },
    orderBy: { zIndex: "asc" },
  });
}
