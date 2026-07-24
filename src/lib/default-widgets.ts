// Shown to brand-new users on their first visit — kept minimal so the
// board doesn't arrive crowded; everything else is opt-in via the
// "Add widget" library.
export const DEFAULT_WIDGETS = [
  {
    type: "trips",
    x: 6,
    y: 8,
    w: 300,
    h: 360,
    rotation: -1,
    zIndex: 1,
    color: "violet",
  },
] as const;

// Defaults used when a widget is added from the library, keyed by type.
export const WIDGET_LIBRARY: Record<
  string,
  { label: string; w: number; h: number; color: string }
> = {
  trips: { label: "Trips", w: 300, h: 360, color: "violet" },
  clock: { label: "Clock", w: 190, h: 190, color: "slate" },
  photos: { label: "Photos", w: 210, h: 240, color: "slate" },
  map: { label: "Map", w: 280, h: 280, color: "blue" },
  notes: { label: "Notes", w: 260, h: 220, color: "yellow" },
  sticky: { label: "Sticky note", w: 180, h: 180, color: "yellow" },
  travel: { label: "Travel", w: 280, h: 320, color: "blue" },
};
