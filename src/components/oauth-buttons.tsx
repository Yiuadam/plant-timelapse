"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

export default function OAuthButtons() {
  const [available, setAvailable] = useState<{
    google: boolean;
    apple: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProviders().then((providers) => {
      if (cancelled) return;
      setAvailable({
        google: Boolean(providers?.google),
        apple: Boolean(providers?.apple),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available || (!available.google && !available.apple)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-black/40 dark:text-white/40">
        <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
        <span>or</span>
        <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
      </div>

      {available.google && (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/trips" })}
          className="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/20"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      )}

      {available.apple && (
        <button
          type="button"
          onClick={() => signIn("apple", { callbackUrl: "/trips" })}
          className="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/20"
        >
          <AppleIcon />
          Continue with Apple
        </button>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.43.34-2.09V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.36 1c.12 1.1-.32 2.18-.98 2.97-.68.8-1.78 1.42-2.86 1.33-.14-1.07.38-2.2 1.02-2.9C14.22 1.57 15.35 1 16.36 1zM20 17.1c-.55 1.26-.81 1.82-1.52 2.93-.99 1.55-2.38 3.48-4.11 3.5-1.53.02-1.92-1-4-1s-2.51.98-4 1c-1.73.03-3.05-1.71-4.04-3.26C-.02 16.6-.5 12.05 1.15 9.62c1.15-1.72 2.98-2.72 4.7-2.72 1.75 0 2.85 1.02 4.3 1.02 1.4 0 2.26-1.02 4.3-1.02 1.53 0 3.15.83 4.3 2.27-3.78 2.07-3.17 7.46 1.25 8.93z" />
    </svg>
  );
}
