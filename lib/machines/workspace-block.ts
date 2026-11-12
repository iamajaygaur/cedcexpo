import type { JudgeWorkspaceBlockReason } from "@/lib/judge/context";

/**
 * Priority order for judge workspace gating. First matching reason wins.
 * `null` means the workspace is ready.
 */
export const WORKSPACE_BLOCK_PRIORITY: JudgeWorkspaceBlockReason[] = [
  "not_signed_in",
  "no_judge_profile",
  "no_event",
  "event_ended",
  "no_group",
  "no_team_assignments",
];

export function resolveWorkspaceBlock(
  flags: Partial<Record<Exclude<JudgeWorkspaceBlockReason, null>, boolean>>,
): JudgeWorkspaceBlockReason {
  for (const reason of WORKSPACE_BLOCK_PRIORITY) {
    if (reason && flags[reason]) return reason;
  }
  return null;
}

export function isWorkspaceReady(
  blockReason: JudgeWorkspaceBlockReason,
): boolean {
  return blockReason === null;
}

export function isJudgingBlocked(
  blockReason: JudgeWorkspaceBlockReason,
): boolean {
  return (
    blockReason === "event_ended" ||
    blockReason === "not_signed_in" ||
    blockReason === "no_judge_profile"
  );
}
