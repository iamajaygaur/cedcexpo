import Link from "next/link";

import { JudgePreviewSwitcher } from "@/components/judge/judge-preview-switcher";
import { ProgressCard } from "@/components/judge/progress-card";
import { ProjectCard } from "@/components/judge/project-card";
import { GroupBadge } from "@/components/shared/group-badge";
import { PageHeader } from "@/components/shared/page-header";
import { requireSessionProfile } from "@/lib/auth/session";
import {
  getJudgeWorkspace,
  listJudgesForPreview,
} from "@/lib/judge/context";
import { Button } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ previewJudgeId?: string }>;
};

export default async function JudgeDashboardPage({ searchParams }: PageProps) {
  const profile = await requireSessionProfile();
  const { previewJudgeId } = await searchParams;
  const isAdmin = profile.role === "admin";

  const workspace = await getJudgeWorkspace({
    previewJudgeId: isAdmin ? previewJudgeId : null,
  });

  const previewJudges = isAdmin ? await listJudgesForPreview() : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard" }]}
        title="Judge Dashboard"
        description={
          workspace.event
            ? `${workspace.event.name} · ${
                workspace.isAdminPreview
                  ? "Admin preview mode"
                  : `Welcome, ${profile.fullName || profile.email}`
              }`
            : `Welcome, ${profile.fullName || profile.email}`
        }
        actions={
          workspace.group ? (
            <GroupBadge
              colorKey={workspace.group.color_key}
              name={workspace.group.name}
            />
          ) : null
        }
      />

      {isAdmin ? (
        <JudgePreviewSwitcher
          judges={previewJudges}
          currentJudgeId={
            workspace.isAdminPreview ? workspace.judge?.id ?? null : null
          }
        />
      ) : null}

      {workspace.blockReason === "no_judge_profile" ? (
        <div className="space-y-4 rounded-md border border-dashed border-border bg-muted/40 px-4 py-10 text-center">
          <h2 className="text-lg font-semibold">No judge profile on this login</h2>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            {isAdmin ? (
              <>
                You are signed in as <strong>admin</strong>. Use the preview
                dropdown above to open a judge&apos;s dashboard, or open a new
                browser / incognito window and sign in with a judge account.
              </>
            ) : (
              <>
                This account does not have an active judge record. Ask an admin
                to create a judge login for you under Judges Management.
              </>
            )}
          </p>
          {isAdmin ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/judges">Manage judges</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/dashboard">Admin dashboard</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {workspace.blockReason === "no_event" ? (
        <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No active expo event yet. An admin must create and activate an event
          first.
        </p>
      ) : null}

      {workspace.blockReason === "event_ended" ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-10 text-center">
          <h2 className="text-lg font-semibold">This expo has ended</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {workspace.event ? (
              <>
                <strong>{workspace.event.name}</strong> is{" "}
                {workspace.event.status}. Judging is closed. Scores are kept for
                admin Archive and Reports — you cannot submit new evaluations.
              </>
            ) : (
              <>Judging is closed for this expo.</>
            )}
          </p>
        </div>
      ) : null}

      {workspace.blockReason === "no_group" ? (
        <div className="space-y-3 rounded-md border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            You are not assigned to a color group for{" "}
            <strong>{workspace.event?.name ?? "this event"}</strong>. Ask an
            admin to assign you on Judges or Groups.
          </p>
          {isAdmin ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/groups">Open Groups</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {workspace.judge &&
      workspace.event &&
      workspace.group &&
      workspace.blockReason !== "event_ended" ? (
        <>
          <ProgressCard
            completed={workspace.stats.completed}
            total={workspace.stats.total}
          />

          <section>
            <h2 className="mb-4 text-xl font-bold tracking-tight">
              Your Assigned Projects
            </h2>
            {workspace.blockReason === "no_team_assignments" ? (
              <div className="space-y-3 rounded-md border border-dashed border-border px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  Group assigned — but no projects yet
                </p>
                <p className="mx-auto max-w-lg text-sm text-muted-foreground">
                  You are in <strong>{workspace.group.name}</strong>. Projects
                  appear here only after an admin assigns <strong>teams</strong>{" "}
                  to this color group under Assignments (each team can belong to
                  up to two groups for dual evaluation).
                </p>
                {isAdmin ? (
                  <Button asChild className="min-h-10">
                    <Link href="/admin/assignments">Assign teams to groups</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {workspace.projects.map((project) => (
                  <ProjectCard
                    key={project.team.id}
                    project={project}
                    previewJudgeId={
                      workspace.isAdminPreview ? workspace.judge?.id : null
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
