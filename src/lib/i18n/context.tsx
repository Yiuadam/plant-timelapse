"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type Lang, type DictKey, t as translate } from "@/lib/i18n/dictionary";
import { LANG_COOKIE } from "@/lib/i18n/cookie";
import { forceRepaint } from "@/lib/force-repaint";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

// initialLang comes from the server (the same cookie this provider
// writes to), so the client's first render already matches whatever
// Server Components rendered -- no language flash on load.
export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback(
    (next: Lang) => {
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
      setLangState(next);
      // Server Components read the language from this same cookie, so
      // they need a refresh to pick up the change; forceRepaint covers
      // the same iOS backdrop-filter stale-paint issue the theme/style
      // pickers work around.
      router.refresh();
      forceRepaint();
    },
    [router],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
