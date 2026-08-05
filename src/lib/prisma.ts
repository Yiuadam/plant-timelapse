import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Cloudflare Workers can't open the raw TCP socket Prisma's default
// Postgres connector needs, so against Neon (which production runs on)
// queries go through Neon's serverless driver over HTTP instead.
//
// Local development still points at a plain `localhost` Postgres, and
// Neon's driver only speaks to a Neon endpoint -- so the driver is
// chosen from the connection string rather than from NODE_ENV. That
// keeps local dev on the stock connector without a second code path
// that could drift from what production actually runs.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function isNeonUrl(connectionString: string) {
  try {
    return /(^|\.)neon\.(tech|build)$/i.test(new URL(connectionString).hostname);
  } catch {
    return false;
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!isNeonUrl(connectionString)) {
    return new PrismaClient();
  }
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
