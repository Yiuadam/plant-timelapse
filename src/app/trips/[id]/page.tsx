import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TripLocations from "@/components/trip-locations";
import TripPhotos from "@/components/trip-photos";
import TripWishlist from "@/components/trip-wishlist";
import DeleteTripButton from "@/components/delete-trip-button";
import StackedCards from "@/components/stacked-cards";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      locations: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!trip || trip.userId !== session.user.id) notFound();

  const visitedLocations = trip.locations.filter((loc) => loc.visited);
  const wishlistLocations = trip.locations.filter((loc) => !loc.visited);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{trip.title}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {trip.destination}
            {trip.startDate &&
              ` · ${trip.startDate.toLocaleDateString()}${
                trip.endDate ? ` – ${trip.endDate.toLocaleDateString()}` : ""
              }`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/trips/${trip.id}/edit`} className="text-sm underline">
            Edit
          </Link>
          <DeleteTripButton tripId={trip.id} />
        </div>
      </div>

      {trip.notes && (
        <p className="mb-8 whitespace-pre-wrap text-sm">{trip.notes}</p>
      )}

      <StackedCards
        cards={[
          {
            key: "places",
            title: "Places",
            content: (
              <TripLocations tripId={trip.id} locations={visitedLocations} />
            ),
          },
          {
            key: "wishlist",
            title: "Wishlist",
            content: (
              <TripWishlist tripId={trip.id} locations={wishlistLocations} />
            ),
          },
          {
            key: "photos",
            title: "Photos",
            content: <TripPhotos tripId={trip.id} photos={trip.photos} />,
          },
        ]}
      />
    </div>
  );
}
