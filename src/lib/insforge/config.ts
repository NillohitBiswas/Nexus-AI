/**
 * InsForge is the platform backbone: Auth, Storage, and Postgres.
 * Schema is synced with `npm run db:push` (no migration files).
 */
function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

export const insforgeConfig = {
  /** Project root, e.g. https://45xcbd63.us-west.insforge.app */
  url: trimTrailingSlash(process.env.NEXT_PUBLIC_INSFORGE_URL ?? ""),
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? "",
  serviceKey:
    process.env.INSFORGE_SERVICE_ROLE_KEY ??
    process.env.INSFORGE_SERVICE_KEY ??
    "",
  /** postgresql://… from Database → Connection string (NOT the S3 endpoint) */
  databaseUrl:
    process.env.INSFORGE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "",
  /** S3-compatible gateway — Storage → S3 access in dashboard */
  s3: {
    endpoint:
      process.env.INSFORGE_S3_ENDPOINT ??
      (process.env.NEXT_PUBLIC_INSFORGE_URL
        ? `${trimTrailingSlash(process.env.NEXT_PUBLIC_INSFORGE_URL)}/storage/v1/s3`
        : ""),
    region: process.env.INSFORGE_S3_REGION ?? "us-east-2",
    accessKeyId: process.env.INSFORGE_S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.INSFORGE_S3_SECRET_ACCESS_KEY ?? "",
    forcePathStyle: true,
    reportsBucket: process.env.INSFORGE_STORAGE_BUCKET ?? "reports",
  },
};

export function assertInsforgeConfigured() {
  if (!insforgeConfig.url || !insforgeConfig.anonKey) {
    throw new Error("Set NEXT_PUBLIC_INSFORGE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY");
  }
}
