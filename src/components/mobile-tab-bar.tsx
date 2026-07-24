"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

function TabLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium ${
        active
          ? "text-foreground"
          : "text-black/45 dark:text-white/45"
      }`}
    >
      <span className="text-xl leading-none" aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  );
}

export default function MobileTabBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);

  if (status !== "authenticated") return null;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black/10 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden dark:border-white/15 dark:bg-neutral-900/90"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <TabLink
          href="/trips"
          label="Trips"
          icon="🧳"
          active={pathname.startsWith("/trips")}
        />
        <TabLink
          href="/timeline"
          label="Timeline"
          icon="🗓️"
          active={pathname.startsWith("/timeline")}
        />
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium ${
            accountOpen ? "text-foreground" : "text-black/45 dark:text-white/45"
          }`}
        >
          <span className="text-xl leading-none" aria-hidden>
            👤
          </span>
          You
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
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full rounded-xl bg-foreground py-3 text-center text-sm font-medium text-background"
              >
                Log out
              </button>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                className="mt-2 w-full rounded-xl border border-black/10 py-3 text-center text-sm dark:border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
