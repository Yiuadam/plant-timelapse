import type { NextConfig } from "next";

// Photos live in an R2 bucket served either from its r2.dev subdomain or
// a custom domain. The custom-domain case can't be known statically, so
// it's derived from R2_PUBLIC_URL at build time when that's set.
const r2CustomHost = (() => {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) return null;
  try {
    const { hostname } = new URL(base);
    return hostname.endsWith(".r2.dev") ? null : hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      ...(r2CustomHost
        ? ([{ protocol: "https", hostname: r2CustomHost }] as const)
        : []),
    ],
  },
};

export default nextConfig;
