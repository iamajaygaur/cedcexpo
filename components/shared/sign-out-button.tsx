"use client";

import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/auth/actions";
import { clearClientAuthArtifacts } from "@/lib/auth/clear-client-session";
import { Button } from "@/components/ui/button";

type SignOutButtonProps = {
  className?: string;
  variant?: "sidebar" | "default";
};

export function SignOutButton({
  className,
  variant = "default",
}: SignOutButtonProps) {
  if (variant === "sidebar") {
    return (
      <form action={logoutAction} onSubmit={() => clearClientAuthArtifacts()}>
        <button
          type="submit"
          className={
            className ??
            "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }
        >
          <LogOut className="size-5 shrink-0 opacity-80" aria-hidden />
          Sign out
        </button>
      </form>
    );
  }

  return (
    <form action={logoutAction} onSubmit={() => clearClientAuthArtifacts()}>
      <Button type="submit" variant="outline" className={className}>
        <LogOut className="size-4" aria-hidden />
        Sign out
      </Button>
    </form>
  );
}
