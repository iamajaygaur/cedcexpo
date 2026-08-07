"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Gavel,
  Layers,
  ClipboardCheck,
  Radio,
  Trophy,
  FileText,
  Archive,
  Settings,
  X,
  LifeBuoy,
} from "lucide-react";

import { AppFeedbackHost } from "@/components/shared/app-feedback";
import { AppLogo } from "@/components/shared/app-logo";
import { AppTopBar } from "@/components/shared/app-top-bar";
import { IdleSessionGuard } from "@/components/shared/idle-session-guard";
import { NavigationProgress } from "@/components/shared/navigation-progress";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const ADMIN_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/events", label: "Events", icon: Calendar },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/admin/teams", label: "Teams", icon: Users },
      { href: "/admin/judges", label: "Judges", icon: Gavel },
      { href: "/admin/groups", label: "Groups", icon: Layers },
      { href: "/admin/assignments", label: "Assignments", icon: ClipboardCheck },
    ],
  },
  {
    title: "Live & results",
    items: [
      { href: "/admin/monitor", label: "Live Monitor", icon: Radio },
      { href: "/admin/results", label: "Results", icon: Trophy },
      { href: "/admin/reports", label: "Reports", icon: FileText },
      { href: "/admin/archive", label: "Archive", icon: Archive },
      { href: "/judge/dashboard", label: "Judge View", icon: Gavel },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      {
        href: "/admin/help",
        label: "Help / Contact Support",
        icon: LifeBuoy,
      },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/admin/dashboard" && pathname.startsWith(`${href}/`)) {
    return true;
  }
  return false;
}

type AdminShellProps = {
  children: React.ReactNode;
  userName?: string;
  userRole?: "admin" | "judge";
};

export function AdminShell({
  children,
  userName,
  userRole = "admin",
}: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    /* overflow-x-clip (not hidden) keeps sticky top bar working while
       stopping sideways rubber-band scroll past the viewport. */
    <div className="flex w-full max-w-[100dvw] min-h-svh flex-1 overflow-x-clip bg-background">
      <IdleSessionGuard />
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>

      <aside className="glass-sidebar sticky top-0 hidden h-dvh w-[min(272px,30vw)] shrink-0 flex-col overflow-hidden md:flex">
        <SidebarBrand />
        <SidebarNav pathname={pathname} className="sidebar-scroll flex-1" />
        <div className="border-t border-sidebar-border px-3 py-4">
          <SidebarFooter userName={userName} />
        </div>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="glass-sidebar absolute inset-y-0 left-0 flex w-[min(100%,300px)] max-w-[85vw] flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-4">
              <SidebarBrand compact />
              <button
                type="button"
                className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-white/08"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <p id={titleId} className="sr-only">
              Admin navigation
            </p>
            <SidebarNav
              pathname={pathname}
              className="sidebar-scroll flex-1"
              onNavigate={() => setOpen(false)}
            />
            <div className="border-t border-sidebar-border px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <SidebarFooter userName={userName} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <AppTopBar
          userName={userName}
          userRole={userRole}
          onOpenNav={() => setOpen(true)}
          compactAccount
        />
        <main className="min-w-0 px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      <AppFeedbackHost />
    </div>
  );
}

function SidebarBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-sidebar-border",
        compact ? "px-3 py-3" : "px-5 py-5",
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-none bg-white/08">
        <AppLogo href="/admin/dashboard" className="h-9 w-9" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold tracking-tight text-sidebar-primary">
            Admin Panel
          </p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/40">
            Management Console
          </p>
        </div>
      )}
    </div>
  );
}

function SidebarNav({
  pathname,
  className,
  onNavigate,
}: {
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      className={cn("flex flex-col gap-5 px-3 py-5", className)}
      aria-label="Admin"
    >
      {ADMIN_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/30">
            {section.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    prefetch
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex min-h-11 touch-manipulation items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "nav-active-bar bg-sidebar-accent text-sidebar-primary font-semibold"
                        : "text-sidebar-foreground/70 hover:bg-white/[0.04] hover:text-sidebar-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0 transition-opacity",
                        active
                          ? "text-sidebar-primary"
                          : "opacity-50 group-hover:opacity-80",
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ userName }: { userName?: string }) {
  return (
    <div className="space-y-1">
      {userName ? (
        <div className="mb-2 flex items-center gap-2.5 px-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {(userName ?? "U")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("") || "U"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-sidebar-foreground/80">
              {userName}
            </p>
            <p className="text-[10px] text-sidebar-foreground/40">
              Administrator
            </p>
          </div>
        </div>
      ) : null}
      <SignOutButton variant="sidebar" />
    </div>
  );
}
