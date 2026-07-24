"use client";

import { useEffect, useRef, useState } from "react";

const HEARTBEAT_MS = 8_000;
const POLL_MS = 4_000;

export type FieldEditor = { userId: string; userName: string };

// One poller per FORM (not per field) -- returns a map of fieldKey -> editor
// for every field currently locked by someone else under this resource.
export function useFieldLocks(resourceType: string, resourceId: string) {
  const [editors, setEditors] = useState<Record<string, FieldEditor>>({});

  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;
    async function poll() {
      const res = await fetch(
        `/api/locks/fields?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`,
      );
      if (cancelled || !res.ok) return;
      const data = await res.json();
      setEditors(data.editors ?? {});
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [resourceType, resourceId]);

  return editors;
}

// Acquire/release a lock on one specific field while it has focus, so other
// viewers polling useFieldLocks() see this field highlighted with this
// user's name for as long as it stays focused.
export function useFieldEditing(
  resourceType: string,
  resourceId: string,
  fieldKey: string,
) {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function onFocus() {
    if (!resourceId) return;
    const key = `${resourceId}:${fieldKey}`;
    const send = () =>
      fetch("/api/locks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType, resourceId: key }),
      }).catch(() => {});
    send();
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(send, HEARTBEAT_MS);
  }

  function onBlur() {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (!resourceId) return;
    const key = `${resourceId}:${fieldKey}`;
    fetch(
      `/api/locks?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(key)}`,
      { method: "DELETE", keepalive: true },
    ).catch(() => {});
  }

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  return { onFocus, onBlur };
}
