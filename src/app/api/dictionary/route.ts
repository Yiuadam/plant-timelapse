import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DICTIONARY_LANGS, DICTIONARY_LANG_NAMES, lookupDictionaryEntry } from "@/lib/dictionary";

// A public, read-only, reusable dictionary API -- meant to be called from
// this app AND from other, unrelated projects, not just as an internal
// endpoint. Two things make that possible:
//
// 1. CORS is wide open (Access-Control-Allow-Origin: *) since this only
//    ever returns non-sensitive, non-personalized reference data -- no
//    cookies, no auth, nothing user-specific.
// 2. An optional API key gate: if DICTIONARY_API_KEY is set in the
//    environment, requests must send it as `x-api-key`; if it's unset
//    (the default), the endpoint stays open. Set that env var in Vercel
//    whenever this should stop being public.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "x-api-key",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const apiKey = process.env.DICTIONARY_API_KEY;
  if (apiKey && request.headers.get("x-api-key") !== apiKey) {
    return json({ error: "Invalid or missing x-api-key" }, 401);
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const category = url.searchParams.get("category");
  const all = url.searchParams.get("all");
  const lang = url.searchParams.get("lang");

  if (q) {
    const hit = await lookupDictionaryEntry(q);
    if (!hit) return json({ found: false, query: q });
    const { entry, matchedLang } = hit;
    return json({
      found: true,
      query: q,
      matchedLanguage: matchedLang,
      matchedLanguageName: DICTIONARY_LANG_NAMES[matchedLang],
      key: entry.key,
      category: entry.category,
      translation: lang ? entry.translations[lang as (typeof DICTIONARY_LANGS)[number]] ?? null : undefined,
      translations: entry.translations,
    });
  }

  if (all === "true" || category) {
    const rows = await prisma.dictionaryEntry.findMany({
      where: category ? { category } : undefined,
      orderBy: { key: "asc" },
    });
    return json({
      languages: DICTIONARY_LANGS,
      count: rows.length,
      entries: rows.map((r) => ({ key: r.key, category: r.category, translations: r.translations })),
    });
  }

  // No params: self-documenting usage summary instead of an error, so
  // hitting the bare URL in a browser explains how to use it.
  return json({
    name: "Travel Log Dictionary API",
    description:
      "A curated multilingual word/phrase dictionary, free to reuse from any project.",
    languages: DICTIONARY_LANGS,
    usage: {
      lookup: "/api/dictionary?q=hello (matches any covered language, not just English)",
      lookupTargetLang: "/api/dictionary?q=hello&lang=zh",
      byCategory: "/api/dictionary?category=food",
      fullExport: "/api/dictionary?all=true",
    },
    auth: process.env.DICTIONARY_API_KEY
      ? "Required: send header 'x-api-key'."
      : "None currently required (open). Set DICTIONARY_API_KEY in the environment to require one.",
  });
}
