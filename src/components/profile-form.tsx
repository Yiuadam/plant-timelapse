"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { GENDER_OPTIONS } from "@/lib/validation";

const GENDER_LABELS: Record<(typeof GENDER_OPTIONS)[number], string> = {
  female: "Female",
  male: "Male",
  "non-binary": "Non-binary",
  "prefer-not-to-say": "Prefer not to say",
};

export type ProfileValues = {
  name: string;
  email: string;
  image: string | null;
  birthday: string;
  gender: string;
};

export default function ProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(initial.image);
  const [name, setName] = useState(initial.name);
  const [birthday, setBirthday] = useState(initial.birthday);
  const [gender, setGender] = useState(initial.gender);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to upload photo");
        return;
      }
      setImage(data.image);
      router.refresh();
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthday, gender }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save changes");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-black/10 bg-black/5 dark:border-white/20 dark:bg-white/10">
          {image ? (
            <Image src={image} alt="Profile picture" fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-medium text-black/40 dark:text-white/40">
              {name.charAt(0).toUpperCase() || "?"}
            </div>
          )}
        </div>
        <label className="inline-block cursor-pointer rounded-xl border border-black/10 px-3 py-1.5 text-sm dark:border-white/20">
          {uploading ? "Uploading..." : "Change photo"}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
            disabled={uploading}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-black/50 dark:border-white/20 dark:bg-white/5 dark:text-white/50"
          value={initial.email}
          disabled
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Birthday
        <input
          type="date"
          className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Gender
        <select
          className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/20"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">Prefer not to answer</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {GENDER_LABELS[g]}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-600">Saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
