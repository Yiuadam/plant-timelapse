import { prisma } from "@/lib/prisma";

// Returns the trip if the user owns it or is a collaborator, else null.
// Centralizes the owner-or-collaborator check so every route/page that
// gates trip access agrees on what "can see this trip" means.
export async function getAccessibleTrip(tripId: string, userId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { collaborators: true },
  });
  if (!trip) return null;
  const isOwner = trip.userId === userId;
  const isCollaborator = trip.collaborators.some((c) => c.userId === userId);
  if (!isOwner && !isCollaborator) return null;
  return { ...trip, isOwner };
}

// A Prisma `where` fragment matching every trip a user can see, whether
// they own it or were added as a collaborator. Spread into `trip.findMany`
// (directly) or `photo`/`location.findMany` (as `trip: tripAccessWhere(...)`)
export function tripAccessWhere(userId: string) {
  return {
    OR: [{ userId }, { collaborators: { some: { userId } } }],
  };
}

export async function canAccessTrip(tripId: string, userId: string) {
  const count = await prisma.trip.count({
    where: {
      id: tripId,
      OR: [{ userId }, { collaborators: { some: { userId } } }],
    },
  });
  return count > 0;
}
