import type { MetadataRoute } from "next";

// Makes the site installable ("Add to Home Screen" on iOS/Android, and a
// standalone install prompt on desktop Chrome) -- the standard first step
// toward eventually wrapping this in a native shell (Capacitor, etc.) for
// the App Store / Play Store, without committing to that build yet.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Travel Log",
    short_name: "Travel Log",
    description: "Record trips, locations, and photos.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#38bdf8",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
