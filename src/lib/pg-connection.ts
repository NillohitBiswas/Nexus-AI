/**
 * pg v8+ warns when sslmode=require|prefer|verify-ca is used without verify-full.
 * InsForge URLs often ship with ?sslmode=require — upgrade to verify-full (works with InsForge).
 */
export function normalizePgConnectionString(connectionString: string): string {
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

const PG_ENV_KEYS = [
  "DATABASE_URL",
  "INSFORGE_DATABASE_URL",
  "DIRECT_URL",
] as const;

/** Normalize Postgres URLs in process.env (safe to call more than once). */
export function applyPgEnvNormalization(): void {
  for (const key of PG_ENV_KEYS) {
    const value = process.env[key];
    if (value) {
      process.env[key] = normalizePgConnectionString(value);
    }
  }
}
