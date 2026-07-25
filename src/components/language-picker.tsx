"use client";

import { useLanguage } from "@/lib/i18n/context";
import { LANGUAGES } from "@/lib/i18n/dictionary";

export default function LanguagePicker() {
  const { lang, setLang, t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      aria-label={t("nav_change_language")}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 text-sm font-medium shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/40"
    >
      <span aria-hidden>🌐</span>
      {LANGUAGES.find((l) => l.key === lang)?.label}
    </button>
  );
}
