"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PassportStampGraphic } from "@/components/passport-stamp";
import StampButton from "@/components/stamp-button";

export type PassportBookProps = {
  passportNumber: string;
  name: string;
  image: string | null;
  birthday: string | null;
  gender: string | null;
  issuedAt: string;
  stamps: { id: string; tripId: string; city: string; stampedAt: string }[];
  available: { id: string; title: string; destination: string }[];
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

const GENDER_LABELS: Record<string, string> = {
  female: "F",
  male: "M",
  "non-binary": "X",
  "prefer-not-to-say": "—",
};

export default function PassportBook({
  passportNumber,
  name,
  image,
  birthday,
  gender,
  issuedAt,
  stamps,
  available,
}: PassportBookProps) {
  const [open, setOpen] = useState(false);
  // Which stamp(s) to play the slam-in animation for -- computed in an
  // effect (a side effect, not render) since it depends on Date.now(),
  // which React's purity rules disallow calling directly during render.
  const [justStampedIds, setJustStampedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const now = Date.now();
    const recent = new Set(
      stamps
        .filter((s) => now - new Date(s.stampedAt).getTime() < 4000)
        .map((s) => s.id),
    );
    if (recent.size === 0) return;
    // Deferred to a macrotask so the setState isn't synchronous within the
    // effect body itself (avoids a same-tick cascading render).
    const kickoff = setTimeout(() => setJustStampedIds(recent), 0);
    const clear = setTimeout(() => setJustStampedIds(new Set()), 4000);
    return () => {
      clearTimeout(kickoff);
      clearTimeout(clear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamps.length]);

  return (
    <div style={{ perspective: 1800 }} className="mx-auto w-full max-w-2xl">
      <div className="relative" style={{ transformStyle: "preserve-3d" }}>
        {/* The interior (bio page + stamps) is a static block, always in the
            document flow -- only the cover below rotates, hinged on its
            left edge, so it looks like it swings open to reveal this. */}
        <div className="rounded-2xl border border-black/10 bg-[#fdfaf3] p-6 shadow-xl dark:border-white/15 dark:bg-neutral-900 sm:p-8">
          <div className="mb-6 flex flex-col gap-6 border-b border-dashed border-black/15 pb-6 sm:flex-row dark:border-white/15">
            <div className="mx-auto h-32 w-28 shrink-0 overflow-hidden rounded-md border-2 border-black/20 bg-black/5 sm:mx-0 dark:border-white/25 dark:bg-white/10">
              {image ? (
                <Image src={image} alt={name} width={112} height={128} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-black/30 dark:text-white/30">
                  {name.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="col-span-2 text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                Name
              </dt>
              <dd className="col-span-2 -mt-1 font-semibold">{name}</dd>
              <dt className="text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                Sex
              </dt>
              <dt className="text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                Date of birth
              </dt>
              <dd className="-mt-1 font-medium">{gender ? (GENDER_LABELS[gender] ?? "—") : "—"}</dd>
              <dd className="-mt-1 font-medium">{formatDate(birthday)}</dd>
              <dt className="col-span-2 mt-1 text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                Passport No.
              </dt>
              <dd className="col-span-2 -mt-1 font-mono font-semibold tracking-wider">
                {passportNumber}
              </dd>
              <dt className="text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                Date of issue
              </dt>
              <dt className="text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                Authority
              </dt>
              <dd className="-mt-1 font-medium">{formatDate(issuedAt)}</dd>
              <dd className="-mt-1 font-medium">Travel Log</dd>
            </dl>
          </div>

          {stamps.length === 0 ? (
            <p className="mb-6 text-sm text-black/50 dark:text-white/50">
              No stamps yet — your passport is still blank.
            </p>
          ) : (
            <div className="mb-6 flex flex-wrap justify-center gap-6">
              {stamps.map((s) => (
                <PassportStampGraphic
                  key={s.id}
                  city={s.city}
                  stampedAt={s.stampedAt}
                  seed={s.tripId}
                  animate={justStampedIds.has(s.id)}
                />
              ))}
            </div>
          )}

          {available.length > 0 && (
            <>
              <h2 className="mb-3 text-sm font-medium text-black/70 dark:text-white/70">
                Ready to stamp
              </h2>
              <div className="flex flex-col gap-2">
                {available.map((t) => (
                  <StampButton key={t.id} tripId={t.id} title={t.title} destination={t.destination} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* The cover -- hinged on the left edge, swings open like a real
            passport when clicked. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close passport" : "Open passport"}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border border-black/10 bg-gradient-to-br from-[#3b1f1f] to-[#1a0f0f] text-[#e9d9b8] shadow-2xl"
          style={{
            transformOrigin: "left center",
            transform: open ? "rotateY(-150deg)" : "rotateY(0deg)",
            transition: "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
            backfaceVisibility: "hidden",
          }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#e9d9b8]/70 text-3xl">
            🧭
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tracking-[0.2em]">TRAVEL LOG</div>
            <div className="mt-1 text-xs tracking-[0.35em] text-[#e9d9b8]/70">PASSPORT</div>
          </div>
          <div className="mt-4 text-[10px] tracking-widest text-[#e9d9b8]/50">
            Tap to open
          </div>
        </button>
      </div>
    </div>
  );
}
