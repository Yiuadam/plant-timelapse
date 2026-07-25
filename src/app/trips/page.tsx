import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tripAccessWhere } from "@/lib/trip-access";
import TripListItem from "@/components/trip-list-item";

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
            <TripListItem
              key={trip.id}
              trip={{
                id: trip.id,
                title: trip.title,
                destination: trip.destination,
                startDate: trip.startDate ? trip.startDate.toISOString() : null,
                endDate: trip.endDate ? trip.endDate.toISOString() : null,
              }}
              isOwner={trip.userId === userId}
              isShared={trip.userId !== userId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
