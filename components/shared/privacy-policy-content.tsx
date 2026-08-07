import Link from "next/link";

import { AppFooter } from "@/components/shared/app-footer";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

type PrivacyPolicyContentProps = {
  linkBase?: "" | "/admin" | "/judge";
  supportEmail?: string | null;
  className?: string;
};

export function PrivacyPolicyContent({
  linkBase = "",
  supportEmail,
  className,
}: PrivacyPolicyContentProps) {
  const helpHref = `${linkBase}/help`;
  const termsHref = `${linkBase}/terms`;

  return (
    <div className={cn("space-y-8", className)}>
      <PageHeader
        breadcrumbs={[
          { label: "Help / Contact Support", href: helpHref },
          { label: "Privacy Policy" },
        ]}
        title="Privacy Policy"
        description="How the Capstone Design Expo judging system handles account and evaluation data."
      />

      <section className="space-y-4 rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
        <p>
          This application is operated by the University of Colorado Denver
          College of Engineering, Design and Computing (CEDC) for Capstone
          Design Expo judging.
        </p>
        <h2 className="text-base font-semibold text-foreground">
          Information we collect
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Account name, email, and role (admin or judge)</li>
          <li>Team and project information entered by organizers</li>
          <li>Judge evaluations, scores, and related timestamps</li>
          <li>Basic technical logs needed to keep the service secure</li>
        </ul>
        <h2 className="text-base font-semibold text-foreground">
          How we use information
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Authenticate users and enforce role-based access</li>
          <li>Run live judging, results, and reporting for the expo</li>
          <li>Contact organizers or judges about access or event issues</li>
        </ul>
        <h2 className="text-base font-semibold text-foreground">
          Sharing
        </h2>
        <p>
          Evaluation data is visible to authorized CEDC admins and, as
          appropriate, to judges for their assigned work. We do not sell
          personal information. Service providers (for example hosting and
          authentication) process data only to operate this app.
        </p>
        <h2 className="text-base font-semibold text-foreground">
          Retention
        </h2>
        <p>
          Event data may be archived after an expo ends for institutional
          records. Contact support if you need an account update or removal
          request reviewed.
        </p>
        <p>
          Questions? See{" "}
          <Link
            href={helpHref}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Help / Contact Support
          </Link>{" "}
          or read the{" "}
          <Link
            href={termsHref}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Terms of Service
          </Link>
          .
        </p>
      </section>

      <AppFooter supportEmail={supportEmail} linkBase={linkBase} />
    </div>
  );
}
