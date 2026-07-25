import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TranslateCapture from "@/components/translate-capture";

export default async function TranslatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Translate</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Type a word or phrase to translate it, with a short explanation.
          </p>
        </div>
        <Link
          href="/translate/history"
          prefetch={true}
          aria-label="Translation history"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3 text-sm dark:border-white/20"
        >
          <span aria-hidden>🕘</span> History
        </Link>
      </div>
      <TranslateCapture />
    </div>
  );
}
