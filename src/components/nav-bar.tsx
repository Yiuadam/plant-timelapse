"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/20">
      <Link href={session ? "/trips" : "/"} className="font-semibold">
        Travel Log
      </Link>
      <nav className="hidden items-center gap-4 text-sm sm:flex">
        {status === "authenticated" && (
          <>
            <Link
              href="/trips"
              prefetch={true}
              className={pathname.startsWith("/trips") ? "underline" : ""}
            >
              Trips
            </Link>
            <Link
              href="/timeline"
              prefetch={true}
              className={pathname.startsWith("/timeline") ? "underline" : ""}
            >
              Timeline
            </Link>
            <span className="text-black/50 dark:text-white/50">
              {session.user?.name ?? session.user?.email}
            </span>
            <button onClick={() => signOut({ callbackUrl: "/" })}>
              Log out
            </button>
          </>
        )}
        {status === "unauthenticated" && (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/register">Register</Link>
          </>
        )}
      </nav>
      {status === "unauthenticated" && (
        <nav className="flex items-center gap-4 text-sm sm:hidden">
          <Link href="/login">Log in</Link>
          <Link href="/register">Register</Link>
        </nav>
      )}
    </header>
  );
}
