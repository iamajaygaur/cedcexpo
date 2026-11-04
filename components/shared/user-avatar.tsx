"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Use sidebar-friendly contrast on dark glass sidebars. */
  tone?: "default" | "sidebar";
};

const SIZE_CLASS: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  xs: "size-6 text-[9px]",
  sm: "size-7 text-[10px]",
  md: "size-9 text-[11px] sm:size-10 sm:text-xs",
  lg: "size-14 text-base sm:size-16 sm:text-lg",
  xl: "size-20 text-xl sm:size-24 sm:text-2xl",
};

export function initialsFromName(name?: string | null, fallback = "U"): string {
  const parts = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return initials || fallback;
}

export function UserAvatar({
  name,
  src,
  size = "md",
  className,
  tone = "default",
}: UserAvatarProps) {
  const initials = initialsFromName(name, "U");
  const trimmed = src?.trim() || null;
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(trimmed) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        SIZE_CLASS[size],
        tone === "sidebar"
          ? "bg-primary text-primary-foreground"
          : "bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      <span className={cn(showImage && "opacity-0")}>{initials}</span>
      {trimmed && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Storage URLs
        <img
          key={trimmed}
          src={trimmed}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}
