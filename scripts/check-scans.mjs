import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

function normalizePgConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode");
    const needsNormalize =
      sslmode === "require" ||
      sslmode === "prefer" ||
      sslmode === "verify-ca" ||
      url.searchParams.get("uselibpqcompat") === "true";
    if (needsNormalize && sslmode !== "verify-full") {
      url.searchParams.delete("uselibpqcompat");
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

const connectionString = normalizePgConnectionString(
  process.env.INSFORGE_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const scans = await prisma.scan.findMany({
  orderBy: { completedAt: "desc" },
  take: 5,
  include: { video: true },
});

for (const s of scans) {
  console.log(
    JSON.stringify(
      {
        id: s.id,
        status: s.status,
        progress: s.progress,
        title: s.video?.title,
        error: s.executiveSummary,
      },
      null,
      2
    )
  );
}

await prisma.$disconnect();
await pool.end();
