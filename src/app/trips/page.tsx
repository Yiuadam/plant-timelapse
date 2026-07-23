import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const trips = await prisma.trip.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your trips</h1>
        <Link
          href="/trips/new"
          className="rounded bg-foreground px-4 py-2 text-sm text-background"
        >
          New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          No trips yet.{" "}
          <Link href="/trips/new" className="underline">
            Log your first trip
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="block rounded border border-black/10 px-4 py-3 hover:bg-black/[.03] dark:border-white/20 dark:hover:bg-white/[.05]"
              >
                <div className="font-medium">{trip.title}</div>
                <div className="text-sm text-black/60 dark:text-white/60">
                  {trip.destination}
                  {trip.startDate &&
                    ` · ${trip.startDate.toLocaleDateString()}${
                      trip.endDate
                        ? ` – ${trip.endDate.toLocaleDateString()}`
                        : ""
                    }`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
