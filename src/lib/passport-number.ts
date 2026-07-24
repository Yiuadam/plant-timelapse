import { hashSeed } from "@/lib/seeded-random";

// Deterministic, unique per user -- no DB column needed since it's fully
// derived from the (already-unique) user id every time it's rendered.
export function getPassportNumber(userId: string): string {
  const h = hashSeed(`passport:${userId}`);
  const digits = String(h).padStart(8, "0").slice(0, 8);
  return `TL${digits}`;
}
