"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const HEARTBEAT_MS = 8_000;
const POLL_MS = 5_000;

export type CardViewer = {
  userId: string;
  userName: string;
  userImage: string | null;
};

// Passive "who's looking at this card" presence. Unlike an edit lock this
// isn't exclusive -- any number of users can watch the same card. Only
// heartbeats while `active` (the card is the one currently front/visible
// to this user), so presence naturally moves as people swipe between cards.
export function useCardPresence(
  resourceType: string,
  resourceId: string,
  cardKey: string,
  active: boolean,
) {
  const { data: session } = useSession();
  const [viewers, setViewers] = useState<CardViewer[]>([]);

  useEffect(() => {
    if (!active || !resourceId || !session?.user?.id) return;
    const send = () =>
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType, resourceId, cardKey }),
      }).catch(() => {});
    send();
    const heartbeat = setInterval(send, HEARTBEAT_MS);
    return () => {
      clearInterval(heartbeat);
      fetch(
        `/api/presence?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}&cardKey=${encodeURIComponent(cardKey)}`,
        { method: "DELETE", keepalive: true },
      ).catch(() => {});
    };
  }, [active, resourceType, resourceId, cardKey, session?.user?.id]);

  useEffect(() => {
    // Only the front/visible card is worth polling -- with 4 cards always
    // mounted in the drum, polling every one of them regardless of which
    // is actually in view would be 4x the necessary requests for avatars
    // nobody can see.
    if (!active || !resourceId) return;
    let cancelled = false;
    async function poll() {
      const res = await fetch(
        `/api/presence?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}&cardKey=${encodeURIComponent(cardKey)}`,
      );
      if (cancelled || !res.ok) return;
      const data = await res.json();
      setViewers(data.viewers ?? []);
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      // Card is going inactive (swiped away) or unmounting -- drop any
      // stale viewer avatars rather than leaving the last poll's result
      // showing on a card nobody's looking at anymore.
      setViewers([]);
    };
  }, [active, resourceType, resourceId, cardKey]);

  return viewers;
}
