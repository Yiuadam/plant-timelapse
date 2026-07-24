import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";
import { TRAVEL_TYPES } from "@/lib/validation";

const ALLOWED_TYPES: Record<
  string,
  "image/jpeg" | "image/png" | "image/webp" | "image/gif"
> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const EXTRACTION_PROMPT = `This image is a travel booking document — a flight boarding pass or e-ticket, a hotel confirmation, or a train ticket. Extract the booking details and respond with ONLY a single JSON object (no markdown fences, no extra text) matching exactly this shape:

{
  "type": "flight" | "hotel" | "train" | null,
  "title": string | null,
  "detail": string | null,
  "location": string | null,
  "startAt": string | null,
  "endAt": string | null,
  "notes": string | null
}

Field guidance:
- "type": which kind of document this is.
- "title": the airline name, hotel name, or train operator.
- "detail": flight number / confirmation or booking code / room type — whichever is printed.
- "location": for a flight or train, the route as "ORIGIN → DESTINATION" (use airport/station codes or city names as printed); for a hotel, its address if printed.
- "startAt": departure time for a flight/train, or check-in time for a hotel, formatted EXACTLY as "YYYY-MM-DDTHH:mm" in 24-hour time, using the date/time as printed with no timezone conversion. If no year is printed, infer the nearest sensible upcoming year. Use null if genuinely unreadable.
- "endAt": arrival time for a flight/train, or check-out time for a hotel, same format. Use null if not printed or not applicable.
- "notes": anything else useful (seat number, gate, terminal) as a short string, or null.

Use null for any field you cannot read with confidence — never guess. Respond with ONLY the JSON object.`;

function parseExtractedJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Photo scanning is not configured (missing ANTHROPIC_API_KEY)" },
      { status: 503 },
    );
  }

  const { id: tripId } = await params;
  if (!(await canAccessTrip(tripId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mediaType = ALLOWED_TYPES[file.type];
  if (!mediaType) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WEBP, and GIF images are allowed" },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Image must be smaller than 10MB" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : null;
  const parsed = raw ? parseExtractedJson(raw) : null;

  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json(
      { error: "Could not read booking details from this image" },
      { status: 422 },
    );
  }

  const type = TRAVEL_TYPES.includes(parsed.type) ? parsed.type : null;

  return NextResponse.json({
    type,
    title: typeof parsed.title === "string" ? parsed.title : null,
    detail: typeof parsed.detail === "string" ? parsed.detail : null,
    location: typeof parsed.location === "string" ? parsed.location : null,
    startAt: typeof parsed.startAt === "string" ? parsed.startAt : null,
    endAt: typeof parsed.endAt === "string" ? parsed.endAt : null,
    notes: typeof parsed.notes === "string" ? parsed.notes : null,
  });
}
