"use client";
 
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Users,
  Target,
  Swords,
  ShieldAlert,
  Library,
  Lightbulb,
  Bot,
  Settings,
  Lock,
} from "lucide-react";
 
const LINKS = [
  { href: "/analyzer",      label: "Analyzer",      icon: Activity,    tier: [] },
  { href: "/audience",      label: "Audience",      icon: Users,       tier: [] },
  { href: "/leads",         label: "Leads",         icon: Target,      tier: ["GROWTH","AGENCY"] },
  { href: "/competitor",    label: "Competitors",   icon: Swords,      tier: ["GROWTH","AGENCY"] },
  { href: "/objections",    label: "Objections",    icon: ShieldAlert, tier: ["GROWTH","AGENCY"] },
  { href: "/proof-library", label: "Proof Library", icon: Library,     tier: ["GROWTH","AGENCY"] },
  { href: "/content-intel", label: "Content Intel", icon: Lightbulb,   tier: [] },
  { href: "/rules",         label: "Auto-Reply",    icon: Bot,         tier: [] },
  { href: "/settings",      label: "Settings",      icon: Settings,    tier: [] },
];
 
export function DashboardNav({ 
  tier, 
  onLinkClick 
}: { 
  tier: string; 
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
 
  return (
    <nav className="flex flex-col gap-1 w-full" aria-label="Dashboard navigation">
      {LINKS.map((link) => {
        const locked = link.tier.length > 0 && !link.tier.includes(tier);
        const active = pathname.startsWith(link.href);
        const Icon = link.icon;
 
        if (locked) {
          return (
            <div
              key={link.href}
              title={`Upgrade to unlock ${link.label}`}
              className="flex items-center justify-between text-xs font-semibold px-3 py-2.5 rounded-xl text-zinc-400 bg-zinc-50 border border-zinc-150/50 cursor-not-allowed select-none transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-zinc-400" />
                <span>{link.label}</span>
              </div>
              <Lock className="h-3.5 w-3.5 text-zinc-400" />
            </div>
          );
        }
 
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className={`flex items-center gap-2.5 text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all ${
              active
                ? "bg-red-50 text-red-600 border-red-100 shadow-sm"
                : "text-zinc-650 border-transparent hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-red-650" : "text-zinc-500"}`} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

