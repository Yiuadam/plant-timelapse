import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tripAccessWhere } from "@/lib/trip-access";
import { PassportStampGraphic } from "@/components/passport-stamp";
import StampButton from "@/components/stamp-button";

export default async function PassportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [trips, stamps] = await Promise.all([
    prisma.trip.findMany({
      where: { ...tripAccessWhere(userId), destination: { not: null } },
      select: { id: true, title: true, destination: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.passportStamp.findMany({
      where: { userId },
      orderBy: { stampedAt: "desc" },
    }),
  ]);

  const stampedTripIds = new Set(stamps.map((s) => s.tripId));
  const available = trips.filter(
    (t) => t.destination?.trim() && !stampedTripIds.has(t.id),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">Passport</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        Every trip with a destination can be stamped once you&apos;ve been.
      </p>

      {stamps.length === 0 ? (
        <p className="mb-8 text-sm text-black/50 dark:text-white/50">
          No stamps yet — your passport is still blank.
        </p>
      ) : (
        <div className="mb-8 flex flex-wrap gap-6 rounded-2xl border border-black/10 bg-black/[0.02] p-6 dark:border-white/15 dark:bg-white/[0.03]">
          {stamps.map((s) => (
            <PassportStampGraphic
              key={s.id}
              city={s.city}
              stampedAt={s.stampedAt.toISOString()}
              seed={s.tripId}
            />
          ))}
        </div>
      )}

      {available.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-medium">Ready to stamp</h2>
          <div className="flex flex-col gap-2">
            {available.map((t) => (
              <StampButton
                key={t.id}
                tripId={t.id}
                title={t.title}
                destination={t.destination ?? ""}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
