import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";
import {
  fetchNearbyPlaces,
  fetchCityAreas,
  fetchCityAreaShapes,
} from "@/lib/nearby-places";
import { geocodeDestination, isBroadDestination } from "@/lib/geocode-destination";
import {
  readCache,
  writeCache,
  readSharedCache,
  writeSharedCache,
  preloadDistrictsNearby,
} from "@/lib/nearby-cache";
import type { NearbyResult } from "@/lib/nearby-places";
import type { AreaShape } from "@/lib/area-shapes";

// Worst case inside this budget: a geocode, an area-shape lookup, and
// two full passes over the Overpass mirror list at 6s per attempt (see
// TIMEOUT_MS in nearby-places.ts).
export const maxDuration = 45;

// The response is a newline-delimited JSON stream rather than a single
// body: `{type:"progress", value, label}` events as each phase of the
// pipeline actually completes, then exactly one `{type:"result", data}`.
// This exists because the client's progress bar previously had nothing
// real to show -- a single-shot response reports nothing until it's
// done, so any bar drawn against it is a guess by construction. Every
// progress event here corresponds to finished work: a geocode that
// resolved, a mirror attempt that completed, photos that attached.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await canAccessTrip(id, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!trip.destination?.trim()) {
    return NextResponse.json(
      { error: "Set a destination on this trip first" },
      { status: 200 },
    );
  }

  // A fresh cached answer needs no progress reporting at all -- it's
  // done before the client could draw a first frame.
  const cached = readCache(trip);
  if (cached && !cached.stale) {
    return NextResponse.json(cached.result);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      const progress = (value: number, label: string) =>
        send({ type: "progress", value, label });
      const finish = (data: unknown) => {
        send({ type: "result", data });
        closed = true;
        controller.close();
      };

      try {
        // Hard ceiling for every Overpass attempt in this request,
        // slightly inside maxDuration so the stream always gets to send
        // its result (or the stale fallback) before the platform kills
        // the function mid-response.
        const deadlineAt = Date.now() + (maxDuration - 5) * 1000;

        // The area-lookup phase (finding the containing city, then its
        // districts) gets its OWN, smaller ceiling, separate from the
        // overall one. Without this, a slow or very broad query -- a
        // whole PROVINCE like Yunnan is a much bigger Overpass
        // computation than one city's districts -- could burn the
        // entire request budget on the picker convenience, starving the
        // core "what's nearby" result of the time it needs and turning
        // it into the "temporarily unavailable" error users actually
        // notice. Losing the district picker to a slow query is fine;
        // it falls through to plain results. Losing the plain results
        // themselves is the failure this exists to prevent.
        const areaDeadlineAt = Math.min(deadlineAt, Date.now() + 18000);

        let lat = trip.destLat;
        let lng = trip.destLng;
        let addressType = trip.destAddressType;

        if (lat == null || lng == null) {
          progress(0.05, "Locating the destination…");
          const geocoded = await geocodeDestination(trip.destination!);
          if (!geocoded) {
            return finish({ error: "Couldn't locate that destination" });
          }
          lat = geocoded.lat;
          lng = geocoded.lng;
          addressType = geocoded.type;
          await prisma.trip.update({
            where: { id },
            data: { destLat: lat, destLng: lng, destAddressType: addressType },
          });
        }
        progress(0.2, "Destination located");

        if (!trip.destAreaConfirmed && isBroadDestination(addressType)) {
          progress(0.25, "Tracing the city's districts…");
          // The two area lookups are the slowest thing this route does
          // when Overpass is struggling, so each mirror attempt reports
          // in: shapes across 0.25..0.6, the centroid fallback across
          // 0.6..0.9. Without this the bar sat still through both.
          // "shapes4": shapes3 entries could have been built before a
          // single relation's own rogue member ring was filtered out --
          // live-verified on Shenzhen's real 龙岗区 (Longgang) relation,
          // which OSM currently lists with a stray "outer" way ~100km
          // south in open sea, stretching the shape's own bounding box.
          // Serving one of those back would keep shipping the broken
          // geometry even after the fix landed.
          const shapes =
            (await readSharedCache<AreaShape[]>("shapes4", lat, lng)) ??
            (await fetchCityAreaShapes(
              lat,
              lng,
              trip.destination ?? undefined,
              (f) => progress(0.25 + f * 0.35, "Tracing the city's districts…"),
              areaDeadlineAt,
            ));
          if (shapes && shapes.length > 0) {
            await writeSharedCache("shapes4", lat, lng, shapes);
            progress(0.95, "Districts found");
            // Warms the shared cache for the districts a user is most
            // likely to tap next. Scheduled for AFTER this response is
            // sent -- it must never delay showing the picker itself.
            if (trip.destination) {
              after(() => preloadDistrictsNearby(shapes, trip.destination!));
            }
            return finish({
              needsAreaSelection: true,
              cityLabel: trip.destination,
              areas: shapes.map(
                ({ name, lat: aLat, lng: aLng, distanceMeters }) => ({
                  name,
                  lat: aLat,
                  lng: aLng,
                  distanceMeters,
                }),
              ),
              shapes,
            });
          }

          const areas = await fetchCityAreas(
            lat,
            lng,
            (f) => progress(0.6 + f * 0.3, "Looking up district names…"),
            areaDeadlineAt,
          );
          if (areas && areas.length > 0) {
            if (trip.destination) {
              after(() => preloadDistrictsNearby(areas, trip.destination!));
            }
            progress(0.95, "Districts found");
            return finish({
              needsAreaSelection: true,
              cityLabel: trip.destination,
              areas,
            });
          }
          // No areas found (or the lookup itself failed) -- fall through
          // to plain nearby results rather than leaving the user stuck.
        }

        const shared = await readSharedCache<NearbyResult>("nearby", lat, lng);
        if (shared) {
          await writeCache(id, shared);
          return finish(shared);
        }

        // fetchNearbyPlaces reports its own completion in [0..1] as each
        // mirror attempt and then the photo pass finishes; mapped onto
        // the remaining 30%..95% of the overall pipeline.
        progress(0.3, "Scanning for places nearby…");
        const nearby = await fetchNearbyPlaces(
          lat,
          lng,
          (f) =>
            progress(
              0.3 + f * 0.65,
              f < 0.7 ? "Scanning for places nearby…" : "Fetching photos…",
            ),
          deadlineAt,
        );
        if (!nearby) {
          // Overpass is having a bad day. A stale answer for these same
          // coordinates beats an error -- the places haven't moved.
          if (cached) {
            return finish(cached.result);
          }
          return finish({
            error: "Nearby lookup is temporarily unavailable — try again shortly",
          });
        }

        await writeCache(id, nearby);
        await writeSharedCache("nearby", lat, lng, nearby);
        finish(nearby);
      } catch (err) {
        console.error("nearby route:", err);
        if (!closed) {
          finish(
            cached
              ? cached.result
              : { error: "Nearby lookup is temporarily unavailable — try again shortly" },
          );
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
