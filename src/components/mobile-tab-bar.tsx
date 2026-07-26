"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useLanguage } from "@/lib/i18n/context";

function TabLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={`flex flex-1 items-center justify-center py-3 text-base font-medium ${
        active
          ? "text-foreground"
          : "text-black/45 dark:text-white/45"
      }`}
    >
      {label}
    </Link>
  );
}

export default function MobileTabBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const { t } = useLanguage();

  if (status !== "authenticated") return null;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black/10 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden dark:border-white/15 dark:bg-neutral-900/90"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <TabLink
          href="/trips"
          label={t("nav_trips")}
          active={pathname.startsWith("/trips")}
        />
        <TabLink
          href="/timeline"
          label={t("nav_timeline")}
          active={pathname.startsWith("/timeline")}
        />
        <TabLink
          href="/passport"
          label={t("nav_passport")}
          active={pathname.startsWith("/passport")}
        />
        <TabLink
          href="/translate"
          label={t("nav_translate")}
          active={pathname.startsWith("/translate")}
        />
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className={`flex flex-1 items-center justify-center py-3 text-base font-medium ${
            accountOpen ? "text-foreground" : "text-black/45 dark:text-white/45"
          }`}
        >
          {t("nav_you")}
        </button>
      </nav>

      {accountOpen &&
        createPortal(
          <div className="sm:hidden">
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setAccountOpen(false)}
            />
            <div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-black/10 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-white/15 dark:bg-neutral-900"
            >
              <div className="mb-4 truncate text-center text-sm text-black/60 dark:text-white/60">
                {session?.user?.name ?? session?.user?.email}
              </div>
              <Link
                href="/profile"
                onClick={() => setAccountOpen(false)}
                className="mb-2 block w-full rounded-xl border border-black/10 py-3 text-center text-sm text-black dark:border-white/20 dark:text-white"
              >
                {t("nav_edit_profile")}
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="mt-2 w-full rounded-xl bg-foreground py-3 text-center text-sm font-medium text-background"
              >
                {t("nav_logout")}
              </button>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="mt-2 w-full rounded-xl border border-black/10 py-3 text-center text-sm text-black dark:border-white/20 dark:text-white"
              >
                {t("cancel")}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
