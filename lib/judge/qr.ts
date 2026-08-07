import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getJudgeTeamAccess } from "@/lib/judge/context";

export type QrTeamLookup = {
  team_id: string;
  event_id: string;
  team_number: string;
  project_title: string;
  booth_location: string;
  event_name: string;
  event_status: string;
  assigned_group_id: string | null;
  assigned_group_name: string | null;
  assigned_group_color_key: string | null;
};

export type QrResolveResult =
  | { status: "not_found" }
  | {
      status: "allowed";
      team: QrTeamLookup;
    }
  | {
      status: "wrong_group";
      team: QrTeamLookup;
      judgeGroupName: string | null;
      judgeGroupColorKey: string | null;
    }
  | {
      status: "unassigned";
      team: QrTeamLookup;
    }
  | {
      status: "no_judge";
      team: QrTeamLookup;
    };

/**
 * Resolve a team QR identifier.
 * The QR is a locator only — evaluation rights still require group assignment.
 */
export async function resolveTeamQr(
  qrIdentifier: string,
): Promise<QrResolveResult> {
  const trimmed = qrIdentifier.trim();
  if (!trimmed || trimmed.length > 128) {
    return { status: "not_found" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_team_by_qr", {
    p_qr: trimmed,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as QrTeamLookup[];
  const team = rows[0];
  if (!team) {
    return { status: "not_found" };
  }

  const access = await getJudgeTeamAccess(team.team_id);

  if (access.allowed) {
    return { status: "allowed", team };
  }

  if (!access.workspace.judge) {
    return { status: "no_judge", team };
  }

  if (!team.assigned_group_id) {
    return { status: "unassigned", team };
  }

  return {
    status: "wrong_group",
    team,
    judgeGroupName: access.workspace.group?.name ?? null,
    judgeGroupColorKey: access.workspace.group?.color_key ?? null,
  };
}
