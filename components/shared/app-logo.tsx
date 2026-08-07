import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Bump when brand PNGs change so browsers skip stale cache. */
const LOGO_CACHE = "v3";

type AppLogoProps = {
  className?: string;
  href?: string;
  variant?: "mark" | "horizontal";
};

export function AppLogo({
  className,
  href = "/",
  variant = "mark",
}: AppLogoProps) {
  const src =
    variant === "horizontal"
      ? `/brand/cedc-logo-horizontal.png?${LOGO_CACHE}`
      : `/brand/cedc-mark.png?${LOGO_CACHE}`;

  const image = (
    <Image
      src={src}
      alt="CU Denver College of Engineering, Design and Computing"
      width={variant === "horizontal" ? 1617 : 48}
      height={variant === "horizontal" ? 953 : 48}
      className={cn(
        "object-contain rounded-none",
        variant === "horizontal"
          ? "mx-auto h-auto w-full max-w-[20rem]"
          : "h-12 w-12",
        className,
      )}
      unoptimized
      priority
    />
  );

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2",
        variant === "horizontal"
          ? "mx-auto w-full max-w-full justify-center"
          : "shrink-0",
      )}
    >
      {image}
    </Link>
  );
}
