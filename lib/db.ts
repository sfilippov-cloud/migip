import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=3&pool_timeout=10`;
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: buildUrl() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
