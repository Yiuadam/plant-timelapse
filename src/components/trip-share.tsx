"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Collaborator = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

export default function TripShare({
  tripId,
  isOwner,
  shareToken,
  collaborators,
}: {
  tripId: string;
  isOwner: boolean;
  shareToken: string | null;
  collaborators: Collaborator[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(
    shareToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${shareToken}` : null,
  );
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  async function getLink() {
    const res = await fetch(`/api/trips/${tripId}/share`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setLink(`${window.location.origin}/join/${data.shareToken}`);
    }
  }

  async function copyLink() {
    if (!link) await getLink();
    const toCopy = link ?? "";
    if (toCopy) {
      await navigator.clipboard.writeText(toCopy).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not invite that person");
        return;
      }
      setEmail("");
      router.refresh();
    } finally {
      setInviting(false);
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    await fetch(`/api/trips/${tripId}/collaborators/${collaboratorId}`, {
      method: "DELETE",
    }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm underline"
      >
        Share
        {collaborators.length > 0 && (
          <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-xs no-underline dark:bg-white/15">
            {collaborators.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-50 mt-2 flex w-72 flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 text-sm shadow-lg dark:border-white/20 dark:bg-neutral-800">
            {collaborators.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-medium text-black/50 dark:text-white/50">
                  People with access
                </div>
                <ul className="flex flex-col gap-1.5">
                  {collaborators.map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.image}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-xs font-medium dark:bg-white/15">
                          {(c.name ?? c.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 truncate">
                        {c.name ?? c.email}
                      </span>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => removeCollaborator(c.id)}
                          aria-label={`Remove ${c.name ?? c.email}`}
                          className="text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={copyLink}
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-left dark:border-white/20"
                >
                  {copied ? "Link copied!" : "Copy invite link"}
                </button>

                <form onSubmit={invite} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-black/50 dark:text-white/50">
                    Invite by email
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="friend@example.com"
                      required
                      className="min-w-0 flex-1 rounded-lg border border-black/10 px-2 py-1 dark:border-white/20"
                    />
                    <button
                      type="submit"
                      disabled={inviting}
                      className="rounded-lg bg-foreground px-2 py-1 text-xs text-background disabled:opacity-50"
                    >
                      {inviting ? "..." : "Invite"}
                    </button>
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                </form>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
