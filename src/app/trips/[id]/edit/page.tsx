import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TripForm from "@/components/trip-form";
import { canAccessTrip } from "@/lib/trip-access";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  if (!(await canAccessTrip(id, session.user.id))) notFound();
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit trip</h1>
      <TripForm
        tripId={trip.id}
        initialValues={{
          title: trip.title,
          destination: trip.destination ?? "",
          startDate: toDateInputValue(trip.startDate),
          endDate: toDateInputValue(trip.endDate),
          notes: trip.notes ?? "",
          mood: trip.mood ?? "",
        }}
      />
    </div>
  );
}
