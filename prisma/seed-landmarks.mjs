// Upserts the curated city -> landmark-icon mapping (src/data/landmark-seed.json)
// into the Landmark table. Runs automatically as part of `npm run build`
// (see package.json), same as `prisma db push` -- this is the only way
// these ~200 rows reach the production database, since deploys happen
// through Vercel with no separate manual seeding step. Upserts by
// cityKey so re-running on every build is safe and idempotent; it never
// deletes a row, so any city an operator adds by hand stays put.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeCityText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const dataPath = path.join(__dirname, "../src/data/landmark-seed.json");
  const entries = JSON.parse(readFileSync(dataPath, "utf-8"));

  const prisma = new PrismaClient();
  try {
    let count = 0;
    for (const entry of entries) {
      const cityKey = normalizeCityText(entry.city);
      if (!cityKey) continue;
      await prisma.landmark.upsert({
        where: { cityKey },
        create: { cityKey, displayName: entry.city, landmarkKey: entry.key, inkOverride: entry.ink ?? null },
        update: { displayName: entry.city, landmarkKey: entry.key, inkOverride: entry.ink ?? null },
      });
      count++;
    }
    console.log(`Seeded ${count} landmarks`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("seed-landmarks failed:", err);
  process.exit(1);
});
