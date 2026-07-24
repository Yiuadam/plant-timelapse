import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTrip } from "@/lib/trip-access";
import PosterEditor from "@/components/poster-editor";

export default async function TripPosterPage({
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
    include: { photos: { orderBy: { createdAt: "desc" } } },
  });
  if (!trip) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">Trip poster</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        Pick a look, download it, and share it however you like.
      </p>
      <PosterEditor
        tripId={trip.id}
        photos={trip.photos.map((p) => ({ id: p.id, filePath: p.filePath }))}
      />
    </div>
  );
}
