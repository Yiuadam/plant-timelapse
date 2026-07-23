import { NextResponse } from "next/server";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const MEDIA_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { trip: true },
  });
  if (!photo || photo.trip.userId !== userId) {
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
  const recognition = textBlock?.type === "text" ? textBlock.text : null;

  const updated = await prisma.photo.update({
    where: { id },
    data: { recognition, recognizedAt: new Date() },
  });

  return NextResponse.json(updated);
}
