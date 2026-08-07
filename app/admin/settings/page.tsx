import { OpsEventEmpty } from "@/components/admin/ops-event-empty";
import { AdminPasswordForm } from "@/components/admin/admin-password-form";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { AppFooter } from "@/components/shared/app-footer";
import { resolveOperationalEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";
import { getAppOrigin } from "@/lib/utils/app-url";

type PageProps = {
  searchParams: Promise<{ eventId?: string }>;
};

export default async function SettingsPage({ searchParams }: PageProps) {
  const { eventId } = await searchParams;
  const { supabase } = await requireAdminClient();
  const { event, events, lockedEvent } = await resolveOperationalEvent(
    supabase,
    eventId,
  );
  const appOrigin = getAppOrigin();

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "Settings" }]}
        title="Settings"
        description="Event configuration, password, and production notes."
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {event ? (
          <SettingsForm event={event} />
        ) : (
          <OpsEventEmpty
            lockedEvent={lockedEvent}
            hasAnyEvent={events.length > 0}
          />
        )}
        <AdminPasswordForm />
      </div>

      {lockedEvent && event ? (
        <OpsEventEmpty lockedEvent={lockedEvent} hasAnyEvent />
      ) : null}

      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-2 text-lg font-semibold">Judging rubric</h2>
        <p className="text-sm text-muted-foreground">
          The judge evaluation form always uses the fixed CEDC rubric (5
          criteria, 10 points each, max 50) with ABET outcome tags. There is no
          criteria editor — new events get this rubric automatically.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Design Execution</li>
          <li>Professionalism</li>
          <li>Presentation Quality</li>
          <li>Teamwork</li>
          <li>Project Impact</li>
        </ul>
      </section>

      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-2 text-lg font-semibold">App & PWA</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <dt className="font-medium text-muted-foreground">App URL</dt>
            <dd className="break-all">{appOrigin}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="font-medium text-muted-foreground">Display</dt>
            <dd>Standalone PWA (Add to Home Screen supported)</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="font-medium text-muted-foreground">Caching</dt>
            <dd>
              Static shell/icons only — authenticated judge/admin data is never
              aggressively cached
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-2 text-lg font-semibold">Security reminders</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Never put the service-role key in client code or the example env file.</li>
          <li>Promote admins only via SQL / trusted admin tooling.</li>
          <li>QR codes are locators — they do not grant evaluation rights.</li>
          <li>See `.planning/SECURITY.md` and `.planning/PRODUCTION.md`.</li>
        </ul>
      </section>

      <AppFooter supportEmail={event?.support_email} linkBase="/admin" />
    </div>
  );
}
