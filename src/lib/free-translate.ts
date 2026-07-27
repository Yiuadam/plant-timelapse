// A free, no-API-key machine translation fallback for sentences that
// aren't in the curated dictionary (src/lib/dictionary.ts) -- so
// /api/translate isn't entirely dependent on the Anthropic account having
// credit. Talks to a LibreTranslate-compatible HTTP API: open source,
// self-hostable, and its public community instances don't require a key
// for normal usage.
//
// A single public instance turned out to be too fragile in production
// (libretranslate.de alone silently failed on first real use, with no way
// to see why from this sandbox -- its domain, and every other public
// LibreTranslate mirror, is explicitly blocked by this dev environment's
// proxy, so the request/response *logic* could only be verified against a
// mock, never a real call). Trying several known public instances in
// order is the resilient fix: if one is down, rate-limited, or now
// requires a key, the next one is tried before giving up. Set
// LIBRETRANSLATE_URL to make one specific instance (or a self-hosted one)
// the *first* one tried, ahead of this list.
const CANDIDATE_URLS = [
  "https://translate.terraprint.co/translate",
  "https://libretranslate.de/translate",
  "https://lt.vern.cc/translate",
];
// Kept short because these are tried in sequence -- the route's own
// maxDuration (30s) has to cover every attempt here plus a possible
// Claude fallback afterward, so a slow/timing-out instance can't be
// allowed to eat most of that budget on its own.
const TIMEOUT_MS = 4000;

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

async function tryOne(url: string, text: string): Promise<FreeTranslateResult | null> {
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
      console.error("freeTranslate:", url, "non-OK response", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json().catch(() => null);
    const translatedText: string | undefined = data?.translatedText;
    const code: string | undefined = data?.detectedLanguage?.language;
    if (!translatedText) {
      console.error("freeTranslate:", url, "unexpected response shape", JSON.stringify(data));
      return null;
    }
    return {
      detectedLanguage: code ? (LANGUAGE_NAMES[code] ?? code.toUpperCase()) : "Unknown",
      translatedText,
    };
  } catch (err) {
    console.error("freeTranslate:", url, "request failed", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function freeTranslate(text: string): Promise<FreeTranslateResult | null> {
  const configured = process.env.LIBRETRANSLATE_URL;
  const urls = configured ? [configured, ...CANDIDATE_URLS] : CANDIDATE_URLS;

  for (const url of urls) {
    const result = await tryOne(url, text);
    if (result) return result;
  }
  return null;
}
