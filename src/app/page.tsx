import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/trips");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Travel Log</h1>
      <p className="max-w-md text-lg text-black/60 dark:text-white/60">
        Record your trips, pin the places you visit, keep your photos, and
        track what you spend along the way.
      </p>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="rounded bg-foreground px-5 py-2.5 text-background"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded border border-black/10 px-5 py-2.5 dark:border-white/20"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
