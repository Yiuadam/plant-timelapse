import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";
import { getPosterTheme } from "@/lib/poster-themes";
import { TRIP_MOODS } from "@/lib/validation";

// Deliberately NOT edge runtime -- Prisma's standard Postgres client needs
// Node APIs, and next/og's ImageResponse works fine on the Node runtime too
// (edge was only a requirement in older Next.js versions).
function formatDateRange(startDate: Date | null, endDate: Date | null) {
  if (!startDate) return "";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const start = startDate.toLocaleDateString(undefined, opts);
  if (!endDate) return start;
  const end = endDate.toLocaleDateString(undefined, opts);
  return `${start} – ${end}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: tripId } = await params;
  if (!(await canAccessTrip(tripId, userId))) {
    return new Response("Not found", { status: 404 });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      title: true,
      destination: true,
      startDate: true,
      endDate: true,
      mood: true,
    },
  });
  if (!trip) {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const theme = getPosterTheme(searchParams.get("theme"));
  const photoId = searchParams.get("photoId");

  let photoUrl: string | null = null;
  if (photoId) {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { filePath: true, tripId: true },
    });
    if (photo && photo.tripId === tripId) {
      photoUrl = photo.filePath;
    }
  }

  const mood = TRIP_MOODS.find((m) => m.key === trip.mood);
  const dateRange = formatDateRange(trip.startDate, trip.endDate);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: `linear-gradient(160deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
          fontFamily: "sans-serif",
        }}
      >
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            width={1080}
            height={1350}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.35) 100%)",
          }}
        />
        {mood && (
          <div
            style={{
              position: "absolute",
              top: 56,
              left: 56,
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "rgba(255,255,255,0.18)",
              padding: "14px 24px",
              borderRadius: 999,
            }}
          >
            <div style={{ display: "flex", fontSize: 40 }}>{mood.emoji}</div>
            <div style={{ display: "flex", fontSize: 26, color: "white", fontWeight: 600 }}>
              {mood.label}
            </div>
          </div>
        )}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            padding: 64,
            gap: 8,
          }}
        >
          <div style={{ display: "flex", width: 96, height: 6, borderRadius: 3, background: theme.accent }} />
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.08,
              marginTop: 12,
            }}
          >
            {trip.title}
          </div>
          {trip.destination && (
            <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.92)", fontWeight: 500 }}>
              {trip.destination}
            </div>
          )}
          {dateRange && (
            <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
              {dateRange}
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
