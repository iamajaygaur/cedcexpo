import Link from "next/link";
import { Mail, MessageCircleQuestion } from "lucide-react";

import { AppFooter } from "@/components/shared/app-footer";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_SUPPORT_EMAIL,
  supportMailto,
} from "@/lib/site-links";
import { cn } from "@/lib/utils";

type HelpSupportContentProps = {
  supportEmail?: string | null;
  /** Where Privacy / Terms / footer links should point (e.g. "/admin") */
  linkBase?: "" | "/admin" | "/judge";
  className?: string;
};

export function HelpSupportContent({
  supportEmail,
  linkBase = "",
  className,
}: HelpSupportContentProps) {
  const email = supportEmail?.trim() || DEFAULT_SUPPORT_EMAIL;
  const privacyHref = `${linkBase}/privacy`;
  const termsHref = `${linkBase}/terms`;

  return (
    <div className={cn("space-y-8", className)}>
      <PageHeader
        breadcrumbs={[{ label: "Help / Contact Support" }]}
        title="Help / Contact Support"
        description="Guides for using CEDC Expo, plus ways to reach CEDC support."
      />

      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <MessageCircleQuestion className="size-5 text-primary" aria-hidden />
          Quick help
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Admins</span> —
            manage events, teams, judges, color groups, assignments, and live
            progress from the Admin Panel sidebar.
          </li>
          <li>
            <span className="font-medium text-foreground">Judges</span> — open
            Evaluations, score assigned teams with the fixed CEDC rubric, and
            submit when ready. Drafts save as you go.
          </li>
          <li>
            <span className="font-medium text-foreground">Sign-in issues</span> —
            use the account email you were given for this expo. If your session
            expires after idle time, sign in again.
          </li>
          <li>
            <span className="font-medium text-foreground">QR codes</span> — team
            QR codes help locate projects; they do not grant judging rights by
            themselves.
          </li>
        </ul>
      </section>

      <section
        id="contact"
        className="scroll-mt-24 rounded-md border border-border bg-card p-5"
      >
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <Mail className="size-5 text-primary" aria-hidden />
          Contact Support
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Need access, password help, or reporting a problem? Email CEDC Expo
          support and include your role (admin or judge) and the event name.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="gap-2">
            <a href={supportMailto(email, "CEDC Expo Support")}>
              <Mail className="size-4" aria-hidden />
              Email {email}
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Typical response during expo week: same business day.
          </p>
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Policies</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Review how we handle data and the terms for using this judging app.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={privacyHref}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <Link
            href={termsHref}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Terms of Service
          </Link>
        </div>
      </section>

      <AppFooter supportEmail={email} linkBase={linkBase} />
    </div>
  );
}
