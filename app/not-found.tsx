import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-20 text-center">
      {/* Large 404 Badge */}
      <div className="relative mb-8">
        <span className="text-[10rem] font-black leading-none tracking-tighter text-muted/40 select-none sm:text-[14rem]">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <Search className="size-16 text-primary/60 sm:size-20" />
        </div>
      </div>

      {/* Copy */}
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check the URL or navigate back to a known section.
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="btn-shimmer gold-glow inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-all duration-200 hover:brightness-105"
        >
          <Home className="size-4" />
          Back to Home
        </Link>
        <Link
          href="/login"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Go to Login
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-16 text-[11px] text-muted-foreground/60">
        © {new Date().getFullYear()} University of Colorado Denver · CEDC
      </p>
    </div>
  );
}
