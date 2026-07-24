import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWidgets } from "@/lib/widgets";
import WidgetBoard from "@/components/widget-board";

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [trips, widgets, recentPhotos, visitedLocations] = await Promise.all([
    prisma.trip.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, destination: true, startDate: true },
    }),
    getOrCreateWidgets(userId),
    prisma.photo.findMany({
      where: { trip: { userId } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        filePath: true,
        caption: true,
        trip: { select: { title: true } },
      },
    }),
    prisma.location.findMany({
      where: { visited: true, trip: { userId } },
      select: { id: true, name: true, lat: true, lng: true },
    }),
  ]);

  return (
    <WidgetBoard
      initialWidgets={widgets.map((w) => ({
        id: w.id,
        type: w.type,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        rotation: w.rotation,
        zIndex: w.zIndex,
        color: w.color,
        style: w.style,
        content: w.content,
      }))}
      trips={trips.map((t) => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        startDate: t.startDate ? t.startDate.toISOString() : null,
      }))}
      recentPhotos={recentPhotos.map((p) => ({
        id: p.id,
        filePath: p.filePath,
        caption: p.caption,
        tripTitle: p.trip.title,
      }))}
      mapLocations={visitedLocations}
    />
  );
}
