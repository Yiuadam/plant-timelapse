"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type TravelItemData = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  notes: string | null;
};

const TRAVEL_TYPES = ["flight", "hotel", "train"] as const;

const TYPE_META: Record<
  (typeof TRAVEL_TYPES)[number],
  { label: string; icon: string }
> = {
  flight: { label: "Flight", icon: "✈️" },
  hotel: { label: "Hotel", icon: "🏨" },
  train: { label: "Train", icon: "🚆" },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const MAX_SCAN_DIMENSION = 2000;

// A full-resolution phone photo of a ticket (as opposed to a compressed
// screenshot) can be several MB, easily large enough to trip the
// platform's request-body limit before it ever reaches our route
// handler — which fails as a non-JSON error page, not a normal error
// response. Downscaling client-side keeps the upload comfortably small
// while remaining plenty sharp for OCR.
async function downscaleForScan(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(
    1,
    MAX_SCAN_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  if (scale === 1 && file.size <= 3 * 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) return file;
  return new File([blob], "scan.jpg", { type: "image/jpeg" });
}

export default function TripTravel({
  tripId,
  items,
}: {
  tripId: string;
  items: TravelItemData[];
}) {
  const router = useRouter();
  const [type, setType] = useState<(typeof TRAVEL_TYPES)[number]>("flight");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanError(null);
    setScanNote(null);
    try {
      const uploadFile = await downscaleForScan(file);
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch(`/api/trips/${tripId}/travel/scan`, {
        method: "POST",
        body: formData,
      });
      let data: Record<string, unknown> | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok) {
        // A non-JSON response means the request never made it to our
        // route handler at all (a platform-level error page, e.g. a
        // request that's still too large or a gateway timeout) — say so
        // instead of the misleading "couldn't read that image", which
        // implies a legibility problem rather than an upload one.
        const message =
          typeof data?.error === "string"
            ? data.error
            : `Upload failed (${res.status}) — try a smaller or cropped photo`;
        setScanError(message);
        return;
      }
      if (!data) {
        setScanError("Got an unexpected response — try again");
        return;
      }
      const str = (v: unknown) => (typeof v === "string" && v ? v : null);
      const scannedType = str(data.type);
      const scannedTitle = str(data.title);
      const scannedDetail = str(data.detail);
      const scannedLocation = str(data.location);
      const scannedStartAt = str(data.startAt);
      const scannedEndAt = str(data.endAt);
      const scannedNotes = str(data.notes);
      if (scannedType && TRAVEL_TYPES.includes(scannedType as (typeof TRAVEL_TYPES)[number])) {
        setType(scannedType as (typeof TRAVEL_TYPES)[number]);
      }
      if (scannedTitle) setTitle(scannedTitle);
      if (scannedDetail) setDetail(scannedDetail);
      if (scannedLocation) setLocation(scannedLocation);
      if (scannedStartAt) setStartAt(scannedStartAt);
      if (scannedEndAt) setEndAt(scannedEndAt);
      if (scannedNotes) setNotes(scannedNotes);
      const missing = [
        !scannedTitle && "title",
        !scannedStartAt && "date/time",
      ].filter(Boolean);
      setScanNote(
        missing.length > 0
          ? `Filled what I could read — double-check ${missing.join(" and ")} before adding.`
          : "Filled from the photo — double-check before adding.",
      );
    } catch {
      setScanError("Something went wrong scanning that photo — try again");
    } finally {
      setScanning(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/travel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          detail,
          location,
          startAt,
          endAt,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add");
        return;
      }
      setTitle("");
      setDetail("");
      setLocation("");
      setStartAt("");
      setEndAt("");
      setNotes("");
      setScanNote(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/travel/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const sorted = [...items].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/20"
      >
        <div className="flex items-center justify-between gap-2">
          <label className="cursor-pointer rounded-lg border border-dashed border-black/20 px-2 py-1.5 text-xs text-black/60 hover:bg-black/5 dark:border-white/30 dark:text-white/60 dark:hover:bg-white/10">
            {scanning ? "Scanning..." : "📷 Scan a boarding pass, confirmation, or ticket"}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleScan}
              disabled={scanning}
            />
          </label>
        </div>
        {scanError && <p className="text-xs text-red-600">{scanError}</p>}
        {scanNote && (
          <p className="text-xs text-black/50 dark:text-white/50">{scanNote}</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TRAVEL_TYPES)[number])}
            className="w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent sm:w-auto"
          >
            {TRAVEL_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_META[t].icon} {TYPE_META[t].label}
              </option>
            ))}
          </select>
          <input
            className="w-full min-w-0 rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 sm:flex-1"
            placeholder={
              type === "flight"
                ? "Airline (e.g. Cathay Pacific)"
                : type === "hotel"
                  ? "Hotel name"
                  : "Train operator"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full min-w-0 rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 sm:flex-1"
            placeholder={
              type === "flight"
                ? "Flight no. / confirmation"
                : "Confirmation / room no."
            }
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <input
            className="w-full min-w-0 rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 sm:flex-1"
            placeholder={
              type === "hotel" ? "Address" : "Route (e.g. HKG → NRT)"
            }
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="w-full min-w-0 text-xs text-black/50 sm:flex-1 dark:text-white/50">
            {type === "hotel" ? "Check-in" : "Departs"}
            <input
              type="datetime-local"
              className="mt-0.5 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </label>
          <label className="w-full min-w-0 text-xs text-black/50 sm:flex-1 dark:text-white/50">
            {type === "hotel" ? "Check-out" : "Arrives"} (optional)
            <input
              type="datetime-local"
              className="mt-0.5 w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </label>
        </div>
        <input
          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-xl bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
      </form>

      {sorted.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {sorted.map((item) => {
            const meta = TYPE_META[item.type as (typeof TRAVEL_TYPES)[number]] ?? {
              label: item.type,
              icon: "🧳",
            };
            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20"
              >
                <div className="flex gap-2">
                  <span aria-hidden>{meta.icon}</span>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-black/60 dark:text-white/60">
                      {formatDateTime(item.startAt)}
                      {item.endAt && ` – ${formatDateTime(item.endAt)}`}
                    </div>
                    {(item.location || item.detail) && (
                      <div className="text-xs text-black/50 dark:text-white/50">
                        {[item.location, item.detail].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-xs text-black/50 dark:text-white/50">
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="shrink-0 text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          Add flights, hotels, and train rides to keep your bookings in one
          place.
        </p>
      )}
    </div>
  );
}
