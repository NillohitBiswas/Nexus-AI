import { prisma } from "@/lib/db";

export function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export function parseMonthParam(monthStr: string | null | undefined): {
  year: number;
  month: number;
} {
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    return { year: y, month: m };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export async function getAdminUsageSummary(opts: {
  year: number;
  month: number;
  userId?: string | null;
}) {
  const { start, end } = monthRange(opts.year, opts.month);

  const events = await prisma.apiUsageEvent.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      ...(opts.userId ? { userId: opts.userId } : {}),
    },
    select: {
      provider: true,
      operation: true,
      units: true,
      amount: true,
    },
  });

  const byProvider = new Map<
    string,
    { operations: number; units: number; amount: number }
  >();

  for (const e of events) {
    const cur = byProvider.get(e.provider) ?? {
      operations: 0,
      units: 0,
      amount: 0,
    };
    cur.operations += 1;
    cur.units += e.units;
    cur.amount += e.amount;
    byProvider.set(e.provider, cur);
  }

  const providers = [...byProvider.entries()]
    .map(([provider, stats]) => ({ provider, ...stats }))
    .sort((a, b) => b.amount - a.amount || b.units - a.units);

  const totals = providers.reduce(
    (acc, p) => ({
      operations: acc.operations + p.operations,
      units: acc.units + p.units,
      amount: acc.amount + p.amount,
    }),
    { operations: 0, units: 0, amount: 0 },
  );

  return { providers, totals, start, end };
}

export async function getTopScansByGroqTokens(opts: {
  year: number;
  month: number;
  limit?: number;
}) {
  const { start, end } = monthRange(opts.year, opts.month);

  const rows = await prisma.apiUsageEvent.groupBy({
    by: ["scanId"],
    where: {
      provider: "GROQ",
      scanId: { not: null },
      createdAt: { gte: start, lt: end },
    },
    _sum: { units: true },
    _count: { id: true },
    orderBy: { _sum: { units: "desc" } },
    take: opts.limit ?? 5,
  });

  const scanIds = rows
    .map((r) => r.scanId)
    .filter((id): id is string => id != null);

  const scans =
    scanIds.length > 0
      ? await prisma.scan.findMany({
          where: { id: { in: scanIds } },
          include: { video: true },
        })
      : [];

  const scanMap = new Map(scans.map((s) => [s.id, s]));

  return rows.map((r) => ({
    scanId: r.scanId,
    tokens: r._sum.units ?? 0,
    calls: r._count.id,
    title: r.scanId ? scanMap.get(r.scanId)?.video?.title ?? r.scanId : "",
  }));
}

export async function listUsersWithUsageInMonth(year: number, month: number) {
  const { start, end } = monthRange(year, month);
  const userIds = await prisma.apiUsageEvent.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      userId: { not: null },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const ids = userIds
    .map((u) => u.userId)
    .filter((id): id is string => id != null);

  if (ids.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true },
    orderBy: { email: "asc" },
  });
}
