"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  imageUrl: string;
  detectedLanguage: string | null;
  originalText: string | null;
  translatedText: string | null;
};

export default function TranslateCapture() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/translate", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Translation failed");
        return;
      }
      setResult(data.translation);
      router.refresh();
    } finally {
      setLoading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-black/15 bg-black/[0.02] px-6 py-12 text-center transition hover:bg-black/[0.04] dark:border-white/20 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
        <span className="text-4xl" aria-hidden>
          📷
        </span>
        <span className="text-sm font-medium">
          {loading ? "Reading & translating..." : "Take a photo or upload an image"}
        </span>
        <span className="text-xs text-black/50 dark:text-white/50">
          Language is detected automatically
        </span>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
          disabled={loading}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/20">
          {result.detectedLanguage ? (
            <span className="inline-block w-fit rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
              {result.detectedLanguage}
            </span>
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">
              No legible text was found in that photo.
            </p>
          )}
          {result.originalText && (
            <div>
              <div className="mb-1 text-xs font-medium text-black/50 dark:text-white/50">
                Original
              </div>
              <p className="text-sm whitespace-pre-wrap">{result.originalText}</p>
            </div>
          )}
          {result.translatedText && (
            <div>
              <div className="mb-1 text-xs font-medium text-black/50 dark:text-white/50">
                Translation
              </div>
              <p className="text-lg font-medium whitespace-pre-wrap">
                {result.translatedText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
