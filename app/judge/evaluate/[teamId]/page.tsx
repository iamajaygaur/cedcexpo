import Link from "next/link";

import { EvaluationForm } from "@/components/judge/evaluation-form";
import { Button } from "@/components/ui/button";
import { getEvaluationPageData } from "@/lib/judge/evaluation-data";
import { requireSessionProfile } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ previewJudgeId?: string }>;
};

export default async function EvaluateTeamPage({
  params,
  searchParams,
}: PageProps) {
  const { teamId } = await params;
  const { previewJudgeId } = await searchParams;
  const profile = await requireSessionProfile();
  const isAdmin = profile.role === "admin";

  const { access, criteria, scores, adminPreview, denyReason } =
    await getEvaluationPageData(teamId, {
      previewJudgeId: isAdmin ? previewJudgeId : null,
    });

  if (!access.allowed || !access.project || !access.workspace.event) {
    const title =
      denyReason === "no_judge_profile"
        ? "No judge profile"
        : denyReason === "no_team"
          ? "Team not found"
          : "Not assigned";

    const message =
      denyReason === "no_judge_profile" ? (
        isAdmin ? (
          <>
            You are signed in as <strong>admin</strong>. Open{" "}
            <Link href="/judge/dashboard" className="underline">
              Judge Dashboard
            </Link>
            , pick a judge in the preview dropdown, then open a project — or
            open a team URL directly (admins can preview the evaluation form).
          </>
        ) : (
          <>
            This account does not have an active judge record. Ask an admin to
            add you under Judges.
          </>
        )
      ) : denyReason === "no_group" ? (
        <>
          You are not in a color group for this event. Ask an admin to assign
          you on Groups.
        </>
      ) : denyReason === "no_event" ? (
        <>No active expo event is available yet.</>
      ) : denyReason === "event_ended" ? (
        <>
          This expo has ended. Judging is closed — scores are kept in admin
          Archive and Reports.
        </>
      ) : denyReason === "no_team" ? (
        <>That team does not exist.</>
      ) : (
        <>
          This team is not assigned to your color group. Open{" "}
          <Link href="/judge/projects" className="underline">
            Your Assigned Projects
          </Link>{" "}
          and evaluate a team listed there.
          {isAdmin ? (
            <>
              {" "}
              As admin, go to{" "}
              <Link href="/admin/assignments" className="underline">
                Assignments
              </Link>{" "}
              to assign teams to your judge&apos;s group.
            </>
          ) : null}
        </>
      );

    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-md border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/judge/dashboard">Back to assigned projects</Link>
          </Button>
          {isAdmin ? (
            <Button asChild variant="outline">
              <Link href="/admin/teams">Browse teams</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {adminPreview || access.workspace.isAdminPreview ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-primary/30 bg-primary-container/25 px-4 py-3 text-sm text-on-primary-container"
        >
          <strong>Admin preview.</strong> You can review this evaluation form,
          but scores cannot be saved while signed in as admin. Sign in as the
          assigned judge (or use a separate judge account) to score for real.
        </div>
      ) : null}
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link
            href={
              previewJudgeId
                ? `/judge/dashboard?previewJudgeId=${previewJudgeId}`
                : "/judge/projects"
            }
          >
            ← Back to evaluations
          </Link>
        </Button>
      </div>
      <EvaluationForm
        team={access.project.team}
        event={access.workspace.event}
        project={access.project}
        criteria={criteria}
        initialScores={scores}
        adminPreview={adminPreview || access.workspace.isAdminPreview}
      />
    </div>
  );
}
