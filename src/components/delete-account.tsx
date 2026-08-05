"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

// App Store guideline 5.1.1(v) requires any app that supports account
// creation to let people delete their account from inside the app, not
// just by emailing support. Deletion is irreversible and takes the trips,
// photos and uploaded files with it, so it sits behind an explicit
// expand, a typed confirmation of the account's own email address, and a
// final button -- enough friction that it can't happen by mis-tap.
export default function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirm.trim().toLowerCase() === email.toLowerCase();

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirm.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Couldn't delete your account");
        setBusy(false);
        return;
      }
      // The session outlives the user row otherwise, leaving the app in a
      // signed-in state for an account that no longer exists.
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Couldn't delete your account");
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-red-500/30 p-4">
      <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
        Delete account
      </h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Permanently deletes your account, every trip you own, and all photos you
        uploaded. This can&apos;t be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-xl border border-red-500/40 px-3 py-1.5 text-sm text-red-600 dark:text-red-400"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor="confirm-email" className="text-sm">
            Type <span className="font-medium">{email}</span> to confirm
          </label>
          <input
            id="confirm-email"
            type="email"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded-xl border border-black/15 px-3 py-2 dark:border-white/20"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!matches || busy}
              onClick={remove}
              className="rounded-xl bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setConfirm("");
                setError(null);
              }}
              className="rounded-xl border border-black/15 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
