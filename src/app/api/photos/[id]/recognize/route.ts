import { NextResponse } from "next/server";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { canAccessTrip } from "@/lib/trip-access";

// Re-fetching the stored photo and running it through Claude Vision can
// take longer than the platform's default serverless timeout -- see the
// same fix already applied to the travel-scan and translate routes.
export const maxDuration = 60;

const MEDIA_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return await handlePost(context);
  } catch (err) {
    // Without this, any failure here (a bad/expired API key, no credits,
    // a rate limit, an outage, a network blip fetching the stored photo)
    // crashed uncaught and came back as a generic non-JSON error page --
    // the client could only report a vague "Recognition failed" with no
    // way to tell what actually broke. This is the same fix the
    // travel-scan and translate routes already got; recognize was the
    // original photo-recognition feature and predates that pattern.
    console.error("photo recognize: unexpected error", err);
    return NextResponse.json(
      { error: "Something went wrong recognizing that photo — try again" },
      { status: 500 },
    );
  }
}

async function handlePost({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Photo recognition is not configured (missing ANTHROPIC_API_KEY)" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo || !(await canAccessTrip(photo.tripId, userId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(photo.filePath).toLowerCase();
  const mediaType = MEDIA_TYPES[ext];
  if (!mediaType) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }

  const imageResponse = await fetch(photo.filePath);
  if (!imageResponse.ok) {
    return NextResponse.json({ error: "Could not fetch image" }, { status: 502 });
  }
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64 = buffer.toString("base64");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let recognition: string | null;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "image/gif",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Identify what's in this travel photo. Name any recognizable landmark, city, or place if possible, and list a few short descriptive tags. Answer in 2-3 concise sentences, no markdown headers.",
            },
          ],
        },
      ],
    });
    const textBlock = message.content.find((block) => block.type === "text");
    recognition = textBlock?.type === "text" ? textBlock.text : null;
  } catch (err) {
    console.error("photo recognize: Anthropic request failed", err);
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Photo recognition is misconfigured (invalid ANTHROPIC_API_KEY)" },
        { status: 503 },
      );
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      return NextResponse.json(
        { error: "Photo recognition is misconfigured (API key lacks permission)" },
        { status: 503 },
      );
    }
    if (err instanceof Anthropic.NotFoundError) {
      return NextResponse.json(
        { error: "Photo recognition is misconfigured (model not found)" },
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
    throw err;
  }

  const updated = await prisma.photo.update({
    where: { id },
    data: { recognition, recognizedAt: new Date() },
  });

  return NextResponse.json(updated);
}
