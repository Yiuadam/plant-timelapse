import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTrip } from "@/lib/trip-access";

const TYPE_META: Record<string, { label: string; icon: string }> = {
  flight: { label: "Flight", icon: "✈️" },
  hotel: { label: "Hotel", icon: "🏨" },
  train: { label: "Train", icon: "🚆" },
};

function formatDay(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function TripSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  if (!(await canAccessTrip(id, session.user.id))) notFound();

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { travelItems: { orderBy: { startAt: "asc" } } },
  });
  if (!trip) notFound();

  const groups: { key: string; date: Date; items: typeof trip.travelItems }[] = [];
  for (const item of trip.travelItems) {
    const key = dayKey(item.startAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, date: item.startAt, items: [item] });
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Schedule</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {trip.title}
          </p>
        </div>
        <Link href={`/trips/${trip.id}`} prefetch={true} className="text-sm underline">
          Back to trip
        </Link>
      </div>

      {groups.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.key}>
              <h2 className="mb-2 text-sm font-semibold text-black/70 dark:text-white/70">
                {formatDay(group.date)}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => {
                  const meta = TYPE_META[item.type] ?? { label: item.type, icon: "🧳" };
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl border border-black/10 px-3 py-3 text-sm dark:border-white/20"
                    >
                      <span className="text-lg" aria-hidden>
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium">{item.title}</span>
                          <span className="shrink-0 text-black/60 dark:text-white/60">
                            {formatTime(item.startAt)}
                            {item.endAt && ` – ${formatTime(item.endAt)}`}
                          </span>
                        </div>
                        {(item.location || item.detail) && (
                          <div className="text-xs text-black/50 dark:text-white/50">
                            {[item.location, item.detail].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        {item.notes && (
                          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                            {item.notes}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          No bookings yet — add flights, hotels, or trains from the trip page
          and they&apos;ll show up here grouped by day.
        </p>
      )}
    </div>
  );
}
