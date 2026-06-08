const TIERS = ["FREE", "CREATOR", "GROWTH", "AGENCY"] as const;
export type AppTier = (typeof TIERS)[number];

export function isValidTier(tier: string): tier is AppTier {
  return (TIERS as readonly string[]).includes(tier);
}

function devAdminEmails(): string[] {
  return (process.env.DEV_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Dev admins can access /dev/usage and related tooling. */
export function isDevAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return devAdminEmails().includes(email.trim().toLowerCase());
}

export function isDevTierSwitcherEnabled(): boolean {
  return process.env.DEV_TIER_SWITCHER_ENABLED === "true";
}

export function canUseDevTierSwitcher(email: string | null | undefined): boolean {
  return isDevTierSwitcherEnabled() && isDevAdmin(email);
}
