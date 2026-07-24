import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AddTimelineEntry from "@/components/add-timeline-entry";
import TimelineEntryCard from "@/components/timeline-entry-card";

const RING_TINTS = [
  "from-sky-200 to-sky-100 text-sky-900 dark:from-sky-400/30 dark:to-sky-300/10 dark:text-sky-100",
  "from-fuchsia-200 to-fuchsia-100 text-fuchsia-900 dark:from-fuchsia-400/30 dark:to-fuchsia-300/10 dark:text-fuchsia-100",
  "from-amber-200 to-amber-100 text-amber-900 dark:from-amber-400/30 dark:to-amber-300/10 dark:text-amber-100",
];

const ACCENT_CYCLE = ["#0284c7", "#c026d3", "#d97706"];

const COLUMN_WIDTH = 260;
const CONNECTOR_LENGTH = 44;
const MAX_CARD_HEIGHT = 210;
const TIMELINE_HEIGHT = (CONNECTOR_LENGTH + MAX_CARD_HEIGHT) * 2 + 24;

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [locations, trips] = await Promise.all([
    prisma.location.findMany({
      where: { visited: true, trip: { userId: session.user.id } },
      include: {
        photos: { take: 1, orderBy: { createdAt: "asc" } },
        trip: { select: { id: true, title: true } },
      },
    }),
    prisma.trip.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  const entries = locations
    .map((loc) => ({
      ...loc,
      effectiveDate: loc.visitedAt ?? loc.createdAt,
    }))
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

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
        <div className="snap-x snap-mandatory overflow-x-auto pb-4">
          <div
            className="relative"
            style={{
              width: entries.length * COLUMN_WIDTH + COLUMN_WIDTH,
              height: TIMELINE_HEIGHT,
            }}
          >
            <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-px bg-black/10 dark:bg-white/15" />

            {entries.map((entry, i) => {
              const isUp = i % 2 === 0;
              const x = i * COLUMN_WIDTH + COLUMN_WIDTH / 2;

              return (
                <div
                  key={entry.id}
                  className="absolute top-1/2 snap-center"
                  style={{ left: x, transform: "translateX(-50%)" }}
                >
                  <div className="absolute top-0 left-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-black/40 dark:bg-white/50" />

                  <div
                    className="absolute left-1/2 w-px -translate-x-1/2 bg-black/15 dark:bg-white/20"
                    style={{
                      height: CONNECTOR_LENGTH,
                      [isUp ? "bottom" : "top"]: 0,
                    }}
                  />

                  <TimelineEntryCard
                    id={entry.id}
                    name={entry.name}
                    lat={entry.lat}
                    lng={entry.lng}
                    dateLabel={entry.effectiveDate.toLocaleDateString()}
                    tripId={entry.trip.id}
                    tripTitle={entry.trip.title}
                    photoUrl={entry.photos[0]?.filePath ?? null}
                    initial={entry.name.charAt(0).toUpperCase()}
                    ringTint={RING_TINTS[i % RING_TINTS.length]}
                    accent={ACCENT_CYCLE[i % ACCENT_CYCLE.length]}
                    initialStyle={entry.cardStyle ?? "clean"}
                    initialSize={entry.cardSize ?? "md"}
                    isUp={isUp}
                    connectorLength={CONNECTOR_LENGTH}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
