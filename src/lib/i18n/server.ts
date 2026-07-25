import { cookies } from "next/headers";
import { type Lang, type DictKey, t as translate } from "@/lib/i18n/dictionary";
import { LANG_COOKIE } from "@/lib/i18n/cookie";

export { LANG_COOKIE };

// Server Components can't use the client LanguageProvider context, so
// they read the same cookie the client writes to directly. Both sides
// agree on "en" as the default so a first-time visitor with no cookie
// yet sees the same language from the server-rendered HTML as the
// client-side default state.
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const value = store.get(LANG_COOKIE)?.value;
  return value === "zh" ? "zh" : "en";
}

export async function getT() {
  const lang = await getLang();
  return {
    lang,
    t: (key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
  };
}
