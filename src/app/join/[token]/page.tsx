import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function JoinTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  const trip = await prisma.trip.findUnique({ where: { shareToken: token } });
  if (!trip) notFound();

  if (trip.userId !== session.user.id) {
    await prisma.tripCollaborator.upsert({
      where: { tripId_userId: { tripId: trip.id, userId: session.user.id } },
      create: { tripId: trip.id, userId: session.user.id },
      update: {},
    });
  }

  redirect(`/trips/${trip.id}`);
}
