import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { saveUploadedTranslationImage, UploadError } from "@/lib/uploads";

// A vision call on a large photo can take longer than the platform's
// default serverless timeout.
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

const TRANSLATE_PROMPT = `This photo contains text in a language the viewer doesn't read. Detect the language automatically -- do not ask, just decide. Then:
1. Transcribe the original text exactly as written (preserve line breaks where meaningful).
2. Translate it into natural, fluent English.

Respond with ONLY a single JSON object, nothing else -- no markdown code fences, no explanation before or after -- matching exactly this shape:
{
  "language": string | null,
  "originalText": string | null,
  "translation": string | null
}

"language" is the human-readable name of the detected language (e.g. "Japanese", "French", "Thai"). If there is no legible text in the image at all, respond with all three fields set to null. Do not include any other keys.`;

function parseExtractedJson(text: string) {
  let cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
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

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const translations = await prisma.translation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ translations });
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (err) {
    console.error("translate: unexpected error", err);
    return NextResponse.json(
      { error: "Something went wrong translating that photo — try again" },
      { status: 500 },
    );
  }
}

async function handlePost(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Translation is not configured (missing ANTHROPIC_API_KEY)" },
      { status: 503 },
    );
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

  let imageUrl: string;
  try {
    imageUrl = await saveUploadedTranslationImage(file, userId);
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let raw: string | null;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: TRANSLATE_PROMPT },
          ],
        },
      ],
    });
    const textBlock = message.content.find((block) => block.type === "text");
    raw = textBlock?.type === "text" ? textBlock.text : null;
  } catch (err) {
    console.error("translate: Anthropic request failed", err);
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Translation is misconfigured (invalid ANTHROPIC_API_KEY)" },
        { status: 503 },
      );
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      return NextResponse.json(
        { error: "Translation is misconfigured (API key lacks permission)" },
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
        { error: "Translation service error — try again" },
        { status: 502 },
      );
    }
    throw err;
  }

  const parsed = raw ? parseExtractedJson(raw) : null;
  const detectedLanguage: string | null = parsed?.language ?? null;
  const originalText: string | null = parsed?.originalText ?? null;
  const translatedText: string | null = parsed?.translation ?? null;

  const translation = await prisma.translation.create({
    data: { userId, imageUrl, detectedLanguage, originalText, translatedText },
  });

  return NextResponse.json({ translation }, { status: 201 });
}
