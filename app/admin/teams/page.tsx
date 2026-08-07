import { OpsEventEmpty } from "@/components/admin/ops-event-empty";
import {
  TeamsManager,
  type TeamListRow,
} from "@/components/admin/teams-manager";
import { resolveOperationalEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";
import { TABLES } from "@/lib/supabase/tables";
import type { JudgeGroup, Team, TeamMember } from "@/types/database";

type PageProps = {
  searchParams: Promise<{ eventId?: string }>;
};

type GroupPick = Pick<JudgeGroup, "id" | "name" | "color_key">;

function normalizeTeam(row: Record<string, unknown>): Team & {
  team_members: TeamMember[];
} {
  const base = row as unknown as Team & { team_members?: TeamMember[] };
  return {
    ...base,
    team_name: typeof base.team_name === "string" ? base.team_name : "",
    team_members: (base.team_members ?? []).map((m) => ({
      ...m,
      student_id:
        typeof (m as TeamMember).student_id === "string"
          ? (m as TeamMember).student_id
          : "",
      role:
        typeof (m as TeamMember).role === "string" && (m as TeamMember).role
          ? (m as TeamMember).role
          : "Member",
    })),
  };
}

export default async function TeamsPage({ searchParams }: PageProps) {
  const { eventId } = await searchParams;
  const { supabase } = await requireAdminClient();
  const { event, events, lockedEvent } = await resolveOperationalEvent(
    supabase,
    eventId,
  );

  let teams: TeamListRow[] = [];
  let groups: JudgeGroup[] = [];

  if (event) {
    const [
      { data: teamsData, error: teamsError },
      { data: groupsData },
      { data: assignments },
      { data: evaluations },
    ] = await Promise.all([
      supabase
        .from(TABLES.teams)
        .select("*, team_members(*)")
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
      supabase
        .from(TABLES.evaluations)
        .select("team_id, status, judge_id")
        .eq("event_id", event.id),
    ]);

    if (teamsError) throw new Error(teamsError.message);
    groups = (groupsData ?? []) as JudgeGroup[];

    const groupsByTeam = new Map<string, GroupPick[]>();
    for (const row of assignments ?? []) {
      const g = row.judge_groups as GroupPick | GroupPick[] | null;
      const group = Array.isArray(g) ? g[0] : g;
      if (!group) continue;
      const list = groupsByTeam.get(row.team_id) ?? [];
      list.push(group);
      groupsByTeam.set(row.team_id, list);
    }

    const judgesByGroup = new Map<string, Set<string>>();
    const { data: memberships } = await supabase
      .from(TABLES.judgeGroupMembers)
      .select("group_id, judge_id")
      .eq("event_id", event.id);
    for (const m of memberships ?? []) {
      const set = judgesByGroup.get(m.group_id) ?? new Set<string>();
      set.add(m.judge_id);
      judgesByGroup.set(m.group_id, set);
    }

    const submittedByTeam = new Map<string, number>();
    for (const e of evaluations ?? []) {
      if (e.status !== "submitted") continue;
      submittedByTeam.set(e.team_id, (submittedByTeam.get(e.team_id) ?? 0) + 1);
    }

    teams = ((teamsData ?? []) as Record<string, unknown>[]).map((row) => {
      const team = normalizeTeam(row);
      const teamGroups = groupsByTeam.get(team.id) ?? [];
      const expectedJudges = new Set<string>();
      for (const g of teamGroups) {
        for (const jid of judgesByGroup.get(g.id) ?? []) {
          expectedJudges.add(jid);
        }
      }
      return {
        ...team,
        groups: teamGroups,
        evalSubmitted: submittedByTeam.get(team.id) ?? 0,
        evalExpected: expectedJudges.size,
      };
    });
  }

  return (
    <div>
      {lockedEvent && event ? (
        <div className="mb-6">
          <OpsEventEmpty lockedEvent={lockedEvent} hasAnyEvent />
        </div>
      ) : null}
      {event ? (
        <TeamsManager eventId={event.id} teams={teams} groups={groups} />
      ) : (
        <OpsEventEmpty
          lockedEvent={lockedEvent}
          hasAnyEvent={events.length > 0}
        />
      )}
    </div>
  );
}
