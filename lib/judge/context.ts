import "server-only";

import { createClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";
import type {
  Evaluation,
  Event,
  Judge,
  JudgeGroup,
  Team,
  TeamMember,
} from "@/types/database";

export type EvalStatus = "not_started" | "in_progress" | "submitted";

export type AssignedProject = {
  team: Team;
  members: TeamMember[];
  evaluation: Evaluation | null;
  status: EvalStatus;
  assignmentId: string;
};

export type JudgeWorkspaceBlockReason =
  | "not_signed_in"
  | "no_judge_profile"
  | "no_event"
  | "event_ended"
  | "no_group"
  | "no_team_assignments"
  | null;

export type JudgeWorkspace = {
  judge: Judge | null;
  event: Event | null;
  group: JudgeGroup | null;
  projects: AssignedProject[];
  stats: {
    total: number;
    completed: number;
    remaining: number;
  };
  blockReason: JudgeWorkspaceBlockReason;
  /** True when an admin is previewing another judge's queue. */
  isAdminPreview: boolean;
};

function emptyWorkspace(
  partial: Partial<JudgeWorkspace> = {},
): JudgeWorkspace {
  return {
    judge: null,
    event: null,
    group: null,
    projects: [],
    stats: { total: 0, completed: 0, remaining: 0 },
    blockReason: null,
    isAdminPreview: false,
    ...partial,
  };
}

function deriveEvalStatus(evaluation: Evaluation | null): EvalStatus {
  if (!evaluation) return "not_started";
  if (evaluation.status === "submitted") return "submitted";
  return "in_progress";
}

type WorkspaceOptions = {
  /** Admin-only: load another judge's assigned queue. */
  previewJudgeId?: string | null;
};

export type { WorkspaceOptions };

export async function getJudgeWorkspace(
  options: WorkspaceOptions = {},
): Promise<JudgeWorkspace> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return emptyWorkspace({ blockReason: "not_signed_in" });
  }

  const { data: profile } = await supabase
    .from(TABLES.profiles)
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  let isAdminPreview = false;
  let judge: Judge | null = null;

  if (isAdmin && options.previewJudgeId) {
    const { data: previewJudge, error } = await supabase
      .from(TABLES.judges)
      .select("*")
      .eq("id", options.previewJudgeId)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    judge = (previewJudge as Judge | null) ?? null;
    isAdminPreview = Boolean(judge);
  }

  if (!judge) {
    const { data: ownJudge, error: judgeError } = await supabase
      .from(TABLES.judges)
      .select("*")
      .eq("profile_id", user.id)
      .eq("active", true)
      .maybeSingle();
    if (judgeError) throw new Error(judgeError.message);
    judge = (ownJudge as Judge | null) ?? null;
  }

  if (!judge) {
    return emptyWorkspace({
      blockReason: "no_judge_profile",
      isAdminPreview: false,
    });
  }

  // Resolve event from this judge's group memberships first (avoids picking
  // the wrong event when multiple draft/active events exist).
  const { data: memberships, error: memberError } = await supabase
    .from(TABLES.judgeGroupMembers)
    .select("event_id, group_id, judge_groups(*), events:event_id(*)")
    .eq("judge_id", judge.id);

  if (memberError) throw new Error(memberError.message);

  type MembershipRow = {
    event_id: string;
    group_id: string;
    judge_groups: JudgeGroup | JudgeGroup[] | null;
    events: Event | Event[] | null;
  };

  const rows = (memberships ?? []) as MembershipRow[];

  const normalized = rows
    .map((row) => {
      const group = Array.isArray(row.judge_groups)
        ? row.judge_groups[0]
        : row.judge_groups;
      const event = Array.isArray(row.events) ? row.events[0] : row.events;
      if (!group || !event) return null;
      return { group, event };
    })
    .filter((r): r is { group: JudgeGroup; event: Event } => r !== null);

  const activeMemberships = normalized.filter(
    (r) => r.event.status === "active",
  );
  const endedMemberships = normalized.filter(
    (r) =>
      r.event.status === "completed" || r.event.status === "archived",
  );

  let event: Event | null = null;
  let group: JudgeGroup | null = null;

  if (activeMemberships.length > 0) {
    const preferred = activeMemberships[0];
    event = preferred.event;
    group = preferred.group;
  } else if (endedMemberships.length > 0) {
    const ended = endedMemberships[0];
    return emptyWorkspace({
      judge,
      event: ended.event,
      group: ended.group,
      blockReason: "event_ended",
      isAdminPreview,
    });
  } else {
    // No group yet — still surface an active/draft event for messaging.
    const { data: events, error: eventsError } = await supabase
      .from(TABLES.events)
      .select("*")
      .in("status", ["active", "draft"])
      .order("event_date", { ascending: false, nullsFirst: false })
      .limit(5);
    if (eventsError) throw new Error(eventsError.message);
    const eventList = (events ?? []) as Event[];
    event =
      eventList.find((e) => e.status === "active") ?? eventList[0] ?? null;
  }

  if (!event) {
    return emptyWorkspace({
      judge,
      event: null,
      group: null,
      blockReason: "no_event",
      isAdminPreview,
    });
  }

  if (event.status !== "active") {
    return emptyWorkspace({
      judge,
      event,
      group,
      blockReason: "event_ended",
      isAdminPreview,
    });
  }

  if (!group) {
    return emptyWorkspace({
      judge,
      event,
      group: null,
      blockReason: "no_group",
      isAdminPreview,
    });
  }

  const { data: assignments, error: assignError } = await supabase
    .from(TABLES.judgingAssignments)
    .select("id, team_id, teams(*, team_members(*))")
    .eq("event_id", event.id)
    .eq("group_id", group.id)
    .order("team_id");

  if (assignError) throw new Error(assignError.message);

  const teamIds = (assignments ?? []).map((a) => a.team_id);

  let evaluations: Evaluation[] = [];
  if (teamIds.length > 0) {
    const { data: evalData, error: evalError } = await supabase
      .from(TABLES.evaluations)
      .select("*")
      .eq("event_id", event.id)
      .eq("judge_id", judge.id)
      .in("team_id", teamIds);
    if (evalError) throw new Error(evalError.message);
    evaluations = (evalData ?? []) as Evaluation[];
  }

  const evalByTeam = new Map(evaluations.map((e) => [e.team_id, e]));

  const projects: AssignedProject[] = (assignments ?? [])
    .map((a) => {
      const teamRaw = a.teams as
        | (Team & { team_members: TeamMember[] })
        | (Team & { team_members: TeamMember[] })[]
        | null;
      const teamRow = Array.isArray(teamRaw) ? teamRaw[0] : teamRaw;
      if (!teamRow) return null;

      const { team_members, ...team } = teamRow;
      const evaluation = evalByTeam.get(team.id) ?? null;

      return {
        team: team as Team,
        members: (team_members ?? []) as TeamMember[],
        evaluation,
        status: deriveEvalStatus(evaluation),
        assignmentId: a.id,
      };
    })
    .filter((p): p is AssignedProject => p !== null)
    .sort((a, b) =>
      a.team.team_number.localeCompare(b.team.team_number, undefined, {
        numeric: true,
      }),
    );

  const completed = projects.filter((p) => p.status === "submitted").length;

  return {
    judge,
    event,
    group,
    projects,
    stats: {
      total: projects.length,
      completed,
      remaining: projects.length - completed,
    },
    blockReason: projects.length === 0 ? "no_team_assignments" : null,
    isAdminPreview,
  };
}

