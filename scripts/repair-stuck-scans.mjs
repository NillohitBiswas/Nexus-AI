import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

function normalizePgConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode");
    if (
      sslmode === "require" ||
      sslmode === "prefer" ||
      sslmode === "verify-ca" ||
      url.searchParams.get("uselibpqcompat") === "true"
    ) {
      url.searchParams.delete("uselibpqcompat");
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

function scanHasResults(scan) {
  const summary = scan.executiveSummary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return false;
  }
  if ("error" in summary && !("executiveSummary" in summary)) {
    return false;
  }
  return (
    "executiveSummary" in summary ||
    "topPainSignals" in summary ||
    "personas" in summary
  );
}

const pool = new Pool({
  connectionString: normalizePgConnectionString(process.env.DATABASE_URL),
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const stuck = await prisma.scan.findMany({
  where: { status: "RUNNING" },
  select: { id: true, executiveSummary: true, progress: true },
});

const ids = stuck.filter(scanHasResults).map((s) => s.id);
if (ids.length === 0) {
  console.log("No stuck scans to repair.");
} else {
  const result = await prisma.scan.updateMany({
    where: { id: { in: ids } },
    data: { status: "COMPLETE", progress: 1.0, completedAt: new Date() },
  });
  console.log(`Repaired ${result.count} scan(s):`, ids);
}

await prisma.$disconnect();
await pool.end();
