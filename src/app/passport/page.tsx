import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tripAccessWhere } from "@/lib/trip-access";
import { getPassportNumber } from "@/lib/passport-number";
import PassportBook from "@/components/passport-book";
import { getT } from "@/lib/i18n/server";

export default async function PassportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { t } = await getT();

  const [user, trips, stamps] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true, birthday: true, gender: true, createdAt: true },
    }),
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
  if (!user) redirect("/login");

  const stampedTripIds = new Set(stamps.map((s) => s.tripId));
  const available = trips.filter(
    (t) => t.destination?.trim() && !stampedTripIds.has(t.id),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">{t("passport_title")}</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        {t("passport_subtitle")}
      </p>

      <PassportBook
        passportNumber={getPassportNumber(userId)}
        name={user.name ?? user.email}
        image={user.image}
        birthday={user.birthday ? user.birthday.toISOString() : null}
        gender={user.gender}
        issuedAt={user.createdAt.toISOString()}
        stamps={stamps.map((s) => ({
          id: s.id,
          tripId: s.tripId,
          city: s.city,
          stampedAt: s.stampedAt.toISOString(),
        }))}
        available={available.map((t) => ({
          id: t.id,
          title: t.title,
          destination: t.destination ?? "",
        }))}
      />
    </div>
  );
}
