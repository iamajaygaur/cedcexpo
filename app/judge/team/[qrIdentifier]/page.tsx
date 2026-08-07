import Link from "next/link";
import { redirect } from "next/navigation";

import { GroupBadge } from "@/components/shared/group-badge";
import { Button } from "@/components/ui/button";
import { resolveTeamQr } from "@/lib/judge/qr";

type PageProps = {
  params: Promise<{ qrIdentifier: string }>;
};

export default async function JudgeTeamQrPage({ params }: PageProps) {
  const { qrIdentifier } = await params;
  const result = await resolveTeamQr(decodeURIComponent(qrIdentifier));

  if (result.status === "not_found") {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-md border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">Team not found</h1>
        <p className="text-sm text-muted-foreground">
          This QR code does not match a team in the system. It may have been
          regenerated — ask expo staff for a new code.
        </p>
        <Button asChild>
          <Link href="/judge/dashboard">Back to assigned projects</Link>
        </Button>
      </div>
    );
  }

  if (result.status === "allowed") {
    redirect(`/judge/evaluate/${result.team.team_id}`);
  }

  if (result.status === "no_judge") {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-md border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">Judge profile required</h1>
        <p className="text-sm text-muted-foreground">
          You are signed in, but there is no active judge record for this
          account. Contact expo staff.
        </p>
        <p className="text-sm text-muted-foreground">
          Scanned: Team {result.team.team_number} — {result.team.project_title}
        </p>
        <Button asChild>
          <Link href="/judge/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (result.status === "unassigned") {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-md border border-border bg-card p-8 text-center">
        <h1 className="text-xl font-semibold">Team not assigned</h1>
        <p className="text-sm text-muted-foreground">
          <strong>
            Team {result.team.team_number} — {result.team.project_title}
          </strong>{" "}
          has not been assigned to a judging group yet.
        </p>
        <Button asChild>
          <Link href="/judge/dashboard">Back to assigned projects</Link>
        </Button>
      </div>
    );
  }

  // wrong_group — QR never bypasses authorization
  return (
    <div className="mx-auto max-w-lg space-y-5 rounded-md border border-border bg-card p-8 text-center">
      <h1 className="text-xl font-semibold">Wrong judging group</h1>
      <p className="text-sm text-muted-foreground">
        <strong>
          Team {result.team.team_number} — {result.team.project_title}
        </strong>
      </p>
      {result.team.assigned_group_name &&
      result.team.assigned_group_color_key ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-foreground">
            This project is assigned to{" "}
            <strong>{result.team.assigned_group_name}</strong>.
          </p>
          <GroupBadge
            colorKey={result.team.assigned_group_color_key}
            name={result.team.assigned_group_name}
          />
        </div>
      ) : null}
      {result.judgeGroupName ? (
        <p className="text-sm text-muted-foreground">
          You are in <strong>{result.judgeGroupName}</strong>. You can only
          evaluate teams assigned to your group.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          You are not assigned to evaluate this project.
        </p>
      )}
      <Button asChild className="min-h-11">
        <Link href="/judge/dashboard">Return to assigned projects</Link>
      </Button>
    </div>
  );
}
