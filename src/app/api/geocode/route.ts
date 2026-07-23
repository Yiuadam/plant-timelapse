import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export async function GET(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q.slice(0, 200));
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");

  let data: NominatimResult[];
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TravelLog/1.0 (personal travel journal app)",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Search failed" }, { status: 502 });
    }
    data = await res.json();
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }

  const results = data.map((item) => ({
    name: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));

  return NextResponse.json({ results });
}
