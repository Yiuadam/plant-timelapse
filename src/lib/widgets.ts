import { prisma } from "@/lib/prisma";
import { DEFAULT_WIDGETS } from "@/lib/default-widgets";

export async function getOrCreateWidgets(userId: string) {
  let widgets = await prisma.widget.findMany({
    where: { userId },
    orderBy: { zIndex: "asc" },
  });

  if (widgets.length === 0) {
    await prisma.widget.createMany({
      data: DEFAULT_WIDGETS.map((w) => ({ ...w, userId })),
    });
    widgets = await prisma.widget.findMany({
      where: { userId },
      orderBy: { zIndex: "asc" },
    });
  }

  return widgets;
}
