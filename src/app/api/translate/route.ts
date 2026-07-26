import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

// A dictionary-style explanation can take a moment to generate.
export const maxDuration = 30;

const MAX_TEXT_LENGTH = 500;

const TRANSLATE_PROMPT = `The user typed a word or short phrase, possibly in a language other than English. Detect the language automatically -- do not ask, just decide (if it's already English, detect "English" and translate to itself or the closest natural phrasing). Then:
1. Give a direct, literal translation into English.
2. Give a short explanation, dictionary-entry style: part of speech if applicable, any nuance a literal translation misses, and/or a short usage example. Keep it to 1-3 sentences.

Respond with ONLY a single JSON object, nothing else -- no markdown code fences, no explanation before or after -- matching exactly this shape:
{
  "language": string | null,
  "translation": string | null,
  "explanation": string | null
}

"language" is the human-readable name of the detected source language (e.g. "Japanese", "French", "Thai"). If the input is empty or not real text in any language, respond with all three fields set to null.`;

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
      { error: "Something went wrong translating that — try again" },
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

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Type something to translate" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Keep it under ${MAX_TEXT_LENGTH} characters` },
      { status: 400 },
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let raw: string | null;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      // Claude Sonnet 5 runs adaptive thinking by default when `thinking` is
      // omitted, and max_tokens caps thinking + response combined -- for a
      // quick translation lookup that risked truncating the JSON response
      // before it finished. Disable thinking; this task doesn't need it.
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `${TRANSLATE_PROMPT}\n\nText: ${text}` },
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
      // Temporarily include the underlying status/message so we can see
      // exactly what Anthropic rejected -- this route was returning this
      // generic branch in production with no way to tell why. Revert to a
      // plain message once the real cause is confirmed.
      const detail = `${err.status ?? "?"}: ${err.message ?? "unknown"}`;
      return NextResponse.json(
        { error: `Translation service error — try again (${detail})` },
        { status: 502 },
      );
    }
    throw err;
  }

  const parsed = raw ? parseExtractedJson(raw) : null;
  const detectedLanguage: string | null = parsed?.language ?? null;
  const translatedText: string | null = parsed?.translation ?? null;
  const explanation: string | null = parsed?.explanation ?? null;

  const translation = await prisma.translation.create({
    data: {
      userId,
      originalText: text,
      detectedLanguage,
      translatedText,
      explanation,
    },
  });

  return NextResponse.json({ translation }, { status: 201 });
}
