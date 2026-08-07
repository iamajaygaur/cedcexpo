"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
} from "lucide-react";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { showAppFeedbackFromResult } from "@/components/shared/app-feedback";
import { GroupBadge } from "@/components/shared/group-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import {
  assignTeamToGroupAction,
  clearTeamEvaluationsAction,
} from "@/lib/admin/actions/assignments";
import type { ActionResult } from "@/lib/admin/action-result";
import { MAX_ASSIGNED_GROUPS_PER_TEAM } from "@/lib/groups/assignment-limits";
import { cn } from "@/lib/utils";
import type { JudgeGroup, Team } from "@/types/database";

type GroupPick = Pick<JudgeGroup, "id" | "name" | "color_key">;

type AssignmentRow = {
  team: Team;
  groups: GroupPick[];
};

type AssignmentsManagerProps = {
  eventId: string;
  rows: AssignmentRow[];
  groups: JudgeGroup[];
};

const PAGE_SIZE = 15;
const NONE = "";

function statusMeta(count: number) {
  if (count >= MAX_ASSIGNED_GROUPS_PER_TEAM) {
    return {
      label: "Fully Assigned",
      tone: "complete" as const,
      Icon: CheckCircle2,
    };
  }
  if (count === 1) {
    return {
      label: "1/2 Assigned",
      tone: "partial" as const,
      Icon: TriangleAlert,
    };
  }
  return {
    label: "0/2 Assigned",
    tone: "empty" as const,
    Icon: AlertCircle,
  };
}

function statusToneClass(tone: "complete" | "partial" | "empty") {
  switch (tone) {
    case "complete":
      return "border-emerald-700/30 bg-emerald-50 text-emerald-800";
    case "partial":
      return "border-amber-700/30 bg-amber-50 text-amber-900";
    default:
      return "border-rose-700/35 bg-rose-50 text-rose-800";
  }
}

function assignSelectClass(tone: "complete" | "partial" | "empty") {
  switch (tone) {
    case "partial":
      return "border-dashed border-amber-700/60";
    case "empty":
      return "border-dashed border-rose-700/60";
    default:
      return "";
  }
}

function formatDept(category: string) {
  const trimmed = category.trim();
  return trimmed || "—";
}

async function saveTeamGroups(
  eventId: string,
  teamId: string,
  groupIds: string[],
): Promise<ActionResult> {
  const formData = new FormData();
  formData.set("event_id", eventId);
  formData.set("team_id", teamId);
  for (const id of groupIds) {
    if (id) formData.append("group_ids", id);
  }
  return assignTeamToGroupAction({ ok: true }, formData);
}

