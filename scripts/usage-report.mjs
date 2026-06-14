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

const monthArg = process.argv.find((a) => a.startsWith("--month="))?.split("=")[1];
const userIdArg = process.argv.find((a) => a.startsWith("--userId="))?.split("=")[1];

const now = new Date();
let year = now.getFullYear();
let month = now.getMonth() + 1;
if (monthArg && /^\d{4}-\d{2}$/.test(monthArg)) {
  [year, month] = monthArg.split("-").map(Number);
}
const start = new Date(year, month - 1, 1);
const end = new Date(year, month, 1);

const pool = new Pool({
  connectionString: normalizePgConnectionString(process.env.DATABASE_URL),
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const events = await prisma.apiUsageEvent.findMany({
  where: {
    createdAt: { gte: start, lt: end },
    ...(userIdArg ? { userId: userIdArg } : {}),
  },
});

const byProvider = {};
for (const e of events) {
  if (!byProvider[e.provider]) {
    byProvider[e.provider] = { operations: 0, units: 0, amount: 0 };
  }
  byProvider[e.provider].operations += 1;
  byProvider[e.provider].units += e.units;
  byProvider[e.provider].amount += e.amount;
}

console.log(`API usage ${year}-${String(month).padStart(2, "0")}`);
if (userIdArg) console.log(`User: ${userIdArg}`);
console.log(JSON.stringify(byProvider, null, 2));

await prisma.$disconnect();
await pool.end();
