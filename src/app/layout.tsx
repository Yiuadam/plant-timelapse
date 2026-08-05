import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import NavBar from "@/components/nav-bar";
import AssistantWidget from "@/components/assistant-widget";
import MobileTabBar from "@/components/mobile-tab-bar";
import { LanguageProvider } from "@/lib/i18n/context";
import { getLang } from "@/lib/i18n/server";

// Runs before paint so the stored/system theme applies immediately —
// without this, the page would flash the opposite theme for a frame
// while React hydrates and the toggle component reads localStorage.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    var flavor = localStorage.getItem("flavor") || "minimalist";
    document.documentElement.setAttribute("data-flavor", flavor);
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Only used when the "Sketch" site style is active (see globals.css'
// [data-flavor="sketch"] block) -- loaded unconditionally since Next's font
// system can't conditionally load, but it costs nothing until referenced.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travel Log",
  description: "Record trips, locations, and photos.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Travel Log",
  },
};

export const viewport: Viewport = {
  themeColor: "#38bdf8",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLang();
  return (
    <html
      lang={lang}
      // THEME_INIT_SCRIPT below deliberately mutates this element's class
      // and data-flavor before React hydrates, so the server-rendered
      // attributes can never match the client's. Without this, every page
      // load logs a hydration mismatch for a difference that is the whole
      // point of that script. Scoped to <html> itself, so genuine
      // mismatches deeper in the tree still surface.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="flavor-blob-1 absolute -top-16 -left-16 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/15" />
          <div className="flavor-blob-2 absolute top-56 right-0 h-72 w-72 rounded-full bg-fuchsia-300/25 blur-3xl dark:bg-fuchsia-500/15" />
          <div className="flavor-blob-3 absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-400/15" />
        </div>
        <LanguageProvider initialLang={lang}>
          <AuthProvider>
            <NavBar />
            <main className="flex-1 pb-20 sm:pb-0">{children}</main>
            <AssistantWidget />
            <MobileTabBar />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
