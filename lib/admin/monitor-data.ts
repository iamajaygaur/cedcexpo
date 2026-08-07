import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";
import type {
  Evaluation,
  Event,
  Judge,
  JudgeGroup,
  Profile,
  Team,
} from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type MonitorGroupProgress = {
  group: JudgeGroup;
  judgeCount: number;
  teamCount: number;
  expected: number;
  submitted: number;
  draft: number;
  percent: number;
};

export type MonitorTeamRow = {
  team: Team;
  /** Up to two color groups evaluating this team. */
  groups: JudgeGroup[];
  expected: number;
  submitted: number;
  draft: number;
  percent: number;
};

export type MonitorJudgeRow = {
  judge: Judge;
  profile: Pick<Profile, "full_name" | "email"> | null;
  group: JudgeGroup | null;
  expected: number;
  submitted: number;
  draft: number;
  percent: number;
};

export type MonitorSnapshot = {
  event: Event;
  overall: {
    expected: number;
    submitted: number;
    draft: number;
    pending: number;
    percent: number;
    teamCount: number;
    judgeCount: number;
    groupCount: number;
  };
  groups: MonitorGroupProgress[];
  teams: MonitorTeamRow[];
  judges: MonitorJudgeRow[];
};

function pct(submitted: number, expected: number) {
  if (expected <= 0) return 0;
  return Math.round((submitted / expected) * 100);
}

