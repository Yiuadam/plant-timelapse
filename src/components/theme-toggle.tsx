"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  localStorage.setItem(STORAGE_KEY, theme);
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
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle dark and light mode"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-md transition hover:bg-white/90 dark:border-white/15 dark:bg-black/40 dark:hover:bg-black/60"
      >
        {theme === "dark" ? (
          <>
            <span aria-hidden>🌙</span> Dark
          </>
        ) : (
          <>
            <span aria-hidden>☀️</span> Light
          </>
        )}
      </button>
    </div>
  );
}
