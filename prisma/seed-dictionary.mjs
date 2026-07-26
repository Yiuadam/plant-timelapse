// Upserts the curated multilingual word/phrase dictionary
// (src/data/dictionary-seed.json) into the DictionaryEntry table. Runs
// automatically as part of `npm run build` (see package.json), same as
// prisma/seed-landmarks.mjs. Upserts by key so re-running on every build
// is safe and idempotent; it never deletes a row.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LANGS = ["en", "zh", "es", "fr", "de", "ja", "ko", "pt", "it", "ru", "ar", "hi"];

async function main() {
  const dataPath = path.join(__dirname, "../src/data/dictionary-seed.json");
  const entries = JSON.parse(readFileSync(dataPath, "utf-8"));

  const prisma = new PrismaClient();
  try {
    let count = 0;
    for (const entry of entries) {
      const translations = {};
      for (const lang of LANGS) {
        if (entry[lang]) translations[lang] = entry[lang];
      }
      await prisma.dictionaryEntry.upsert({
        where: { key: entry.key },
        create: { key: entry.key, category: entry.category ?? null, translations },
        update: { category: entry.category ?? null, translations },
      });
      count++;
    }
    console.log(`Seeded ${count} dictionary entries`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("seed-dictionary failed:", err);
  process.exit(1);
});
