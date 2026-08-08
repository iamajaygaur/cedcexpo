"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronDown,
  LogOut,
  Menu,
  RefreshCw,
  User,
} from "lucide-react";

import { clientSignOut } from "@/lib/auth/client-sign-out";
import { NotificationBell } from "@/components/shared/notification-bell";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

type AppTopBarProps = {
  userName?: string;
  userRole?: "admin" | "judge";
  searchPlaceholder?: string;
  settingsHref?: string;
  onSearch?: (query: string) => void;
  onOpenNav?: () => void;
  showMenuButton?: boolean;
  /** Hide name/role text on small screens (avatar + chevron only). */
  compactAccount?: boolean;
  className?: string;
};

export function AppTopBar({
  userName,
  userRole,
  searchPlaceholder = "Search teams, judges, events...",
  settingsHref = "/admin/settings",
  onSearch,
  onOpenNav,
  showMenuButton = true,
  compactAccount = false,
  className,
}: AppTopBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const initials =
    (userName ?? "U")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U";

  const roleLabel =
    userRole === "admin" ? "Admin" : userRole === "judge" ? "Judge" : "Account";

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (onSearch) {
      onSearch(q);
      return;
    }
    const lower = q.toLowerCase();
    if (lower.includes("judge")) router.push("/admin/judges");
    else if (lower.includes("event")) router.push("/admin/events");
    else if (lower.includes("group")) router.push("/admin/groups");
    else if (lower.includes("assign")) router.push("/admin/assignments");
    else if (lower.includes("result")) router.push("/admin/results");
    else if (lower.includes("report")) router.push("/admin/reports");
    else if (lower.includes("setting")) router.push("/admin/settings");
    else if (lower.includes("monitor") || lower.includes("live"))
      router.push("/admin/monitor");
    else router.push("/admin/teams");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 shrink-0 border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/90",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 md:px-6 md:py-3">
        {/* Mobile menu button */}
        {showMenuButton ? (
          <button
            type="button"
            className="relative z-40 flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground transition-colors hover:bg-muted md:hidden"
            onClick={() => onOpenNav?.()}
            aria-label="Open navigation"
          >
            <Menu className="pointer-events-none size-5" />
          </button>
        ) : null}

        {/* Search — Chrome iOS autofill injects __gcruniqueid before hydrate */}
        <form
          onSubmit={handleSearch}
          className="min-w-0 max-w-xl flex-1"
          role="search"
          suppressHydrationWarning
        >
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
            suppressHydrationWarning
          />
        </form>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <NotificationBell enabled={userRole === "admin"} />

          {/* Divider */}
          {userRole === "admin" ? (
            <div
              className="mx-1 hidden h-5 w-px bg-border sm:block"
              aria-hidden
            />
          ) : null}

          {/* Account menu — avatar + name + role */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className={cn(
                "flex max-w-[11rem] touch-manipulation items-center gap-2 rounded-xl py-1 pl-1 pr-1.5 transition-colors hover:bg-muted/70 sm:max-w-[16rem] sm:gap-2.5 sm:pr-2",
              )}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuId}
              aria-label={`Account menu for ${userName || roleLabel}`}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[11px] font-bold text-primary-foreground sm:size-10 sm:text-xs"
                aria-hidden
              >
                {initials}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-left",
                  compactAccount
                    ? "hidden sm:block"
                    : "hidden min-[420px]:block",
                )}
              >
                <span className="block truncate text-sm font-bold leading-tight text-foreground">
                  {userName || "Signed in"}
                </span>
                <span className="block truncate text-xs leading-tight text-muted-foreground">
                  {roleLabel}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-foreground/70 transition-transform duration-200",
                  menuOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {menuOpen ? (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 z-50 mt-2 w-56 animate-scale-in overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              >
                <Link
                  href={settingsHref}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="size-4 text-muted-foreground" aria-hidden />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    setMenuOpen(false);
                    void clientSignOut({ switchAccount: true });
                  }}
                >
                  <RefreshCw
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  Switch account
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  onClick={() => {
                    setMenuOpen(false);
                    void clientSignOut();
                  }}
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
