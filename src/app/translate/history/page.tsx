import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function TranslateHistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const translations = await prisma.translation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Translation history</h1>
        <Link href="/translate" prefetch={true} className="text-sm underline">
          New translation
        </Link>
      </div>

      {translations.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          Nothing translated yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {translations.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-black/10 bg-white/60 p-3 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/20"
            >
              <div className="flex items-center gap-2">
                {t.detectedLanguage && (
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-medium dark:bg-white/15">
                    {t.detectedLanguage}
                  </span>
                )}
                <span className="text-xs text-black/40 dark:text-white/40">
                  {t.createdAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {t.originalText && (
                <p className="mt-1 truncate text-sm text-black/60 dark:text-white/60">
                  {t.originalText}
                </p>
              )}
              <p className="mt-0.5 truncate text-base font-medium">
                {t.translatedText ?? "No translation found"}
              </p>
              {t.explanation && (
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  {t.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
