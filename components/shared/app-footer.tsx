import { cn } from "@/lib/utils";
import Link from "next/link";

import { supportMailto } from "@/lib/site-links";

type AppFooterProps = {
  supportEmail?: string | null;
  /** Path prefix for Privacy / Terms / Help links */
  linkBase?: "" | "/admin" | "/judge";
  className?: string;
};

export function AppFooter({
  supportEmail,
  linkBase = "",
  className,
}: AppFooterProps) {
  const privacyHref = `${linkBase}/privacy`;
  const termsHref = `${linkBase}/terms`;
  const helpHref = `${linkBase}/help#contact`;

  return (
    <footer
      className={cn(
        "border-t border-border/60 pt-8 pb-6 text-center sm:pb-8",
        className,
      )}
    >
      <p className="text-sm font-bold text-primary">Capstone Design Expo</p>
      <nav
        className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
        aria-label="Footer"
      >
        <Link
          href={privacyHref}
          className="hover:text-foreground hover:underline"
        >
          Privacy Policy
        </Link>
        <Link href={termsHref} className="hover:text-foreground hover:underline">
          Terms of Service
        </Link>
        <Link
          href={helpHref}
          className="hover:text-foreground hover:underline"
        >
          Contact Support
        </Link>
      </nav>
      <p className="mt-3 text-[11px] text-muted-foreground/70">
        © {new Date().getFullYear()} University of Colorado Denver | College of
        Engineering, Design and Computing
        <span className="mx-1.5" aria-hidden>
          ·
        </span>
        <a
          href={supportMailto(supportEmail, "CEDC Capstone Design Expo Support")}
          className="hover:text-foreground hover:underline"
        >
          {supportEmail?.trim() || "engineering@ucdenver.edu"}
        </a>
      </p>
    </footer>
  );
}
