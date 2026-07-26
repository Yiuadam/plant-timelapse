// Translates a curated city's display name to match the site's currently
// selected language, so a passport stamp for a destination typed in one
// language (e.g. "Sydney") still reads in whichever language the user has
// the site set to (e.g. "悉尼"), and vice versa. Only covers the ~145
// cities in city-translations.json (the curated bespoke + archetype
// landmark set); anything outside that just keeps the text the user typed,
// same as before.
import cityTranslations from "@/data/city-translations.json";
import { matchCityInMap, normalizeCityText } from "@/lib/city-landmarks";
import type { Lang } from "@/lib/i18n/dictionary";

const EN_TO_ZH: Record<string, string> = {};
const ZH_TO_EN: Record<string, string> = {};
for (const { en, zh } of cityTranslations as { en: string; zh: string }[]) {
  EN_TO_ZH[normalizeCityText(en)] = zh;
  ZH_TO_EN[normalizeCityText(zh)] = en;
}

export function localizeCityName(displayCity: string, lang: Lang): string {
  if (lang === "zh") {
    return matchCityInMap(displayCity, EN_TO_ZH) ?? displayCity;
  }
  return matchCityInMap(displayCity, ZH_TO_EN) ?? displayCity;
}
