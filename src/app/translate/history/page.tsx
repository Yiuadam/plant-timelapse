import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";

export default async function TranslateHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { t } = await getT();

  const translations = await prisma.translation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("translate_history_title")}</h1>
        <Link href="/translate" prefetch={true} className="text-sm underline">
          {t("translate_history_new")}
        </Link>
      </div>

      {translations.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          {t("translate_history_empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {translations.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-black/10 bg-white/60 p-3 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/20"
            >
              <div className="flex items-center gap-2">
                {entry.detectedLanguage && (
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-medium dark:bg-white/15">
                    {entry.detectedLanguage}
                  </span>
                )}
                <span className="text-xs text-black/40 dark:text-white/40">
                  {entry.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {entry.originalText && (
                <p className="mt-1 truncate text-sm text-black/60 dark:text-white/60">
                  {entry.originalText}
                </p>
              )}
              <p className="mt-0.5 truncate text-base font-medium">
                {entry.translatedText ?? t("translate_no_text")}
              </p>
              {entry.explanation && (
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  {entry.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
