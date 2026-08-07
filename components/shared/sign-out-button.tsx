"use client";

import { LogOut } from "lucide-react";

import { clientSignOut } from "@/lib/auth/client-sign-out";
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
      <button
        type="button"
        onClick={() => void clientSignOut()}
        className={
          className ??
          "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }
      >
        <LogOut className="size-5 shrink-0 opacity-80" aria-hidden />
        Sign out
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={() => void clientSignOut()}
    >
      <LogOut className="size-4" aria-hidden />
      Sign out
    </Button>
  );
}
