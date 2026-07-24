"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldLocks, useFieldEditing } from "@/hooks/use-field-lock";
import { TRIP_MOODS } from "@/lib/validation";

export type TripFormValues = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes: string;
  mood: string;
};

const FIELD_RESOURCE_TYPE = "trip-field";

function FieldLabel({
  label,
  editor,
  children,
}: {
  label: string;
  editor?: { userName: string };
  children: React.ReactNode;
}) {
  return (
    <label className="relative flex flex-col gap-1 text-sm">
      {label}
      {editor && (
        <span className="pointer-events-none absolute -top-2 right-0 z-10 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
          {editor.userName} is editing
        </span>
      )}
      {children}
    </label>
  );
}

export default function TripForm({
  mode,
  tripId,
  initialValues,
}: {
  mode: "create" | "edit";
  tripId?: string;
  initialValues?: TripFormValues;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [destination, setDestination] = useState(
    initialValues?.destination ?? "",
  );
  const [startDate, setStartDate] = useState(initialValues?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialValues?.endDate ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [mood, setMood] = useState(initialValues?.mood ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resourceId = mode === "edit" ? (tripId ?? "") : "";
  const editors = useFieldLocks(FIELD_RESOURCE_TYPE, resourceId);
  const titleLock = useFieldEditing(FIELD_RESOURCE_TYPE, resourceId, "title");
  const destinationLock = useFieldEditing(FIELD_RESOURCE_TYPE, resourceId, "destination");
  const startDateLock = useFieldEditing(FIELD_RESOURCE_TYPE, resourceId, "startDate");
  const endDateLock = useFieldEditing(FIELD_RESOURCE_TYPE, resourceId, "endDate");
  const notesLock = useFieldEditing(FIELD_RESOURCE_TYPE, resourceId, "notes");
  const moodLock = useFieldEditing(FIELD_RESOURCE_TYPE, resourceId, "mood");

  function fieldClass(fieldKey: string) {
    return editors[fieldKey]
      ? "rounded-xl border border-amber-500 px-3 py-2 ring-2 ring-amber-300 dark:ring-amber-400/40"
      : "rounded-xl border border-black/10 px-3 py-2 dark:border-white/20";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = mode === "create" ? "/api/trips" : `/api/trips/${tripId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, destination, startDate, endDate, notes, mood }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ?? (mode === "create" ? "Failed to create trip" : "Failed to save changes"),
        );
        return;
      }

      const trip = await res.json();
      router.push(`/trips/${trip.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FieldLabel label="Title" editor={editors.title}>
        <input
          className={fieldClass("title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={titleLock.onFocus}
          onBlur={titleLock.onBlur}
          required
        />
      </FieldLabel>
      <FieldLabel label="Destination" editor={editors.destination}>
        <input
          className={fieldClass("destination")}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onFocus={destinationLock.onFocus}
          onBlur={destinationLock.onBlur}
        />
      </FieldLabel>
      <div className="flex gap-4">
        <div className="flex-1">
          <FieldLabel label="Start date" editor={editors.startDate}>
            <input
              type="date"
              className={fieldClass("startDate")}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onFocus={startDateLock.onFocus}
              onBlur={startDateLock.onBlur}
            />
          </FieldLabel>
        </div>
        <div className="flex-1">
          <FieldLabel label="End date" editor={editors.endDate}>
            <input
              type="date"
              className={fieldClass("endDate")}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onFocus={endDateLock.onFocus}
              onBlur={endDateLock.onBlur}
            />
          </FieldLabel>
        </div>
      </div>
      <FieldLabel label="Mood" editor={editors.mood}>
        <select
          className={fieldClass("mood")}
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          onFocus={moodLock.onFocus}
          onBlur={moodLock.onBlur}
        >
          <option value="">No mood set</option>
          {TRIP_MOODS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.emoji} {m.label}
            </option>
          ))}
        </select>
      </FieldLabel>
      <FieldLabel label="Notes" editor={editors.notes}>
        <textarea
          className={fieldClass("notes")}
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onFocus={notesLock.onFocus}
          onBlur={notesLock.onBlur}
        />
      </FieldLabel>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {loading
          ? mode === "create"
            ? "Creating..."
            : "Saving..."
          : mode === "create"
            ? "Create trip"
            : "Save changes"}
      </button>
    </form>
  );
}
