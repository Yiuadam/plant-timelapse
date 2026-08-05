// Bindings this app reads off the Cloudflare env (see wrangler.jsonc).
//
// Deliberately hand-written and minimal rather than generated with
// `wrangler types`: that command emits ~14k lines of workerd runtime
// types into global scope, which redeclare the DOM's `Response.json()`
// as returning `unknown`. Since this is one codebase holding both client
// components and Worker code, that break lands on every browser-side
// `fetch(...).then((r) => r.json())` call in the app. Declaring just the
// bindings actually used keeps `lib.dom` intact.
//
// OpenNext contributes its own `CloudflareEnv` members (ASSETS, cache
// bindings, and so on) from its package types; this interface merges
// with those.
declare global {
  interface CloudflareEnv {
    /** R2 bucket holding uploaded trip photos and avatars. */
    PHOTOS?: {
      put(
        key: string,
        value: ArrayBuffer,
        options?: { httpMetadata?: { contentType?: string } },
      ): Promise<unknown>;
      delete(key: string): Promise<void>;
    };
  }
}

export {};
