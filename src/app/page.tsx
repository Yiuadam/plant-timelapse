import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateWidgets } from "@/lib/widgets";
import { tripAccessWhere } from "@/lib/trip-access";
import WidgetBoard from "@/components/widget-board";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Travel Log</h1>
        <p className="max-w-md text-lg text-black/60 dark:text-white/60">
          Record your trips, pin the places you visit, keep your photos, and
          track what you spend along the way.
        </p>
        <div className="flex gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-foreground px-5 py-2.5 text-background"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-black/10 px-5 py-2.5 dark:border-white/20"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const userId = session.user.id;

  const [trips, widgets, recentPhotos, visitedLocations, upcomingTravel, passportStamps] =
    await Promise.all([
      prisma.trip.findMany({
        where: tripAccessWhere(userId),
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, destination: true, startDate: true },
      }),
      getOrCreateWidgets(userId),
      prisma.photo.findMany({
        where: { trip: tripAccessWhere(userId) },
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
        where: { visited: true, trip: tripAccessWhere(userId) },
        select: { id: true, name: true, lat: true, lng: true },
      }),
      prisma.travelItem.findMany({
        where: { trip: tripAccessWhere(userId) },
        orderBy: { startAt: "asc" },
        take: 8,
        select: {
          id: true,
          type: true,
          title: true,
          location: true,
          startAt: true,
          tripId: true,
          trip: { select: { title: true } },
        },
      }),
      prisma.passportStamp.findMany({
        where: { userId },
        orderBy: { stampedAt: "desc" },
        select: { id: true, tripId: true, city: true, stampedAt: true },
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
      travelItems={upcomingTravel.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        location: item.location,
        startAt: item.startAt.toISOString(),
        tripId: item.tripId,
        tripTitle: item.trip.title,
      }))}
      passportStamps={passportStamps.map((s) => ({
        id: s.id,
        tripId: s.tripId,
        city: s.city,
        stampedAt: s.stampedAt.toISOString(),
      }))}
    />
  );
}
