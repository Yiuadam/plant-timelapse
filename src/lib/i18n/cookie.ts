// Split out from server.ts so the client-side LanguageProvider can import
// just the cookie name without pulling in next/headers (server-only) into
// the client bundle.
export const LANG_COOKIE = "lang";
