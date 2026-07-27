"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "@/components/theme-toggle";
import FlavorPicker from "@/components/flavor-picker";
import LanguagePicker from "@/components/language-picker";
import { useLanguage } from "@/lib/i18n/context";

export default function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/20">
      <Link href="/" className="font-semibold">
        Travel Log
      </Link>
      <div className="flex items-center gap-3">
        <nav className="hidden items-center gap-4 text-sm sm:flex">
          {status === "authenticated" && (
            <>
              <Link
                href="/trips"
                prefetch={true}
                className={pathname.startsWith("/trips") ? "underline" : ""}
              >
                {t("nav_trips")}
              </Link>
              <Link
                href="/timeline"
                prefetch={true}
                className={pathname.startsWith("/timeline") ? "underline" : ""}
              >
                {t("nav_timeline")}
              </Link>
              <Link
                href="/passport"
                prefetch={true}
                className={pathname.startsWith("/passport") ? "underline" : ""}
              >
                {t("nav_passport")}
              </Link>
              <Link
                href="/profile"
                prefetch={true}
                className={pathname.startsWith("/profile") ? "underline" : ""}
              >
                {t("nav_profile")}
              </Link>
              <span className="text-black/50 dark:text-white/50">
                {session.user?.name ?? session.user?.email}
              </span>
              <button onClick={() => signOut({ callbackUrl: "/" })}>
                {t("nav_logout")}
              </button>
            </>
          )}
          {status === "unauthenticated" && (
            <>
              <Link href="/login">{t("nav_login")}</Link>
              <Link href="/register">{t("nav_register")}</Link>
            </>
          )}
        </nav>
        {status === "unauthenticated" && (
          <nav className="flex items-center gap-4 text-sm sm:hidden">
            <Link href="/login">{t("nav_login")}</Link>
            <Link href="/register">{t("nav_register")}</Link>
          </nav>
        )}
        <LanguagePicker />
        <FlavorPicker />
        <ThemeToggle />
      </div>
    </header>
  );
}
