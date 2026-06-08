import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  applyPgEnvNormalization,
  normalizePgConnectionString,
} from "@/lib/pg-connection";

applyPgEnvNormalization();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  const rawUrl =
    process.env.INSFORGE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error("Set INSFORGE_DATABASE_URL or DATABASE_URL (InsForge Postgres)");
  }
  const connectionString = normalizePgConnectionString(rawUrl);
  const maxPool = Math.min(
    20,
    Math.max(1, Number(process.env.DATABASE_POOL_MAX ?? 8) || 8),
  );
  const pool = new Pool({
    connectionString,
    max: maxPool,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
}

export { prisma };
