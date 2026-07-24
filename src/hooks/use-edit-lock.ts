"use client";

import { useEffect, useRef, useState } from "react";

const HEARTBEAT_MS = 15_000;
const POLL_MS = 5_000;

export type LockHolder = { userId: string; userName: string };

export function useEditLock(resourceType: string, resourceId: string) {
  const [lockedByOther, setLockedByOther] = useState<LockHolder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isEditingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch(
        `/api/locks?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`,
      );
      if (cancelled || !res.ok) return;
      const data = await res.json();
      // Never let a stale poll response override a lock we're actively holding.
      if (!isEditingRef.current) setLockedByOther(data.lock ?? null);
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [resourceType, resourceId]);

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // React's own unmount cleanup doesn't run on a hard reload or tab close,
  // so release the lock via pagehide too — keepalive lets the request
  // survive the page tearing down. Without this the lock would just sit
  // until its TTL expires.
  useEffect(() => {
    function handlePageHide() {
      if (!isEditingRef.current) return;
      fetch(
        `/api/locks?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`,
        { method: "DELETE", keepalive: true },
      ).catch(() => {});
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [resourceType, resourceId]);

  async function acquire(): Promise<boolean> {
    const res = await fetch("/api/locks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceType, resourceId }),
    });
    if (res.ok) {
      isEditingRef.current = true;
      setIsEditing(true);
      setLockedByOther(null);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => {
        fetch("/api/locks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resourceType, resourceId }),
        }).catch(() => {});
      }, HEARTBEAT_MS);
      return true;
    }
    const data = await res.json().catch(() => ({}));
    setLockedByOther(data.lock ?? null);
    return false;
  }

  function release() {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    isEditingRef.current = false;
    setIsEditing(false);
    // keepalive lets this survive a page unload/navigation that would
    // otherwise cancel the request mid-flight, leaving a stale lock.
    fetch(
      `/api/locks?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`,
      { method: "DELETE", keepalive: true },
    ).catch(() => {});
  }

  return { lockedByOther, isEditing, acquire, release };
}
