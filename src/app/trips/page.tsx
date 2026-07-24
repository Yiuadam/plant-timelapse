import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tripAccessWhere } from "@/lib/trip-access";

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const trips = await prisma.trip.findMany({
    where: tripAccessWhere(userId),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      destination: true,
      startDate: true,
      endDate: true,
      userId: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your trips</h1>
        <Link
          href="/trips/new"
          prefetch={true}
          className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          + New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          No trips yet — create your first one to start logging places,
          photos, and bookings.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                prefetch={true}
                className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/50 px-5 py-4 shadow-sm transition hover:bg-white/80 dark:border-white/15 dark:bg-black/20 dark:hover:bg-black/30"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{trip.title}</div>
                  {(trip.destination || trip.startDate) && (
                    <div className="truncate text-sm text-black/60 dark:text-white/60">
                      {trip.destination}
                      {trip.startDate &&
                        `${trip.destination ? " · " : ""}${trip.startDate.toLocaleDateString()}${
                          trip.endDate
                            ? ` – ${trip.endDate.toLocaleDateString()}`
                            : ""
                        }`}
                    </div>
                  )}
                </div>
                {trip.userId !== userId && (
                  <span className="shrink-0 rounded-full bg-black/5 px-2 py-1 text-xs text-black/50 dark:bg-white/10 dark:text-white/50">
                    Shared
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
