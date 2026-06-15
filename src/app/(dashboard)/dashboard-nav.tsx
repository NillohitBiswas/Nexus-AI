"use client";
 
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
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
  ChevronDown,
  ChevronRight
} from "lucide-react";
 
const PRIMARY_LINKS = [
  { href: "/dashboard", label: "Dashboard",   icon: LayoutDashboard, tier: [] },
  { href: "/analyzer",  label: "Analyzer",    icon: Activity,        tier: [] },
  { href: "/rules",     label: "Auto-Reply",  icon: Bot,             tier: [] },
  { href: "/settings",  label: "Settings",    icon: Settings,        tier: [] },
];
 
const ANALYZER_SUB_LINKS = [
  { href: "/analyzer",      label: "Scanner Console",    icon: Activity,    tier: [] },
  { href: "/audience",      label: "Audience Personas", icon: Users,       tier: [] },
  { href: "/leads",         label: "Leads Engine",      icon: Target,      tier: ["GROWTH","AGENCY"] },
  { href: "/competitor",    label: "Competitors Radar",  icon: Swords,      tier: ["GROWTH","AGENCY"] },
  { href: "/objections",    label: "Objections Map",    icon: ShieldAlert, tier: ["GROWTH","AGENCY"] },
  { href: "/proof-library", label: "Proof Library",     icon: Library,     tier: ["GROWTH","AGENCY"] },
  { href: "/content-intel", label: "Content Intel",     icon: Lightbulb,   tier: [] },
];
 
export function DashboardNav({ 
  tier, 
  onLinkClick 
}: { 
  tier: string; 
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  
  const isAnalyzerRoute = 
    pathname.startsWith("/analyzer") ||
    pathname.startsWith("/audience") ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/competitor") ||
    pathname.startsWith("/objections") ||
    pathname.startsWith("/proof-library") ||
    pathname.startsWith("/content-intel");
 
  const [isAnalyzerExpanded, setIsAnalyzerExpanded] = useState(isAnalyzerRoute);
 
  // Sync collapse state with URL changes
  useEffect(() => {
    if (isAnalyzerRoute) {
      setIsAnalyzerExpanded(true);
    }
  }, [isAnalyzerRoute]);
 
  return (
    <nav className="flex flex-col gap-1 w-full" aria-label="Dashboard navigation">
      {PRIMARY_LINKS.map((link) => {
        const isAnalyzerLink = link.href === "/analyzer";
        const active = isAnalyzerLink 
          ? isAnalyzerRoute 
          : pathname.startsWith(link.href);
          
        const Icon = link.icon;
 
        if (isAnalyzerLink) {
          return (
            <div key={link.href} className="flex flex-col w-full">
              {/* Primary Analyzer Toggle Button */}
              <div
                className={`flex items-center justify-between text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                  active
                    ? "bg-red-50 text-red-605 border-red-100"
                    : "text-zinc-650 border-transparent hover:text-zinc-900 hover:bg-zinc-100"
                }`}
                onClick={() => setIsAnalyzerExpanded(!isAnalyzerExpanded)}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${active ? "text-red-650" : "text-zinc-500"}`} />
                  <span>{link.label}</span>
                </div>
                {isAnalyzerExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                )}
              </div>
 
              {/* Nested Sub-links */}
              {isAnalyzerExpanded && (
                <div className="ml-5 border-l border-zinc-200 pl-3 mt-1.5 mb-1.5 flex flex-col gap-1">
                  {ANALYZER_SUB_LINKS.map((subLink) => {
                    const subActive = pathname === subLink.href;
                    const SubIcon = subLink.icon;
                    const locked = subLink.tier.length > 0 && !subLink.tier.includes(tier);
 
                    if (locked) {
                      return (
                        <div
                          key={subLink.href}
                          title={`Upgrade to unlock ${subLink.label}`}
                          className="flex items-center justify-between text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-zinc-400 bg-zinc-50/50 cursor-not-allowed select-none border border-transparent"
                        >
                          <div className="flex items-center gap-2">
                            <SubIcon className="h-3.5 w-3.5 text-zinc-405" />
                            <span>{subLink.label}</span>
                          </div>
                          <Lock className="h-3 w-3 text-zinc-400" />
                        </div>
                      );
                    }
 
                    return (
                      <Link
                        key={subLink.href}
                        href={subLink.href}
                        onClick={onLinkClick}
                        className={`flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                          subActive
                            ? "bg-red-50 text-red-600 border-red-100 shadow-sm"
                            : "text-zinc-550 border-transparent hover:text-zinc-900 hover:bg-zinc-100/60"
                        }`}
                      >
                        <SubIcon className={`h-3.5 w-3.5 ${subActive ? "text-red-605" : "text-zinc-450"}`} />
                        <span>{subLink.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
 
        // Standard Primary Links
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className={`flex items-center gap-2.5 text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all ${
              active
                ? "bg-red-50 text-red-600 border-red-100 shadow-sm"
                : "text-zinc-655 border-transparent hover:text-zinc-900 hover:bg-zinc-100"
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


