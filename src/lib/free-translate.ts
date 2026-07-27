// A free, no-API-key machine translation fallback for sentences that
// aren't in the curated dictionary (src/lib/dictionary.ts) -- so
// /api/translate isn't entirely dependent on the Anthropic account having
// credit. Talks to a LibreTranslate-compatible HTTP API: open source,
// self-hostable, and its public community instances don't require a key
// for normal usage.
//
// The default URL below points at a public instance as a working
// out-of-the-box default. Public instances can rate-limit or go offline
// without notice -- set LIBRETRANSLATE_URL in the environment to point at
// a different public instance or a self-hosted one (a LibreTranslate
// Docker container is a one-line deploy) if the default stops working.
const DEFAULT_URL = "https://libretranslate.de/translate";
const TIMEOUT_MS = 9000;

// Common ISO 639-1 codes LibreTranslate returns, mapped to a display
// name. Not exhaustive -- anything missing just falls back to showing the
// raw code, which is still useful, just less friendly.
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  el: "Greek",
  he: "Hebrew",
  cs: "Czech",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  no: "Norwegian",
  uk: "Ukrainian",
  ro: "Romanian",
  hu: "Hungarian",
  fa: "Persian",
  ur: "Urdu",
  bn: "Bengali",
  sw: "Swahili",
};

export type FreeTranslateResult = {
  detectedLanguage: string;
  translatedText: string;
};

export async function freeTranslate(text: string): Promise<FreeTranslateResult | null> {
  const url = process.env.LIBRETRANSLATE_URL || DEFAULT_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "auto", target: "en", format: "text" }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("freeTranslate: non-OK response", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json().catch(() => null);
    const translatedText: string | undefined = data?.translatedText;
    const code: string | undefined = data?.detectedLanguage?.language;
    if (!translatedText) return null;
    return {
      detectedLanguage: code ? (LANGUAGE_NAMES[code] ?? code.toUpperCase()) : "Unknown",
      translatedText,
    };
  } catch (err) {
    console.error("freeTranslate: request failed", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
