import { prisma } from "@/lib/prisma";

// The 12 languages the curated dictionary covers (see
// src/data/dictionary-seed.json). Not "every famous language" -- a
// hand-curated set this size can't be -- but a solid, disclosed core of
// major world languages.
export const DICTIONARY_LANGS = [
  "en",
  "zh",
  "es",
  "fr",
  "de",
  "ja",
  "ko",
  "pt",
  "it",
  "ru",
  "ar",
  "hi",
] as const;
export type DictLang = (typeof DICTIONARY_LANGS)[number];

export const DICTIONARY_LANG_NAMES: Record<DictLang, string> = {
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
};

export type DictionaryTranslations = Partial<Record<DictLang, string>>;

export type DictionaryEntryDTO = {
  key: string;
  category: string | null;
  translations: DictionaryTranslations;
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

// Finds the dictionary entry whose canonical key OR whose text in ANY
// covered language matches the input, so typing "hello", "你好", or
// "hola" all resolve to the same entry. Returns which language actually
// matched, since that's the "detected language" callers want.
export async function lookupDictionaryEntry(
  text: string,
): Promise<{ entry: DictionaryEntryDTO; matchedLang: DictLang } | null> {
  const normalized = normalize(text);
  if (!normalized) return null;

  const exact = await prisma.dictionaryEntry.findUnique({ where: { key: normalized } });
  if (exact) {
    return {
      entry: {
        key: exact.key,
        category: exact.category,
        translations: exact.translations as DictionaryTranslations,
      },
      matchedLang: "en",
    };
  }

  // The table is small (~130 rows), so a full scan for a match against any
  // language's text is simpler and cheap enough, rather than maintaining
  // per-language indexed columns.
  const all = await prisma.dictionaryEntry.findMany();
  for (const row of all) {
    const translations = row.translations as DictionaryTranslations;
    for (const lang of DICTIONARY_LANGS) {
      const value = translations[lang];
      if (value && normalize(value) === normalized) {
        return { entry: { key: row.key, category: row.category, translations }, matchedLang: lang };
      }
    }
  }
  return null;
}
