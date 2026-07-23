import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { assistantChatSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

const SYSTEM_PROMPT =
  "You are the friendly in-app assistant for Travel Log, an app for recording trips, pinning visited places and a wishlist on a map, saving photos, and browsing a timeline of past travels. Answer questions about using the app and give general travel advice. You are given the user's own trip data below as context — use it to answer questions about their trips, but never invent trips, places, or dates that aren't listed. Keep replies short and conversational.";

const MAX_TRIPS_IN_CONTEXT = 25;
const MAX_CONTEXT_CHARS = 4000;

function formatDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

async function buildUserContext(userId: string): Promise<string> {
  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    take: MAX_TRIPS_IN_CONTEXT,
    include: {
      locations: { select: { name: true, visited: true } },
    },
  });

  if (trips.length === 0) {
    return "The user has not logged any trips yet.";
  }

  const lines = trips.map((trip) => {
    const visited = trip.locations
      .filter((l) => l.visited)
      .map((l) => l.name);
    const wishlist = trip.locations
      .filter((l) => !l.visited)
      .map((l) => l.name);
    const dates = [formatDate(trip.startDate), formatDate(trip.endDate)]
      .filter(Boolean)
      .join(" to ");

    const parts = [
      `- "${trip.title}"${trip.destination ? ` (${trip.destination})` : ""}`,
      dates ? `dates: ${dates}` : null,
      visited.length ? `visited: ${visited.join(", ")}` : null,
      wishlist.length ? `wishlist: ${wishlist.join(", ")}` : null,
    ].filter(Boolean);

    return parts.join(" | ");
  });

  return `The user's trips:\n${lines.join("\n")}`.slice(0, MAX_CONTEXT_CHARS);
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "The assistant is not configured (missing GROQ_API_KEY)" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = assistantChatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const userContext = await buildUserContext(userId);

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: userContext },
          ...parsed.data.messages,
        ],
        max_tokens: 400,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the assistant" },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "The assistant failed to respond" },
      { status: 502 },
    );
  }

  const data = await res.json();
  const reply: string | undefined = data.choices?.[0]?.message?.content;
  if (!reply) {
    return NextResponse.json(
      { error: "The assistant failed to respond" },
      { status: 502 },
    );
  }

  return NextResponse.json({ reply });
}
