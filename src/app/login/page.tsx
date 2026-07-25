"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import OAuthButtons from "@/components/oauth-buttons";
import { useLanguage } from "@/lib/i18n/context";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("auth_invalid_credentials"));
        return;
      }

      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">{t("auth_login_title")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("auth_email")}
          <input
            type="email"
            className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("auth_password")}
          <input
            type="password"
            className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {loading ? t("auth_logging_in") : t("auth_login_title")}
        </button>
      </form>
      <div className="mt-4">
        <OAuthButtons />
      </div>
      <p className="mt-4 text-sm">
        {t("auth_no_account")}{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          prefetch={true}
          className="underline"
        >
          {t("auth_register_title")}
        </Link>
      </p>
    </div>
  );
}
