"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PassportStampGraphic, StampStand } from "@/components/passport-stamp";
import StampButton from "@/components/stamp-button";
import { useLanguage } from "@/lib/i18n/context";

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

// The interior is drawn at this fixed size and CSS-scaled to fit whatever
// width is actually available -- the same "design at one size, scale
// down" approach WidgetBoard uses, rather than trying to reflow this much
// structured content responsively at every width. REF_WIDTH is
// deliberately close to a real phone's content width (not a desktop
// size): scaling *down* from something desktop-sized compounded with
// PassportStampGraphic's own internal font scaling and made everything
// on mobile -- where this app is mostly used -- nearly unreadable.
// MAX_DISPLAY_WIDTH is a separate, larger cap so the card still gets to
// scale *up* and look substantial on wider screens.
const REF_WIDTH = 380;
const REF_HEIGHT = Math.round(REF_WIDTH / 0.92);
const MAX_DISPLAY_WIDTH = 640;
const STAMPS_PER_PAGE = 6;

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
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(REF_WIDTH);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = containerWidth > 0 ? containerWidth / REF_WIDTH : 1;
  // The scaled interior is `position: absolute`, so it contributes nothing
  // to this box's own layout height -- give it one explicitly (rather
  // than e.g. CSS aspect-ratio) so the "Ready to stamp" list below
  // reflows to the right spot instead of overlapping it.
  const bookHeight = containerWidth * (REF_HEIGHT / REF_WIDTH);

  // Oldest-first, so stamps fill page 1, then page 2, etc. -- like
  // actually working through a physical passport's blank pages -- rather
  // than the newest stamp reshuffling everything to page 1 every time.
  const orderedStamps = [...stamps].sort(
    (a, b) => new Date(a.stampedAt).getTime() - new Date(b.stampedAt).getTime(),
  );
  const totalPages = Math.max(1, Math.ceil(orderedStamps.length / STAMPS_PER_PAGE));

  // Which page to show, and which stamp(s) on it to play the slam-in
  // animation for. An id is newly "just stamped" when it appears in
  // `stamps` that wasn't there on the previous render -- diffing against
  // the previous id set (rather than comparing stampedAt to Date.now())
  // avoids a race where a slow round trip pushes the stamp's real age
  // past the animation window before the refreshed props even arrive,
  // silently killing the animation.
  const prevIdsRef = useRef<Set<string> | null>(null);
  const [currentPage, setCurrentPage] = useState(() =>
    Math.max(0, Math.ceil(stamps.length / STAMPS_PER_PAGE) - 1),
  );
  const [justStampedIds, setJustStampedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(stamps.map((s) => s.id));
    if (prevIdsRef.current === null) {
      // First mount: nothing to diff against yet, so don't animate
      // stamps that already existed before this page was opened.
      prevIdsRef.current = currentIds;
      return;
    }
    const previousIds = prevIdsRef.current;
    const added = new Set([...currentIds].filter((id) => !previousIds.has(id)));
    prevIdsRef.current = currentIds;
    if (added.size === 0) return;
    // A newly-added stamp always lands on what's now the last page (see
    // orderedStamps above) -- jump there so the animation is actually
    // visible instead of landing silently on a page the user isn't on.
    const newTotalPages = Math.max(1, Math.ceil(stamps.length / STAMPS_PER_PAGE));
    setCurrentPage(newTotalPages - 1);
    // Deferred to a macrotask so the setState isn't synchronous within the
    // effect body itself (avoids a same-tick cascading render).
    const kickoff = setTimeout(() => setJustStampedIds(added), 0);
    const clear = setTimeout(() => setJustStampedIds(new Set()), 4000);
    return () => {
      clearTimeout(kickoff);
      clearTimeout(clear);
    };
  }, [stamps]);

  const safePage = Math.min(currentPage, totalPages - 1);
  const pageStamps = orderedStamps.slice(
    safePage * STAMPS_PER_PAGE,
    safePage * STAMPS_PER_PAGE + STAMPS_PER_PAGE,
  );
  const emptySlots = Math.max(0, STAMPS_PER_PAGE - pageStamps.length);

  return (
    <div ref={outerRef} className="mx-auto w-full" style={{ maxWidth: MAX_DISPLAY_WIDTH }}>
      <div className="relative" style={{ height: bookHeight }}>
        {/* A couple of thin page edges peeking out from behind the cover
            -- suggests this is a bound booklet with pages inside, not a
            flat card. */}
        <div
          aria-hidden
          className="absolute top-[9px] left-[9px] rounded-2xl border border-black/10 bg-[#f0e9d8] dark:border-white/10 dark:bg-neutral-800"
          style={{ width: REF_WIDTH * scale, height: REF_HEIGHT * scale }}
        />
        <div
          aria-hidden
          className="absolute top-[5px] left-[5px] rounded-2xl border border-black/10 bg-[#f6f0e2] dark:border-white/10 dark:bg-neutral-700"
          style={{ width: REF_WIDTH * scale, height: REF_HEIGHT * scale }}
        />

        {/* The interior (bio page + stamps page) is a static block, always
            in the document flow -- only the cover below rotates, hinged on
            its left edge, so it looks like it swings open to reveal this. */}
        <div
          className="absolute top-0 left-0 z-10 overflow-hidden rounded-2xl border border-black/10 bg-[#fdfaf3] shadow-xl dark:border-white/15 dark:bg-neutral-900"
          style={{
            width: REF_WIDTH,
            height: REF_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
        <div className="flex h-full flex-col">
          {/* Top page: bio data. */}
          <div className="flex shrink-0 gap-4 px-5 pt-5 pb-3">
            <div className="h-16 w-14 shrink-0 overflow-hidden rounded-md border-2 border-black/20 bg-black/5 dark:border-white/25 dark:bg-white/10">
              {image ? (
                <Image src={image} alt={name} width={56} height={64} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-black/30 dark:text-white/30">
                  {name.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-0.5 text-sm">
              <dt className="col-span-2 text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                {t("passport_name")}
              </dt>
              <dd className="col-span-2 -mt-0.5 truncate font-semibold">{name}</dd>
              <dt className="text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                {t("passport_sex")}
              </dt>
              <dt className="text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                {t("passport_birth")}
              </dt>
              <dd className="-mt-0.5 font-medium">{gender ? (GENDER_LABELS[gender] ?? "—") : "—"}</dd>
              <dd className="-mt-0.5 font-medium">{formatDate(birthday)}</dd>
              <dt className="col-span-2 mt-0.5 text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                {t("passport_no")}
              </dt>
              <dd className="col-span-2 -mt-0.5 font-mono font-semibold tracking-wider">
                {passportNumber}
              </dd>
              <dt className="text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                {t("passport_issued")}
              </dt>
              <dt className="text-[10px] tracking-widest text-black/40 uppercase dark:text-white/40">
                {t("passport_authority")}
              </dt>
              <dd className="-mt-0.5 truncate font-medium">{formatDate(issuedAt)}</dd>
              <dd className="-mt-0.5 truncate font-medium">Travel Log</dd>
            </dl>
          </div>

          <div className="mx-5 border-t border-dashed border-black/15 dark:border-white/15" />

          {/* Bottom page: stamps, paginated -- Next/Previous only swap
              this half, the bio page above stays put. */}
          <div className="flex min-h-0 flex-1 flex-col px-5 pt-2 pb-2">
            <div className="grid flex-1 grid-cols-3 place-items-center content-center gap-x-1 gap-y-1">
              {pageStamps.map((s) => (
                <PassportStampGraphic
                  key={s.id}
                  city={s.city}
                  stampedAt={s.stampedAt}
                  seed={s.tripId}
                  size={84}
                  animate={justStampedIds.has(s.id)}
                />
              ))}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <div
                  key={`blank-${i}`}
                  aria-hidden
                  className="rounded-full border border-dashed border-black/10 dark:border-white/10"
                  style={{ width: 84, height: 84 }}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-1 flex shrink-0 items-center justify-center gap-3 text-xs">
                <button
                  type="button"
                  data-no-drag
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  aria-label="Previous page"
                  className="rounded-full border border-black/10 px-2.5 py-1 disabled:opacity-30 dark:border-white/20"
                >
                  {t("passport_prev_page")}
                </button>
                <span className="text-black/50 dark:text-white/50">
                  {t("passport_page_of", { current: safePage + 1, total: totalPages })}
                </span>
                <button
                  type="button"
                  data-no-drag
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage === totalPages - 1}
                  aria-label="Next page"
                  className="rounded-full border border-black/10 px-2.5 py-1 disabled:opacity-30 dark:border-white/20"
                >
                  {t("passport_next_page")}
                </button>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* A small tab poking out past the interior's top-right corner --
            the only way to close the passport again once it's open, since
            the cover itself (below) rotates out of its own clickable area
            once open and can no longer be tapped to close. */}
        {open && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("passport_close")}
            className="absolute z-20 flex h-8 w-8 items-center justify-center rounded-full border border-black/15 bg-white text-base font-medium text-black/70 shadow-lg dark:border-white/25 dark:bg-neutral-800 dark:text-white/80"
            style={{ top: -12, right: -12 }}
          >
            ✕
          </button>
        )}

        {/* The cover -- hinged on the left edge, swings open like a real
            passport when clicked. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("passport_open")}
          aria-hidden={open}
          tabIndex={open ? -1 : 0}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl border border-black/10 bg-gradient-to-br from-[#3b1f1f] to-[#1a0f0f] text-[#e9d9b8] shadow-2xl"
          style={{
            transformOrigin: "left center",
            transform: open ? "rotateY(-150deg)" : "rotateY(0deg)",
            transition: "transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
            backfaceVisibility: "hidden",
            pointerEvents: open ? "none" : "auto",
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#e9d9b8]/70 text-xl">
            🧭
          </div>
          <div className="text-center">
            <div className="text-lg font-bold tracking-[0.2em]">TRAVEL LOG</div>
            <div className="mt-1 text-[10px] tracking-[0.35em] text-[#e9d9b8]/70">PASSPORT</div>
          </div>
          <div className="mt-1 text-[9px] tracking-widest text-[#e9d9b8]/50">
            {t("passport_tap_to_open")}
          </div>
        </button>
      </div>

      {available.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-black/70 dark:text-white/70">
            <StampStand />
            {t("passport_ready_to_stamp")}
          </h2>
          <div className="flex flex-col gap-2">
            {available.map((trip) => (
              <StampButton key={trip.id} tripId={trip.id} title={trip.title} destination={trip.destination} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
