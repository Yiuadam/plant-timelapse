import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TranslateCapture from "@/components/translate-capture";
import { getT } from "@/lib/i18n/server";

export default async function TranslatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { t } = await getT();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("translate_title")}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {t("translate_subtitle")}
          </p>
        </div>
        <Link
          href="/translate/history"
          prefetch={true}
          aria-label={t("translate_history")}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3 text-sm dark:border-white/20"
        >
          <span aria-hidden>🕘</span> {t("translate_history")}
        </Link>
      </div>
      <TranslateCapture />
      <p className="mt-6 text-center text-xs text-black/60 dark:text-white/60">
        Common words are matched instantly from a built-in 12-language
        dictionary, publicly reusable at{" "}
        <Link href="/api/dictionary" prefetch={false} className="underline">
          /api/dictionary
        </Link>
        . Anything else translates through a free machine-translation
        service — no AI credit required.
      </p>
    </div>
  );
}
