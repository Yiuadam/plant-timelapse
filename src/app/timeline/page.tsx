import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AddTimelineEntry from "@/components/add-timeline-entry";
import TimelineBoard from "@/components/timeline-board";
import { tripAccessWhere } from "@/lib/trip-access";

const RING_TINTS = [
  "from-sky-200 to-sky-100 text-sky-900 dark:from-sky-400/30 dark:to-sky-300/10 dark:text-sky-100",
  "from-fuchsia-200 to-fuchsia-100 text-fuchsia-900 dark:from-fuchsia-400/30 dark:to-fuchsia-300/10 dark:text-fuchsia-100",
  "from-amber-200 to-amber-100 text-amber-900 dark:from-amber-400/30 dark:to-amber-300/10 dark:text-amber-100",
];

const ACCENT_CYCLE = ["#0284c7", "#c026d3", "#d97706"];

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [locations, trips] = await Promise.all([
    prisma.location.findMany({
      where: { visited: true, trip: tripAccessWhere(session.user.id) },
      include: {
        photos: { take: 1, orderBy: { createdAt: "asc" } },
        trip: { select: { id: true, title: true } },
      },
    }),
    prisma.trip.findMany({
      where: tripAccessWhere(session.user.id),
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  const entries = locations
    .map((loc) => ({
      ...loc,
      effectiveDate: loc.visitedAt ?? loc.createdAt,
    }))
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())
    .map((entry, i) => ({
      id: entry.id,
      name: entry.name,
      lat: entry.lat,
      lng: entry.lng,
      dateLabel: entry.effectiveDate.toLocaleDateString(),
      tripId: entry.trip.id,
      tripTitle: entry.trip.title,
      photoUrl: entry.photos[0]?.filePath ?? null,
      initial: entry.name.charAt(0).toUpperCase(),
      ringTint: RING_TINTS[i % RING_TINTS.length],
      accent: ACCENT_CYCLE[i % ACCENT_CYCLE.length],
      initialStyle: entry.cardStyle ?? "clean",
      initialSize: entry.cardSize ?? "md",
      isUp: i % 2 === 0,
    }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <AddTimelineEntry trips={trips} />
      </div>

      {entries.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          Places you mark as visited will show up here in order, oldest to
          newest. Use &quot;Add event&quot; above to add your first one.
        </p>
      ) : (
        <TimelineBoard entries={entries} />
      )}
    </div>
  );
}