export async function loadMonitorSnapshot(
  supabase: Supabase,
  eventId: string,
): Promise<MonitorSnapshot | null> {
  const { data: event, error: eventError } = await supabase
    .from(TABLES.events)
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!event) return null;

  const [
    { data: groups, error: groupsError },
    { data: teams, error: teamsError },
    { data: members, error: membersError },
    { data: assignments, error: assignError },
    { data: evaluations, error: evalError },
    { data: judges, error: judgesError },
  ] = await Promise.all([
    supabase
      .from(TABLES.judgeGroups)
      .select("*")
      .eq("event_id", eventId)
      .order("display_order"),
    supabase
      .from(TABLES.teams)
      .select("*")
      .eq("event_id", eventId)
      .order("team_number"),
    supabase
      .from(TABLES.judgeGroupMembers)
      .select("judge_id, group_id")
      .eq("event_id", eventId),
    supabase
      .from(TABLES.judgingAssignments)
      .select("team_id, group_id")
      .eq("event_id", eventId),
    supabase
      .from(TABLES.evaluations)
      .select("id, judge_id, team_id, status, assignment_id")
      .eq("event_id", eventId),
    supabase
      .from(TABLES.judges)
      .select("*, profiles(full_name, email)")
      .eq("active", true),
  ]);

  if (groupsError || teamsError || membersError || assignError || evalError || judgesError) {
    const first =
      groupsError ??
      teamsError ??
      membersError ??
      assignError ??
      evalError ??
      judgesError;
    throw new Error(first?.message ?? "Failed to load monitor data");
  }

  const groupList = (groups ?? []) as JudgeGroup[];
  const teamList = (teams ?? []) as Team[];
  const memberList = members ?? [];
  const assignmentList = assignments ?? [];
  const evalList = (evaluations ?? []) as Pick<
    Evaluation,
    "id" | "judge_id" | "team_id" | "status" | "assignment_id"
  >[];

  type JudgeWithProfile = Judge & {
    profiles: Pick<Profile, "full_name" | "email"> | null;
  };
  const judgeList = (judges ?? []) as JudgeWithProfile[];
  const activeJudgeIds = new Set(judgeList.map((j) => j.id));

  const judgesByGroup = new Map<string, string[]>();
  const groupByJudge = new Map<string, string>();
  for (const m of memberList) {
    // Only active judges count toward required evals / Active Judges.
    if (!activeJudgeIds.has(m.judge_id)) continue;
    const list = judgesByGroup.get(m.group_id) ?? [];
    list.push(m.judge_id);
    judgesByGroup.set(m.group_id, list);
    groupByJudge.set(m.judge_id, m.group_id);
  }

  const teamsByGroup = new Map<string, string[]>();
  const groupsByTeam = new Map<string, string[]>();
  for (const a of assignmentList) {
    const list = teamsByGroup.get(a.group_id) ?? [];
    list.push(a.team_id);
    teamsByGroup.set(a.group_id, list);
    const gids = groupsByTeam.get(a.team_id) ?? [];
    gids.push(a.group_id);
    groupsByTeam.set(a.team_id, gids);
  }

  const groupMap = new Map(groupList.map((g) => [g.id, g]));

  const submittedEvals = evalList.filter((e) => e.status === "submitted");
  const draftEvals = evalList.filter((e) => e.status === "draft");

  const groupProgress: MonitorGroupProgress[] = groupList.map((group) => {
    const judgeIds = judgesByGroup.get(group.id) ?? [];
    const teamIds = teamsByGroup.get(group.id) ?? [];
    const expected = judgeIds.length * teamIds.length;
    const submitted = submittedEvals.filter(
      (e) =>
        judgeIds.includes(e.judge_id) && teamIds.includes(e.team_id),
    ).length;
    const draft = draftEvals.filter(
      (e) =>
        judgeIds.includes(e.judge_id) && teamIds.includes(e.team_id),
    ).length;
    return {
      group,
      judgeCount: judgeIds.length,
      teamCount: teamIds.length,
      expected,
      submitted,
      draft,
      percent: pct(submitted, expected),
    };
  });

  const teamRows: MonitorTeamRow[] = teamList.map((team) => {
    const gids = groupsByTeam.get(team.id) ?? [];
    const groups = gids
      .map((gid) => groupMap.get(gid))
      .filter((g): g is JudgeGroup => Boolean(g));
    // Expected = all active judges across both assigned groups
    const expectedJudgeIds = new Set<string>();
    for (const gid of gids) {
      for (const jid of judgesByGroup.get(gid) ?? []) {
        expectedJudgeIds.add(jid);
      }
    }
    const expected = expectedJudgeIds.size;
    const submitted = submittedEvals.filter((e) => e.team_id === team.id)
      .length;
    const draft = draftEvals.filter((e) => e.team_id === team.id).length;
    return {
      team,
      groups,
      expected,
      submitted,
      draft,
      percent: pct(submitted, expected),
    };
  });

  const assignedActiveJudgeIds = new Set(groupByJudge.keys());
  const judgeRows: MonitorJudgeRow[] = judgeList
    .filter((j) => assignedActiveJudgeIds.has(j.id))
    .map((judge) => {
      const gid = groupByJudge.get(judge.id);
      const group = gid ? (groupMap.get(gid) ?? null) : null;
      const teamIds = gid ? (teamsByGroup.get(gid) ?? []) : [];
      const expected = teamIds.length;
      const submitted = submittedEvals.filter((e) => e.judge_id === judge.id)
        .length;
      const draft = draftEvals.filter((e) => e.judge_id === judge.id).length;
      return {
        judge,
        profile: judge.profiles,
        group,
        expected,
        submitted,
        draft,
        percent: pct(submitted, expected),
      };
    });

  // Expected = sum over groups of (active judges in group × teams assigned to group)
  const overallExpected = groupProgress.reduce((s, g) => s + g.expected, 0);
  // Completed = submitted evaluations that belong to an assigned group pair
  const overallSubmitted = groupProgress.reduce((s, g) => s + g.submitted, 0);
  const overallDraft = groupProgress.reduce((s, g) => s + g.draft, 0);
  // Remaining = not yet submitted (includes drafts still in progress)
  const overallPending = Math.max(0, overallExpected - overallSubmitted);

  return {
    event: event as Event,
    overall: {
      expected: overallExpected,
      submitted: overallSubmitted,
      draft: overallDraft,
      pending: overallPending,
      percent: pct(overallSubmitted, overallExpected),
      teamCount: teamList.length,
      judgeCount: assignedActiveJudgeIds.size,
      groupCount: groupList.length,
    },
    groups: groupProgress,
    teams: teamRows,
    judges: judgeRows,
  };
}
