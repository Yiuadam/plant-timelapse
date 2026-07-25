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

type RawEntry = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  effectiveDate: Date;
  tripId: string;
  tripTitle: string;
  photoUrl: string | null;
  cardStyle: string | null;
  cardSize: string | null;
};

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
      select: {
        id: true,
        title: true,
        destination: true,
        startDate: true,
        createdAt: true,
      },
    }),
  ]);

  // Every trip with a destination shows up on the timeline automatically,
  // not just ones where the user went through the separate "Add event"
  // flow to mark a specific Location visited -- that flow is for pinning
  // an exact spot on the map, but most trips are only ever given a
  // destination string, and previously those never appeared here at all.
  const tripIdsWithVisitedLocation = new Set(locations.map((l) => l.tripId));

  const locationEntries: RawEntry[] = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    lat: loc.lat,
    lng: loc.lng,
    effectiveDate: loc.visitedAt ?? loc.createdAt,
    tripId: loc.trip.id,
    tripTitle: loc.trip.title,
    photoUrl: loc.photos[0]?.filePath ?? null,
    cardStyle: loc.cardStyle,
    cardSize: loc.cardSize,
  }));

  const syntheticEntries: RawEntry[] = trips
    .filter((t) => t.destination?.trim() && !tripIdsWithVisitedLocation.has(t.id))
    .map((t) => ({
      id: `trip-${t.id}`,
      name: t.destination!.trim(),
      lat: null,
      lng: null,
      effectiveDate: t.startDate ?? t.createdAt,
      tripId: t.id,
      tripTitle: t.title,
      photoUrl: null,
      cardStyle: null,
      cardSize: null,
    }));

  const entries = [...locationEntries, ...syntheticEntries]
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())
    .map((entry, i) => ({
      id: entry.id,
      name: entry.name,
      lat: entry.lat,
      lng: entry.lng,
      dateLabel: entry.effectiveDate.toLocaleDateString(),
      tripId: entry.tripId,
      tripTitle: entry.tripTitle,
      photoUrl: entry.photoUrl,
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
          Trips with a destination show up here automatically, in order.
          Create a trip, or use &quot;Add event&quot; above to pin an exact
          spot on the map.
        </p>
      ) : (
        <TimelineBoard entries={entries} />
      )}
    </div>
  );
}
