import Link from "next/link";

import { AppFooter } from "@/components/shared/app-footer";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";

type TermsOfServiceContentProps = {
  linkBase?: "" | "/admin" | "/judge";
  supportEmail?: string | null;
  className?: string;
};

export function TermsOfServiceContent({
  linkBase = "",
  supportEmail,
  className,
}: TermsOfServiceContentProps) {
  const helpHref = `${linkBase}/help`;
  const privacyHref = `${linkBase}/privacy`;

  return (
    <div className={cn("space-y-8", className)}>
      <PageHeader
        breadcrumbs={[
          { label: "Help / Contact Support", href: helpHref },
          { label: "Terms of Service" },
        ]}
        title="Terms of Service"
        description="Rules for using the Capstone Design Expo judging system."
      />

      <section className="space-y-4 rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
        <p>
          By signing in and using this application, you agree to use it only
          for authorized Capstone Design Expo judging and administration at CU
          Denver CEDC.
        </p>
        <h2 className="text-base font-semibold text-foreground">
          Acceptable use
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Use only the account issued to you for your role</li>
          <li>Keep credentials confidential; do not share judge or admin logins</li>
          <li>Submit accurate evaluations and do not manipulate scores</li>
          <li>Do not attempt to access data outside your assigned permissions</li>
        </ul>
        <h2 className="text-base font-semibold text-foreground">
          Service availability
        </h2>
        <p>
          The app is provided for expo operations. Features may change between
          events. Organizers may pause or complete an event, which can limit
          further submissions.
        </p>
        <h2 className="text-base font-semibold text-foreground">
          Intellectual property
        </h2>
        <p>
          CU Denver and CEDC branding, and project materials entered into the
          system, remain the property of their respective owners. The judging
          software is for institutional use.
        </p>
        <h2 className="text-base font-semibold text-foreground">
          Contact
        </h2>
        <p>
          For access or support, visit{" "}
          <Link
            href={`${helpHref}#contact`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Help / Contact Support
          </Link>
          . Privacy practices are described in the{" "}
          <Link
            href={privacyHref}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <AppFooter supportEmail={supportEmail} linkBase={linkBase} />
    </div>
  );
}
