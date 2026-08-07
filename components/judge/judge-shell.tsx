"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";
import { LayoutDashboard, ClipboardList, X, LifeBuoy } from "lucide-react";

import { AppFeedbackHost } from "@/components/shared/app-feedback";
import { AppLogo } from "@/components/shared/app-logo";
import { AppTopBar } from "@/components/shared/app-top-bar";
import { IdleSessionGuard } from "@/components/shared/idle-session-guard";
import { NavigationProgress } from "@/components/shared/navigation-progress";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { PwaInstallHint } from "@/components/shared/pwa-install-hint";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { cn } from "@/lib/utils";

const JUDGE_NAV = [
  { href: "/judge/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/judge/projects", label: "Evaluations", icon: ClipboardList },
] as const;

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/judge/projects") {
    return (
      pathname.startsWith("/judge/projects") ||
      pathname.startsWith("/judge/evaluate") ||
      pathname.startsWith("/judge/team/")
    );
  }
  return pathname.startsWith(`${href}/`);
}

type JudgeShellProps = {
  children: React.ReactNode;
  userName?: string;
  userRole?: "admin" | "judge";
};

export function JudgeShell({
  children,
  userName,
  userRole = "judge",
}: JudgeShellProps) {
  const pathname = usePathname();
  const router = useRouter();
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
    <div className="flex w-full max-w-[100dvw] min-h-svh flex-1 overflow-x-clip bg-background">
      <IdleSessionGuard />
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="glass-sidebar sticky top-0 hidden h-dvh w-[min(260px,30vw)] shrink-0 flex-col overflow-hidden md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-none bg-white/08">
            <AppLogo href="/judge/dashboard" className="h-9 w-9" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold tracking-tight text-sidebar-primary">
              Judge Panel
            </p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/40">
              Judging Workspace
            </p>
          </div>
        </div>

        <nav
          className="sidebar-scroll flex flex-1 flex-col gap-1 px-3 py-4"
          aria-label="Judge"
        >
          {JUDGE_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                prefetch
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
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
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
          {userName ? (
            <div className="mb-2 flex items-center gap-2.5 px-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {(userName ?? "J")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? "")
                  .join("") || "J"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-sidebar-foreground/80">
                  {userName}
                </p>
                <p className="text-[10px] text-sidebar-foreground/40">Judge</p>
              </div>
            </div>
          ) : null}
          <Link
            href="/judge/help"
            prefetch
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-sidebar-foreground/60 transition-colors hover:bg-white/[0.04] hover:text-sidebar-foreground"
          >
            <LifeBuoy className="size-[18px] shrink-0" aria-hidden />
            Help / Contact Support
          </Link>
          <SignOutButton variant="sidebar" />
        </div>
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────── */}
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
              <div className="min-w-0">
                <p
                  id={titleId}
                  className="truncate text-sm font-bold text-sidebar-primary"
                >
                  Judge Panel
                </p>
                {userName ? (
                  <p className="truncate text-[11px] text-sidebar-foreground/50">
                    {userName}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-white/08"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav
              className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
              aria-label="Judge mobile drawer"
            >
              {JUDGE_NAV.map(({ href, label, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch
                    onClick={() => setOpen(false)}
                    className={cn(
                      "relative flex min-h-12 touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                      active
                        ? "nav-active-bar bg-sidebar-accent text-sidebar-primary font-semibold"
                        : "text-sidebar-foreground/80 hover:bg-white/[0.04] hover:text-sidebar-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    {label}
                  </Link>
                );
              })}
              <Link
                href="/judge/help"
                prefetch
                onClick={() => setOpen(false)}
                className="relative flex min-h-12 touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-sidebar-foreground/80 transition-colors hover:bg-white/[0.04] hover:text-sidebar-foreground"
              >
                <LifeBuoy className="size-5 shrink-0" aria-hidden />
                Help / Contact Support
              </Link>
            </nav>
            <div className="border-t border-sidebar-border px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <SignOutButton variant="sidebar" />
            </div>
          </aside>
        </div>
      ) : null}

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <AppTopBar
          userName={userName}
          userRole={userRole}
          searchPlaceholder="Search projects…"
          settingsHref="/judge/dashboard"
          onOpenNav={() => setOpen(true)}
          onSearch={() => router.push("/judge/projects")}
          compactAccount
        />
        <div className="px-4 pt-3 md:px-8">
          <PwaInstallHint />
        </div>

        <main className="min-w-0 px-3 py-4 sm:px-4 sm:py-5 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      <AppFeedbackHost />
    </div>
  );
}
