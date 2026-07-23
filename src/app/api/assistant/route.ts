import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { assistantChatSchema } from "@/lib/validation";

const SYSTEM_PROMPT =
  "You are the friendly in-app assistant for Travel Log, an app for recording trips, pinning visited places and a wishlist on a map, saving photos, and browsing a timeline of past travels. Answer questions about using the app and give general travel advice. Keep replies short and conversational.";

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