export function AssignmentsManager({
  eventId,
  rows,
  groups,
}: AssignmentsManagerProps) {
  const router = useRouter();
  const [deptFilter, setDeptFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [errorByTeam, setErrorByTeam] = useState<Record<string, string>>({});

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const c = row.team.category.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ team, groups: assigned }) => {
      if (deptFilter !== "all" && team.category !== deptFilter) return false;
      if (groupFilter === "unassigned") {
        if (assigned.length >= MAX_ASSIGNED_GROUPS_PER_TEAM) return false;
      } else if (groupFilter !== "all") {
        if (!assigned.some((g) => g.id === groupFilter)) return false;
      }
      if (q) {
        const hay = [
          team.team_number,
          team.project_title,
          team.category,
          team.booth_location ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, deptFilter, groupFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by team #, project, or department…"
              aria-label="Search assignments"
            />
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">
              Sort by:
            </span>
            <Select
              aria-label="Filter by department"
              className="h-10 w-auto min-w-[8.5rem] shrink-0 rounded-md"
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Depts</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Filter by group"
              className="h-10 w-auto min-w-[8.5rem] shrink-0 rounded-md"
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Groups</option>
              <option value="unassigned">Unassigned</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                  Team #
                </th>
                <th className="px-4 py-3 font-semibold">Team Name</th>
                <th className="px-4 py-3 font-semibold">Dept</th>
                <th className="px-4 py-3 font-semibold">Eval #1</th>
                <th className="px-4 py-3 font-semibold">Eval #2</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    {groups.length === 0
                      ? "No color groups yet. Create groups first."
                      : "No teams match this filter."}
                  </td>
                </tr>
              ) : (
                pageRows.map(({ team, groups: assigned }) => (
                  <AssignmentTableRow
                    key={team.id}
                    eventId={eventId}
                    team={team}
                    assigned={assigned}
                    groups={groups}
                    error={errorByTeam[team.id]}
                    onError={(message) =>
                      setErrorByTeam((prev) => ({
                        ...prev,
                        [team.id]: message,
                      }))
                    }
                    onClearedError={() =>
                      setErrorByTeam((prev) => {
                        const next = { ...prev };
                        delete next[team.id];
                        return next;
                      })
                    }
                    onSaved={() => router.refresh()}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {from} to {to} of {filtered.length} teams
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => {
                if (totalPages <= 5) return true;
                return (
                  n === 1 ||
                  n === totalPages ||
                  Math.abs(n - safePage) <= 1
                );
              })
              .map((n, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev != null && n - prev > 1;
                return (
                  <span key={n} className="contents">
                    {showEllipsis ? (
                      <span className="px-1 text-muted-foreground">…</span>
                    ) : null}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant={n === safePage ? "default" : "outline"}
                      onClick={() => setPage(n)}
                      aria-current={n === safePage ? "page" : undefined}
                    >
                      {n}
                    </Button>
                  </span>
                );
              })}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AssignmentTableRow({
  eventId,
  team,
  assigned,
  groups,
  error,
  onError,
  onClearedError,
  onSaved,
}: {
  eventId: string;
  team: Team;
  assigned: GroupPick[];
  groups: JudgeGroup[];
  error?: string;
  onError: (message: string) => void;
  onClearedError: () => void;
  onSaved: () => void;
}) {
  const [slot1, setSlot1] = useState(assigned[0]?.id ?? NONE);
  const [slot2, setSlot2] = useState(assigned[1]?.id ?? NONE);
  const [pending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<
    "unassign" | "clear" | null
  >(null);

  const assignedKey = assigned.map((g) => g.id).join(",");
  useEffect(() => {
    setSlot1(assigned[0]?.id ?? NONE);
    setSlot2(assigned[1]?.id ?? NONE);
  }, [assignedKey, assigned]);

  const group1 = groups.find((g) => g.id === slot1) ?? null;
  const group2 = groups.find((g) => g.id === slot2) ?? null;
  const count = [slot1, slot2].filter(Boolean).length;
  const status = statusMeta(count);
  const StatusIcon = status.Icon;

  function persist(next1: string, next2: string, showSuccess = false) {
    const ids = [next1, next2].filter(Boolean);
    startTransition(async () => {
      const result = await saveTeamGroups(eventId, team.id, ids);
      if (!result.ok) {
        onError(result.message ?? "Could not save assignment.");
        setSlot1(assigned[0]?.id ?? NONE);
        setSlot2(assigned[1]?.id ?? NONE);
        showAppFeedbackFromResult(
          false,
          result.message ?? "Could not save assignment.",
        );
        return;
      }
      onClearedError();
      onSaved();
      if (showSuccess) {
        showAppFeedbackFromResult(
          true,
          result.message ?? "Assignment updated successfully.",
        );
      }
    });
  }

  function onSlot1Change(value: string) {
    if (!value) {
      setSlot1(NONE);
      setSlot2(NONE);
      persist(NONE, NONE);
      return;
    }
    const next2 = value === slot2 ? NONE : slot2;
    setSlot1(value);
    setSlot2(next2);
    persist(value, next2);
  }

  function onSlot2Change(value: string) {
    if (value && value === slot1) return;
    setSlot2(value);
    persist(slot1, value);
  }

  return (
    <>
      <tr className="border-t border-border align-middle">
        <td className="whitespace-nowrap px-4 py-3.5">
          <span className="text-lg font-bold tracking-tight text-foreground">
            {team.team_number}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <p className="font-semibold text-foreground">
            {team.team_name?.trim() || team.project_title || "—"}
          </p>
          {team.project_description?.trim() ? (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {team.project_description.trim()}
            </p>
          ) : team.project_title?.trim() &&
            team.team_name?.trim() &&
            team.team_name.trim() !== team.project_title.trim() ? (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {team.project_title.trim()}
            </p>
          ) : null}
        </td>
        <td className="px-4 py-3.5">
          <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground">
            {formatDept(team.category)}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <InlineGroupPicker
            label="Eval #1"
            value={slot1}
            groups={groups}
            selected={group1}
            excludeId={slot2}
            tone={status.tone}
            disabled={pending || groups.length === 0}
            onChange={onSlot1Change}
          />
        </td>
        <td className="px-4 py-3.5">
          <InlineGroupPicker
            label="Eval #2"
            value={slot2}
            groups={groups}
            selected={group2}
            excludeId={slot1}
            tone={status.tone}
            disabled={pending || !slot1 || groups.length < 2}
            onChange={onSlot2Change}
          />
        </td>
        <td className="px-4 py-3.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              statusToneClass(status.tone),
            )}
          >
            <StatusIcon className="size-3.5" aria-hidden />
            {status.label}
          </span>
          {pending ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Saving…</p>
          ) : null}
        </td>
        <td className="px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {slot1 || slot2 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setConfirmAction("unassign")}
              >
                Unassign Groups
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={pending}
              onClick={() => setConfirmAction("clear")}
            >
              Clear scores
            </Button>
          </div>
        </td>
      </tr>
      {error ? (
        <tr className="border-t border-border bg-destructive/5">
          <td colSpan={6} className="px-4 py-2 text-sm text-destructive">
            {error}
          </td>
        </tr>
      ) : null}

      <Dialog
        open={confirmAction != null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {confirmAction === "unassign" ? (
            <>
              <DialogHeader>
                <DialogTitle>Unassign color groups</DialogTitle>
                <DialogDescription>
                  Remove both Eval #1 and Eval #2 color groups from{" "}
                  <span className="font-medium text-foreground">
                    Team {team.team_number}
                  </span>
                  . You can reassign groups anytime.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setConfirmAction(null);
                    setSlot1(NONE);
                    setSlot2(NONE);
                    persist(NONE, NONE, true);
                  }}
                >
                  Unassign groups
                </Button>
              </div>
            </>
          ) : null}

          {confirmAction === "clear" ? (
            <>
              <DialogHeader>
                <DialogTitle>Clear team scores</DialogTitle>
                <DialogDescription>
                  Delete submitted and draft evaluations for{" "}
                  <span className="font-medium text-foreground">
                    Team {team.team_number}
                  </span>
                  . This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <AdminActionForm
                action={clearTeamEvaluationsAction}
                quietSuccess
                pendingLabel="Clearing scores…"
                onSuccess={(result) => {
                  setConfirmAction(null);
                  onSaved();
                  window.setTimeout(() => {
                    showAppFeedbackFromResult(true, result.message);
                  }, 0);
                }}
                className="space-y-0"
              >
                <input type="hidden" name="event_id" value={eventId} />
                <input type="hidden" name="team_id" value={team.id} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmAction(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="destructive">
                    Clear scores
                  </Button>
                </div>
              </AdminActionForm>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InlineGroupPicker({
  label,
  value,
  groups,
  selected,
  excludeId,
  tone,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  groups: JudgeGroup[];
  selected: JudgeGroup | null;
  excludeId?: string;
  tone: "complete" | "partial" | "empty";
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const options = groups.filter((g) => g.id !== excludeId);

  // After assignment: color badge only (no dropdown).
  if (selected) {
    return (
      <div className="min-w-[140px]">
        <GroupBadge colorKey={selected.color_key} name={selected.name} />
      </div>
    );
  }

  return (
    <div className="min-w-[160px]">
      <Select
        aria-label={label}
        value={value}
        disabled={disabled}
        className={cn("h-9", assignSelectClass(tone))}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value={NONE}>+ Assign group</option>
        {options.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