export async function getJudgeTeamAccess(
  teamId: string,
  options: WorkspaceOptions = {},
) {
  const workspace = await getJudgeWorkspace(options);
  const project = workspace.projects.find((p) => p.team.id === teamId);

  if (
    !workspace.judge ||
    !workspace.event ||
    !project ||
    workspace.event.status !== "active" ||
    workspace.blockReason === "event_ended"
  ) {
    return { workspace, project: null, allowed: false as const };
  }

  return { workspace, project, allowed: true as const };
}

export type PreviewJudgeOption = {
  id: string;
  name: string;
  email: string;
  groupName: string | null;
};

/** Admin helper: list active judges for dashboard preview. */
export async function listJudgesForPreview(): Promise<PreviewJudgeOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLES.judges)
    .select("id, profiles(full_name, email), judge_group_members(judge_groups(name))")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const profiles = row.profiles as
      | { full_name: string; email: string }
      | { full_name: string; email: string }[]
      | null;
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    const memberships = row.judge_group_members as
      | { judge_groups: { name: string } | { name: string }[] | null }[]
      | null;
    const first = memberships?.[0];
    const g = first?.judge_groups;
    const group = Array.isArray(g) ? g[0] : g;

    return {
      id: row.id as string,
      name: profile?.full_name || "Unnamed judge",
      email: profile?.email || "",
      groupName: group?.name ?? null,
    };
  });
}
