"use client";

import { useEffect, useState } from "react";
import { forceRepaint } from "@/lib/force-repaint";

const STORAGE_KEY = "theme";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  localStorage.setItem(STORAGE_KEY, theme);
  forceRepaint();
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const kickoff = setTimeout(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }, 0);
    return () => clearTimeout(kickoff);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark and light mode"
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 text-sm font-medium shadow-sm backdrop-blur-md transition hover:bg-white/90 dark:border-white/15 dark:bg-black/40 dark:hover:bg-black/60"
    >
      {theme === "dark" ? (
        <>
          <span aria-hidden>🌙</span>
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : (
        <>
          <span aria-hidden>☀️</span>
          <span className="hidden sm:inline">Light</span>
        </>
      )}
    </button>
  );
}
