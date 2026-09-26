import { PrismaClient } from "@prisma/client";

// Prevents "too many connections" errors in dev, where Next.js hot-reloads
// modules and would otherwise instantiate a new PrismaClient on every reload.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
