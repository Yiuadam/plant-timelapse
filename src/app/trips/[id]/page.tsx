import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TripLocations from "@/components/trip-locations";
import TripPhotos from "@/components/trip-photos";
import TripWishlist from "@/components/trip-wishlist";
import TripTravel from "@/components/trip-travel";
import TripBudget from "@/components/trip-budget";
import TripNearby from "@/components/trip-nearby";
import DeleteTripButton from "@/components/delete-trip-button";
import StackedCards from "@/components/stacked-cards";
import TripShare from "@/components/trip-share";
import LiveRefresh from "@/components/live-refresh";
import { getAccessibleTrip } from "@/lib/trip-access";
import { TRIP_MOODS } from "@/lib/validation";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const accessible = await getAccessibleTrip(id, session.user.id);
  if (!accessible) notFound();

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      locations: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: { createdAt: "desc" } },
      collaborators: { include: { user: { select: { name: true, email: true, image: true } } } },
      travelItems: { orderBy: { startAt: "asc" } },
      budgetItems: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!trip) notFound();

  const visitedLocations = trip.locations.filter((loc) => loc.visited);
  const wishlistLocations = trip.locations.filter((loc) => !loc.visited);
  const tripMood = TRIP_MOODS.find((m) => m.key === trip.mood);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LiveRefresh />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {trip.title}
            {tripMood && <span className="ml-2" aria-label={tripMood.label}>{tripMood.emoji}</span>}
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {trip.destination}
            {trip.startDate &&
              ` · ${trip.startDate.toLocaleDateString()}${
                trip.endDate ? ` – ${trip.endDate.toLocaleDateString()}` : ""
              }`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <TripShare
            tripId={trip.id}
            isOwner={accessible.isOwner}
            shareToken={trip.shareToken}
            collaborators={trip.collaborators.map((c) => ({
              id: c.id,
              name: c.user.name,
              email: c.user.email,
              image: c.user.image,
            }))}
          />
          <Link
            href={`/trips/${trip.id}/schedule`}
            prefetch={true}
            className="text-sm underline"
          >
            Schedule
          </Link>
          <Link
            href={`/trips/${trip.id}/poster`}
            prefetch={true}
            className="text-sm underline"
          >
            Poster
          </Link>
          <Link
            href={`/trips/${trip.id}/edit`}
            prefetch={true}
            className="text-sm underline"
          >
            Edit
          </Link>
          {accessible.isOwner && <DeleteTripButton tripId={trip.id} />}
        </div>
      </div>

      {trip.notes && (
        <p className="mb-8 whitespace-pre-wrap text-sm">{trip.notes}</p>
      )}

      <StackedCards
        presenceResourceType="trip"
        presenceResourceId={trip.id}
        cards={[
          {
            key: "nearby",
            title: "Explore",
            content: <TripNearby tripId={trip.id} destination={trip.destination} />,
          },
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
          {
            key: "travel",
            title: "Travel",
            content: (
              <TripTravel
                tripId={trip.id}
                items={trip.travelItems.map((item) => ({
                  id: item.id,
                  type: item.type,
                  title: item.title,
                  detail: item.detail,
                  location: item.location,
                  startAt: item.startAt.toISOString(),
                  endAt: item.endAt ? item.endAt.toISOString() : null,
                  notes: item.notes,
                }))}
              />
            ),
          },
          {
            key: "budget",
            title: "Budget",
            content: (
              <TripBudget
                tripId={trip.id}
                items={trip.budgetItems.map((item) => ({
                  id: item.id,
                  category: item.category,
                  label: item.label,
                  amount: item.amount,
                }))}
                budgetTarget={trip.budgetTarget}
                budgetCurrency={trip.budgetCurrency ?? "USD"}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
