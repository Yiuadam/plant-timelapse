"use client";

import Image from "next/image";
import { useCardPresence } from "@/hooks/use-card-presence";

export default function CardWatchers({
  resourceType,
  resourceId,
  cardKey,
  active,
}: {
  resourceType: string;
  resourceId: string;
  cardKey: string;
  active: boolean;
}) {
  const viewers = useCardPresence(resourceType, resourceId, cardKey, active);
  if (viewers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex -space-x-2">
      {viewers.slice(0, 4).map((v) => (
        <div
          key={v.userId}
          title={`${v.userName} is viewing this`}
          className="h-7 w-7 shrink-0 overflow-hidden rounded-full border-2 border-white shadow dark:border-neutral-900"
        >
          {v.userImage ? (
            <Image
              src={v.userImage}
              alt={v.userName}
              width={28}
              height={28}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-foreground text-[10px] font-medium text-background">
              {v.userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
