import { AssignmentsManager } from "@/components/admin/assignments-manager";
import { OpsEventEmpty } from "@/components/admin/ops-event-empty";
import { PageHeader } from "@/components/admin/page-header";
import { resolveOperationalEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";
import { TABLES } from "@/lib/supabase/tables";
import type { JudgeGroup, Team } from "@/types/database";

type PageProps = {
  searchParams: Promise<{ eventId?: string }>;
};

type GroupPick = Pick<JudgeGroup, "id" | "name" | "color_key">;

export default async function AssignmentsPage({ searchParams }: PageProps) {
  const { eventId } = await searchParams;
  const { supabase } = await requireAdminClient();
  const { event, events, lockedEvent } = await resolveOperationalEvent(
    supabase,
    eventId,
  );

  let rows: {
    team: Team;
    groups: GroupPick[];
  }[] = [];
  let groups: JudgeGroup[] = [];

  if (event) {
    const [
      { data: teams, error: teamsError },
      { data: groupsData, error: groupsError },
      { data: assignments, error: assignError },
    ] = await Promise.all([
      supabase
        .from(TABLES.teams)
        .select("*")
        .eq("event_id", event.id)
        .order("team_number"),
      supabase
        .from(TABLES.judgeGroups)
        .select("*")
        .eq("event_id", event.id)
        .order("display_order"),
      supabase
        .from(TABLES.judgingAssignments)
        .select("team_id, group_id, judge_groups(id, name, color_key)")
        .eq("event_id", event.id),
    ]);

    if (teamsError) throw new Error(teamsError.message);
    if (groupsError) throw new Error(groupsError.message);
    if (assignError) throw new Error(assignError.message);

    groups = (groupsData ?? []) as JudgeGroup[];

    const byTeam = new Map<string, GroupPick[]>();
    for (const a of assignments ?? []) {
      const g = a.judge_groups as GroupPick | GroupPick[] | null;
      const group = Array.isArray(g) ? g[0] : g;
      if (!group) continue;
      const list = byTeam.get(a.team_id) ?? [];
      list.push(group);
      byTeam.set(a.team_id, list);
    }

    rows = ((teams ?? []) as Team[]).map((team) => ({
      team,
      groups: byTeam.get(team.id) ?? [],
    }));
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Assignments" }]}
        title="Judging Assignments"
        description="Assign each team to up to two color groups (Eval #1 & Eval #2). All judges in those groups evaluate the team."
      />
      {lockedEvent && event ? (
        <div className="mb-6">
          <OpsEventEmpty lockedEvent={lockedEvent} hasAnyEvent />
        </div>
      ) : null}
      {event ? (
        <AssignmentsManager
          eventId={event.id}
          rows={rows}
          groups={groups}
        />
      ) : (
        <OpsEventEmpty
          lockedEvent={lockedEvent}
          hasAnyEvent={events.length > 0}
        />
      )}
    </div>
  );
}
