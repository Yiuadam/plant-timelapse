export type WidgetDevice = "desktop" | "mobile";

// Deliberately just phone/tablet user-agent sniffing, not a viewport check
// -- the dashboard's initial widget set has to be decided server-side,
// before any client viewport is known, so this is what determines which
// of the two independent boards (desktop vs mobile) a page load fetches.
export function detectWidgetDevice(userAgent: string | null): WidgetDevice {
  if (!userAgent) return "desktop";
  return /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent) ? "mobile" : "desktop";
}
