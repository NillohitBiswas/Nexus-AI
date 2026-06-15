"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DashboardNav } from "./dashboard-nav";
import { logoutAction } from "@/app/actions/auth";

export function SidebarDrawer({ 
  user,
  logoutHandler
}: { 
  user: { email: string; tier: string };
  logoutHandler: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  return (
    <>
      {/* Top Bar for Mobile & Tablet only */}
      <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-red-600 to-red-800 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-zinc-900">
            NE<span className="text-red-600">X</span>US
          </span>
        </Link>

        <Button
          onClick={toggle}
          variant="ghost"
          className="h-9 w-9 flex items-center justify-center"
          aria-label="Toggle Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Slide-out Drawer Panel Backdrop */}
      {isOpen && (
        <div 
          onClick={close} 
          className="lg:hidden fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Drawer Panel Menu */}
      <aside 
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-zinc-200 flex flex-col justify-between p-5 transform transition-transform duration-350 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard" onClick={close} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-red-600 to-red-800 shadow-sm">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-zinc-900">
                NE<span className="text-red-600">X</span>US
              </span>
            </Link>

            <Button
              onClick={close}
              variant="ghost"
              className="h-8 w-8 flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User profile inside menu */}
          <div className="flex flex-col p-3 rounded-xl bg-zinc-50 border border-zinc-250/50">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Account</span>
            <span className="text-xs font-bold text-zinc-800 truncate mt-1">{user.email}</span>
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-0.5">{user.tier} TIER</span>
          </div>

          {/* Navigation Links */}
          <DashboardNav tier={user.tier} onLinkClick={close} />
        </div>

        {/* Footer actions inside menu */}
        <div className="border-t border-zinc-150 pt-4">
          <form action={logoutHandler}>
            <Button type="submit" variant="ghost" className="w-full flex items-center justify-center gap-2 text-xs font-bold">
              <LogOut className="h-4 w-4" />
              Logout from Workspace
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}
