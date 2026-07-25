"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { forceRepaint } from "@/lib/force-repaint";

const FLAVORS = [
  { key: "minimalist", label: "Minimalist", swatch: "bg-slate-300" },
  { key: "playful", label: "Playful", swatch: "bg-pink-400" },
  { key: "ink", label: "Ink", swatch: "bg-stone-500" },
  { key: "sketch", label: "Sketch", swatch: "bg-amber-600" },
] as const;

const STORAGE_KEY = "flavor";

function applyFlavor(flavor: string) {
  document.documentElement.setAttribute("data-flavor", flavor);
  localStorage.setItem(STORAGE_KEY, flavor);
  forceRepaint();
}

export default function FlavorPicker() {
  const [flavor, setFlavor] = useState<string>("minimalist");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const kickoff = setTimeout(() => {
      setFlavor(document.documentElement.getAttribute("data-flavor") ?? "minimalist");
    }, 0);
    return () => clearTimeout(kickoff);
  }, []);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.right - 176 });
    }
    setOpen((o) => !o);
  }

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={`Change site style (currently ${flavor})`}
        className="flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 text-sm font-medium shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-black/40"
      >
        <span aria-hidden>🎨</span>
      </button>
      {open &&
        pos &&
        createPortal(
          <div>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[9999] flex w-44 flex-col gap-0.5 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg dark:border-white/20 dark:bg-neutral-800"
              style={{ top: pos.top, left: pos.left }}
            >
              {FLAVORS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    applyFlavor(f.key);
                    setFlavor(f.key);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                    f.key === flavor
                      ? "bg-black/10 font-medium dark:bg-white/15"
                      : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${f.swatch}`} />
                  {f.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
