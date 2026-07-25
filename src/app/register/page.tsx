"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import OAuthButtons from "@/components/oauth-buttons";
import { useLanguage } from "@/lib/i18n/context";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("auth_registration_failed"));
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push(`/login?next=${encodeURIComponent(next)}`);
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
      <h1 className="mb-6 text-2xl font-semibold">{t("auth_create_account")}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("auth_name")}
          <input
            className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
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
            minLength={8}
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {loading ? t("auth_creating") : t("auth_create_account")}
        </button>
      </form>
      <div className="mt-4">
        <OAuthButtons />
      </div>
      <p className="mt-4 text-sm">
        {t("auth_have_account")}{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          prefetch={true}
          className="underline"
        >
          {t("auth_login_title")}
        </Link>
      </p>
    </div>
  );
}
