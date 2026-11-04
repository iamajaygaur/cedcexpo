import Link from "next/link";

import { ProjectCard } from "@/components/judge/project-card";
import { GroupBadge } from "@/components/shared/group-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getJudgeWorkspace } from "@/lib/judge/context";
import { cn } from "@/lib/utils";

const EMPTY_STATE_CLASS = "dash-empty";

export default async function JudgeProjectsPage() {
  const workspace = await getJudgeWorkspace();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
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
        <p className={cn(EMPTY_STATE_CLASS, "text-sm text-muted-foreground")}>
          No judge profile found for this account.
        </p>
      ) : workspace.blockReason === "event_ended" ? (
        <div className={EMPTY_STATE_CLASS}>
          <h2 className="text-lg font-semibold text-foreground">
            This expo has ended
          </h2>
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
        <div className={cn(EMPTY_STATE_CLASS, "space-y-3 text-sm text-muted-foreground")}>
          <p>No assigned projects yet.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/judge/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspace.projects.map((project) => (
            <ProjectCard key={project.team.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
