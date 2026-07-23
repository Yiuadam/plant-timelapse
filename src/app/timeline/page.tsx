import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const RING_TINTS = [
  "from-sky-200 to-sky-100 text-sky-900 dark:from-sky-400/30 dark:to-sky-300/10 dark:text-sky-100",
  "from-fuchsia-200 to-fuchsia-100 text-fuchsia-900 dark:from-fuchsia-400/30 dark:to-fuchsia-300/10 dark:text-fuchsia-100",
  "from-amber-200 to-amber-100 text-amber-900 dark:from-amber-400/30 dark:to-amber-300/10 dark:text-amber-100",
];

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const locations = await prisma.location.findMany({
    where: { visited: true, trip: { userId: session.user.id } },
    include: {
      photos: { take: 1, orderBy: { createdAt: "asc" } },
      trip: { select: { id: true, title: true } },
    },
  });

  const entries = locations
    .map((loc) => ({
      ...loc,
      effectiveDate: loc.visitedAt ?? loc.createdAt,
    }))
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Timeline</h1>

      {entries.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          Places you mark as visited will show up here in order, oldest to
          newest.
        </p>
      ) : (
        <div className="snap-x snap-mandatory overflow-x-auto pb-4">
          <div className="relative flex min-w-max items-start gap-10 px-6 pt-6">
            <div className="pointer-events-none absolute left-6 right-6 top-[68px] h-px bg-black/10 dark:bg-white/15" />
            {entries.map((entry, i) => (
              <Link
                key={entry.id}
                href={`/trips/${entry.trip.id}`}
                className="relative flex w-28 shrink-0 snap-center flex-col items-center gap-2 text-center"
              >
                <div className="relative z-10 h-24 w-24 overflow-hidden rounded-full border-4 border-background shadow-lg ring-2 ring-black/10 dark:ring-white/15">
                  {entry.photos[0] ? (
                    <Image
                      src={entry.photos[0].filePath}
                      alt={entry.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center bg-gradient-to-br text-lg font-semibold ${
                        RING_TINTS[i % RING_TINTS.length]
                      }`}
                    >
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-xs text-black/50 dark:text-white/50">
                  {entry.effectiveDate.toLocaleDateString()}
                </div>
                <div className="w-full truncate text-sm font-medium">
                  {entry.name}
                </div>
                <div className="w-full truncate text-xs text-black/40 dark:text-white/40">
                  {entry.trip.title}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
