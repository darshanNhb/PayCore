import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma client singleton for Next.js serverless environment.
 * Uses the globalThis pattern to avoid exhausting Neon connections
 * during hot reload / serverless cold starts.
 *
 * For Prisma v8+, the DATABASE_URL is passed directly to PrismaClient.
 * The DIRECT_URL is used only by the CLI via prisma.config.ts.
 *
 * @see PayCore_Build_Prompt.md Section 3.1
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.DEBUG_PRISMA === "true" ? ["query", "error", "warn"] : ["error", "warn"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
