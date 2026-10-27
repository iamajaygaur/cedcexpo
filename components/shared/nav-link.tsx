"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type NavLinkProps = React.ComponentProps<typeof Link> & {
  /** Extra classes when this route is pending */
  pendingClassName?: string;
  showSpinner?: boolean;
};

function NavLinkPending({
  showSpinner,
  pendingClassName,
}: {
  showSpinner?: boolean;
  pendingClassName?: string;
}) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      className={cn("inline-flex items-center", pendingClassName)}
      aria-hidden
    >
      {showSpinner ? (
        <Loader2 className="size-3.5 animate-spin opacity-70" />
      ) : (
        <span className="size-1.5 rounded-full bg-current opacity-70" />
      )}
    </span>
  );
}

/**
 * Next.js Link with pending navigation feedback (click → loading cue).
 */
export function NavLink({
  children,
  className,
  pendingClassName,
  showSpinner = false,
  ...props
}: NavLinkProps) {
  return (
    <Link
      {...props}
      className={cn(
        "transition-[transform,opacity,background-color,color] duration-150 ease-out active:scale-[0.98]",
        className,
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        {children}
        <NavLinkPending
          showSpinner={showSpinner}
          pendingClassName={pendingClassName}
        />
      </span>
    </Link>
  );
}
