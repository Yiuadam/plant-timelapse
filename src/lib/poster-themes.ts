export const POSTER_THEMES = [
  {
    key: "sunset",
    label: "Sunset",
    gradient: ["#f97316", "#db2777"],
    accent: "#fde68a",
  },
  {
    key: "ocean",
    label: "Ocean",
    gradient: ["#0ea5e9", "#0f172a"],
    accent: "#a5f3fc",
  },
  {
    key: "forest",
    label: "Forest",
    gradient: ["#166534", "#052e16"],
    accent: "#bbf7d0",
  },
  {
    key: "midnight",
    label: "Midnight",
    gradient: ["#4c1d95", "#0f172a"],
    accent: "#e9d5ff",
  },
  {
    key: "classic",
    label: "Classic",
    gradient: ["#1f2937", "#000000"],
    accent: "#ffffff",
  },
] as const;

export type PosterThemeKey = (typeof POSTER_THEMES)[number]["key"];

export function getPosterTheme(key: string | null | undefined) {
  return POSTER_THEMES.find((t) => t.key === key) ?? POSTER_THEMES[0];
}
