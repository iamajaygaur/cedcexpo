import Link from "next/link";

import { ProjectCard } from "@/components/judge/project-card";
import { GroupBadge } from "@/components/shared/group-badge";
import { PageHeader } from "@/components/shared/page-header";
import { getJudgeWorkspace } from "@/lib/judge/context";
import { Button } from "@/components/ui/button";

export default async function JudgeProjectsPage() {
  const workspace = await getJudgeWorkspace();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Evaluations" }]}
        title="Your Assigned Projects"
        description={
          workspace.event?.name ?? "Assigned projects for your color group"
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

      {!workspace.judge ? (
        <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No judge profile found for this account.
        </p>
      ) : workspace.blockReason === "event_ended" ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-10 text-center">
          <h2 className="text-lg font-semibold">This expo has ended</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Judging is closed for{" "}
            <strong>{workspace.event?.name ?? "this event"}</strong>. Scores
            remain available to admins in Archive and Reports.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/judge/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      ) : workspace.projects.length === 0 ? (
        <div className="space-y-3 rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          <p>No assigned projects yet.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/judge/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workspace.projects.map((project) => (
            <ProjectCard key={project.team.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
