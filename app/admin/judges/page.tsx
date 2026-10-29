import {
  JudgesManager,
  type GroupTeamSummary,
  type JudgeRow,
} from "@/components/admin/judges-manager";
import { OpsEventEmpty } from "@/components/admin/ops-event-empty";
import { resolveOperationalEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";
import { TABLES } from "@/lib/supabase/tables";
import type { JudgeGroup } from "@/types/database";

type PageProps = {
  searchParams: Promise<{ eventId?: string; focus?: string }>;
};

export default async function JudgesPage({ searchParams }: PageProps) {
  const { eventId, focus } = await searchParams;
  const { supabase } = await requireAdminClient();
  const { event, events, lockedEvent } = await resolveOperationalEvent(
    supabase,
    eventId,
  );

  const { data: judgesData, error: judgesError } = await supabase
    .from(TABLES.judges)
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false });
  if (judgesError) throw new Error(judgesError.message);

  let groups: JudgeGroup[] = [];
  const membershipByJudge = new Map<
    string,
    Pick<JudgeGroup, "id" | "name" | "color_key" | "display_order">
  >();
  const teamsByGroup: Record<string, GroupTeamSummary[]> = {};

  if (event) {
    const { data: groupsData, error: groupsError } = await supabase
      .from(TABLES.judgeGroups)
      .select("*")
      .eq("event_id", event.id)
      .order("display_order");
    if (groupsError) throw new Error(groupsError.message);
    groups = (groupsData ?? []) as JudgeGroup[];

    const { data: members, error: membersError } = await supabase
      .from(TABLES.judgeGroupMembers)
      .select(
        "judge_id, group_id, judge_groups(id, name, color_key, display_order)",
      )
      .eq("event_id", event.id);
    if (membersError) throw new Error(membersError.message);

    for (const row of members ?? []) {
      const g = row.judge_groups as
        | Pick<JudgeGroup, "id" | "name" | "color_key" | "display_order">
        | Pick<JudgeGroup, "id" | "name" | "color_key" | "display_order">[]
        | null;
      const group = Array.isArray(g) ? g[0] : g;
      if (group) membershipByJudge.set(row.judge_id, group);
    }

    const { data: assignments, error: assignError } = await supabase
      .from(TABLES.judgingAssignments)
      .select("group_id, teams(id, team_number, project_title)")
      .eq("event_id", event.id);
    if (assignError) throw new Error(assignError.message);

    for (const row of assignments ?? []) {
      const team = (
        Array.isArray(row.teams) ? row.teams[0] : row.teams
      ) as GroupTeamSummary | null;
      if (!team?.id) continue;
      const list = teamsByGroup[row.group_id] ?? [];
      if (!list.some((t) => t.id === team.id)) {
        list.push({
          id: team.id,
          team_number: team.team_number,
          project_title: team.project_title,
        });
      }
      teamsByGroup[row.group_id] = list;
    }

    for (const gid of Object.keys(teamsByGroup)) {
      teamsByGroup[gid]!.sort((a, b) =>
        a.team_number.localeCompare(b.team_number, undefined, {
          numeric: true,
        }),
      );
    }
  }

  const judges: JudgeRow[] = ((judgesData ?? []) as JudgeRow[]).map((j) => ({
    ...j,
    group: membershipByJudge.get(j.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      {lockedEvent ? (
        <OpsEventEmpty lockedEvent={lockedEvent} hasAnyEvent />
      ) : !event ? (
        <OpsEventEmpty hasAnyEvent={events.length > 0} />
      ) : null}
      <JudgesManager
        eventId={event?.id ?? null}
        judges={judges}
        groups={groups}
        teamsByGroup={teamsByGroup}
        focusJudgeId={focus?.trim() || null}
      />
    </div>
  );
}
