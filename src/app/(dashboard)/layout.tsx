import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sparkles, LogOut } from "lucide-react";
import { DashboardNav } from "./dashboard-nav";
import { logoutAction } from "@/app/actions/auth";
import { SidebarDrawer } from "./sidebar-drawer";
 
async function handleLogout() {
  "use server";
  await logoutAction();
  redirect("/login");
}
 
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
 
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col lg:flex-row">
      {/* Mobile Header and Drawer Navigation */}
      <SidebarDrawer user={user} logoutHandler={handleLogout} />
 
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex fixed top-0 bottom-0 left-0 z-30 w-64 flex-col justify-between border-r border-zinc-200 bg-white p-5 shadow-sm">
        <div className="space-y-6">
          {/* Logo */}
          <Link href="/analyzer" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-red-600 to-red-800 shadow-sm group-hover:shadow-red-200 transition-shadow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-zinc-900">
              NE<span className="text-red-600">X</span>US
            </span>
          </Link>
 
          {/* Navigation Links */}
          <DashboardNav tier={user.tier} />
        </div>
 
        {/* User profile card & Logout button */}
        <div className="border-t border-zinc-150 pt-4 space-y-4">
          <div className="flex flex-col text-left px-2">
            <span className="text-xs font-semibold text-zinc-800 leading-tight truncate">{user.email}</span>
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">{user.tier} TIER</span>
          </div>
          <form action={handleLogout}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 text-xs font-bold text-zinc-650 hover:text-red-600 border border-zinc-200 hover:border-red-200 hover:bg-red-50 rounded-xl py-2.5 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>
 
      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col">
        <main className="w-full px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

