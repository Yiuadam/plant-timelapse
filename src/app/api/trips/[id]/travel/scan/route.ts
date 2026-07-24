import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";
import { TRAVEL_TYPES } from "@/lib/validation";

// A vision call on a large/high-res image (common for ticket screenshots)
// can take longer than the platform's default serverless timeout.
export const maxDuration = 60;

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

const EXTRACTION_PROMPT = `This image is a travel booking document — a flight boarding pass or e-ticket, a hotel confirmation, or a train ticket. It may be in any language, including Chinese (e.g. a 12306 电子客票/火车票 train ticket, a Chinese airline boarding pass, or a Chinese hotel confirmation) — read and translate/transliterate as needed, the document's language does not matter. Extract the booking details and respond with ONLY a single JSON object, nothing else — no markdown code fences, no explanation before or after — matching exactly this shape:

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
- "type": which kind of document this is. A Chinese train ticket (车次 like "G1234", 检票口/座位号) is "train".
- "title": the airline name, hotel name, or train operator (e.g. "中国铁路" / "China Railway" is fine as printed, or translate to English — either is acceptable).
- "detail": flight number / confirmation or booking code / room type / train number (车次) — whichever is printed.
- "location": for a flight or train, the route as "ORIGIN → DESTINATION" using station/city names as printed (e.g. a Chinese ticket's 出发站 → 到达站, such as "北京南 → 上海虹桥"); for a hotel, its address if printed.
- "startAt": departure time for a flight/train, or check-in time for a hotel, formatted EXACTLY as "YYYY-MM-DDTHH:mm" in 24-hour time (convert from any calendar/format printed, e.g. Chinese "2026年07月25日 14:30" becomes "2026-07-25T14:30"), using the date/time as printed with no timezone conversion. If no year is printed, infer the nearest sensible upcoming year. Use null only if genuinely unreadable.
- "endAt": arrival time for a flight/train, or check-out time for a hotel, same format. Use null if not printed or not applicable.
- "notes": anything else useful (seat number/座位号, gate, terminal, carriage/车厢) as a short string, or null.

Use null for any field you truly cannot read — but make a best effort first, including translating or transliterating non-English text; do not return null just because the document isn't in English. Respond with ONLY the JSON object and nothing else.`;

function parseExtractedJson(text: string) {
  let cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  // Claude occasionally wraps the JSON in a sentence or two despite being
  // told not to (more likely on trickier/non-English documents) — fall
  // back to the outermost {...} block so a little stray prose doesn't
  // break parsing.
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }
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

  let raw: string | null;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 700,
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
    raw = textBlock?.type === "text" ? textBlock.text : null;
  } catch (err) {
    // Nothing here was previously caught, so any failure calling
    // Anthropic — a bad/expired API key, no credits, a rate limit, an
    // outage — crashed the route handler uncaught. Next.js then returned
    // a generic non-JSON error page, which the client could only report
    // as a vague, misleading upload failure. Surface the real cause
    // instead, both server-side (Vercel function logs) and to the
    // client, so config problems don't masquerade as "photo too big."
    console.error("travel scan: Anthropic request failed", err);
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Photo scanning is misconfigured (invalid ANTHROPIC_API_KEY)" },
        { status: 503 },
      );
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      return NextResponse.json(
        { error: "Photo scanning is misconfigured (API key lacks permission)" },
        { status: 503 },
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited — wait a moment and try again" },
        { status: 429 },
      );
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `AI service error (${err.status ?? "unknown"}) — try again` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Something went wrong scanning that photo — try again" },
      { status: 500 },
    );
  }

  const parsed = raw ? parseExtractedJson(raw) : null;

  if (!parsed || typeof parsed !== "object") {
    // Logged (not exposed to the client) so a Vercel function log shows
    // exactly what the model returned when parsing fails — useful for
    // spotting cases like unexpected preamble text or a refusal that
    // slipped past the prompt's "JSON only" instruction.
    console.error("travel scan: could not parse model output", raw);
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
