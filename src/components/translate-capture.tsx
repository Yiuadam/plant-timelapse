"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";

type Result = {
  detectedLanguage: string | null;
  translatedText: string | null;
  explanation: string | null;
};

export default function TranslateCapture() {
  const router = useRouter();
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("translate_failed"));
        return;
      }
      setResult(data.translation);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("translate_placeholder")}
          rows={3}
          maxLength={500}
          className="resize-none rounded-2xl border-2 border-dashed border-black/15 bg-black/[0.02] px-4 py-3 text-base focus:border-black/30 focus:outline-none dark:border-white/20 dark:bg-white/[0.03] dark:focus:border-white/40"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {loading ? t("translate_translating") : t("translate_button")}
        </button>
        <p className="text-center text-xs text-black/50 dark:text-white/50">
          {t("translate_auto_detect")}
        </p>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/20">
          {result.detectedLanguage ? (
            <span className="inline-block w-fit rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
              {result.detectedLanguage}
            </span>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">
              {t("translate_no_text")}
            </p>
          )}
          {result.translatedText && (
            <div>
              <div className="mb-1 text-xs font-medium text-black/50 dark:text-white/50">
                {t("translate_result_translation")}
              </div>
              <p className="text-lg font-medium whitespace-pre-wrap">
                {result.translatedText}
              </p>
            </div>
          )}
          {result.explanation && (
            <div>
              <div className="mb-1 text-xs font-medium text-black/50 dark:text-white/50">
                {t("translate_result_explanation")}
              </div>
              <p className="text-sm whitespace-pre-wrap text-black/70 dark:text-white/70">
                {result.explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
