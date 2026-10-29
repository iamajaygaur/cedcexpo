"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftRight,
  ClipboardList,
  Gavel,
  Layers,
  MoreHorizontal,
  Plus,
  Scale,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { GroupHorizBar } from "@/components/admin/group-progress-bars";
import { showAppFeedbackFromResult } from "@/components/shared/app-feedback";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  addGroupMemberAction,
  deleteAllGroupsAction,
  deleteGroupAction,
  removeGroupMemberAction,
  upsertGroupAction,
} from "@/lib/admin/actions/groups";
import { groupColorKeys, getGroupColorToken } from "@/lib/groups/color-tokens";
import { GroupBadge } from "@/components/shared/group-badge";
import type { Judge, JudgeGroup, Profile } from "@/types/database";
import { cn } from "@/lib/utils";

type MemberRow = {
  id: string;
  judge_id: string;
  is_lead: boolean;
  judges: (Judge & {
    profiles: Pick<Profile, "full_name" | "email"> | null;
  }) | null;
};

export type GroupCardData = JudgeGroup & {
  members: MemberRow[];
  teamCount: number;
  /** Live eval progress (same math as monitor Group live status). */
  expected: number;
  submitted: number;
  draft: number;
  percent: number;
};

type GroupsManagerProps = {
  eventId: string;
  groups: GroupCardData[];
  unassignedJudges: Array<
    Judge & { profiles: Pick<Profile, "full_name" | "email"> | null }
  >;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function KpiBlock({
  icon: Icon,
  label,
  value,
  hint,
  tone = "muted",
  footer,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "gold" | "teal" | "muted";
  footer?: ReactNode;
}) {
  const tones = {
    gold: "bg-[color-mix(in_srgb,var(--cu-gold)_28%,white)] text-primary",
    teal: "bg-[color-mix(in_srgb,var(--tertiary)_18%,white)] text-tertiary",
    muted: "bg-muted text-muted-foreground",
  } as const;

  return (
    <article className="dash-metric flex h-full min-w-0 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums sm:text-[1.65rem]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tones[tone],
          )}
          aria-hidden
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
      </div>
      {hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
      {footer}
    </article>
  );
}

function PanelOverflowMenu({
  groupName,
  onDelete,
}: {
  groupName: string;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="ui-interactive-quiet inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`More actions for ${groupName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-full right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/8"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Delete group
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function GroupsManager({
  eventId,
  groups,
  unassignedJudges,
}: GroupsManagerProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [createOpen, setCreateOpen] = useState(false);
  const [manageGroup, setManageGroup] = useState<GroupCardData | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<GroupCardData | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const usedColorKeys = new Set(
    groups.map((g) => getGroupColorToken(g.color_key).key),
  );
  const availableColorKeys = groupColorKeys.filter(
    (key) => !usedColorKeys.has(key),
  );
  const usedOrders = new Set(
    groups.map((g) => Math.max(1, g.display_order || 1)),
  );
  const availableOrders = Array.from(
    { length: groupColorKeys.length },
    (_, i) => i + 1,
  ).filter((n) => !usedOrders.has(n));

  const sortedGroups = useMemo(
    () =>
      [...groups].sort(
        (a, b) =>
          Math.max(1, a.display_order || 1) -
          Math.max(1, b.display_order || 1),
      ),
    [groups],
  );

  const stats = useMemo(() => {
    const panelCount = sortedGroups.length;
    const judgeCount = sortedGroups.reduce(
      (sum, g) => sum + g.members.length,
      0,
    );
    const teamTotal = sortedGroups.reduce((sum, g) => sum + g.teamCount, 0);
    const avg = panelCount > 0 ? teamTotal / panelCount : 0;
    const teamCounts = sortedGroups.map((g) => g.teamCount);
    const maxTeams = Math.max(1, ...teamCounts, 1);
    const minTeams = teamCounts.length ? Math.min(...teamCounts) : 0;
    let heaviestName = "—";
    let heaviestCount = -1;
    let heaviestHex: string | null = null;
    for (const g of sortedGroups) {
      if (g.teamCount > heaviestCount) {
        heaviestCount = g.teamCount;
        heaviestName = g.name;
        heaviestHex = getGroupColorToken(g.color_key).hex;
      }
    }
    const judgesPerPanel =
      panelCount > 0 ? Math.round((judgeCount / panelCount) * 10) / 10 : 0;
    return {
      panelCount,
      judgeCount,
      teamTotal,
      avg,
      maxTeams,
      minTeams,
      heaviestName,
      heaviestHex,
      judgesPerPanel,
      fillVsCap:
        panelCount > 0 && maxTeams > 0
          ? Math.min(100, Math.round((avg / maxTeams) * 100))
          : 0,
    };
  }, [sortedGroups]);

  const avgLabel =
    stats.panelCount === 0
      ? "0"
      : Number.isInteger(stats.avg)
        ? String(stats.avg)
        : stats.avg.toFixed(1);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Groups" }]}
        title="Judge Groups"
        description="Organize judging panels and assign evaluating teams."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="order-2 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:order-1"
              disabled={groups.length === 0}
              onClick={() => setDeleteAllOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete All Groups
            </Button>
            <Button
              type="button"
              size="lg"
              className="order-1 gap-2 bg-foreground text-background hover:bg-foreground/90 sm:order-2"
              disabled={availableColorKeys.length === 0}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Create Judge Group
            </Button>
          </div>
        }
      />

      {/* KPI cards — one block per metric */}
      <section
        aria-label="Group workload summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <KpiBlock
          icon={Layers}
          label="Panels"
          value={stats.panelCount}
          hint={
            stats.panelCount === 0
              ? "No color groups yet"
              : `${availableColorKeys.length} color${availableColorKeys.length === 1 ? "" : "s"} still free`
          }
          tone="gold"
          footer={
            <div className="mt-2.5 flex items-center gap-1.5" aria-hidden>
              {sortedGroups.length === 0 ? (
                <span className="h-2 w-full rounded-full bg-muted" />
              ) : (
                sortedGroups.map((g) => {
                  const hex = getGroupColorToken(g.color_key).hex;
                  return (
                    <span
                      key={g.id}
                      className="h-2 flex-1 rounded-full"
                      style={{ background: hex }}
                      title={g.name}
                    />
                  );
                })
              )}
            </div>
          }
        />
        <KpiBlock
          icon={Gavel}
          label="Judges"
          value={stats.judgeCount}
          hint={
            stats.panelCount === 0
              ? "Assign judges to panels"
              : `~${stats.judgesPerPanel} per panel`
          }
          tone="muted"
          footer={
            <p className="mt-2 text-[11px] text-muted-foreground">
              {unassignedJudges.length > 0 ? (
                <>
                  <span className="font-semibold text-foreground">
                    {unassignedJudges.length}
                  </span>{" "}
                  unassigned
                </>
              ) : (
                "All active judges placed"
              )}
            </p>
          }
        />
        <KpiBlock
          icon={ClipboardList}
          label="Teams assigned"
          value={stats.teamTotal}
          hint="Across all panels"
          tone="teal"
          footer={
            <div className="mt-2.5">
              <div className="mb-1 flex justify-between text-[10px] font-medium text-muted-foreground">
                <span>Coverage</span>
                <span className="tabular-nums">{stats.teamTotal}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-tertiary transition-[width] duration-500"
                  style={{
                    width: `${stats.panelCount === 0 ? 0 : Math.min(100, (stats.teamTotal / Math.max(stats.panelCount * stats.maxTeams, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          }
        />
        <KpiBlock
          icon={Scale}
          label="Avg teams / panel"
          value={avgLabel}
          hint="Black tick target on cards"
          tone="gold"
          footer={
            <div className="mt-2.5">
              <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${stats.fillVsCap}%` }}
                />
                <span
                  className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-sm bg-foreground"
                  style={{ left: `${stats.fillVsCap}%` }}
                  aria-hidden
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                vs heaviest panel ({stats.maxTeams})
              </p>
            </div>
          }
        />
        <KpiBlock
          icon={ArrowLeftRight}
          label="Team range"
          value={
            stats.panelCount === 0
              ? "—"
              : `${stats.minTeams}–${stats.maxTeams}`
          }
          hint={
            stats.panelCount === 0
              ? "No assignments yet"
              : `${stats.heaviestName} is heaviest`
          }
          tone="muted"
          footer={
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full ring-2 ring-white"
                style={{
                  background: stats.heaviestHex ?? "var(--muted-foreground)",
                }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="h-full bg-muted-foreground/25"
                    style={{
                      width:
                        stats.maxTeams > 0
                          ? `${(stats.minTeams / stats.maxTeams) * 100}%`
                          : "0%",
                    }}
                  />
                  <span
                    className="h-full rounded-r-full"
                    style={{
                      width:
                        stats.maxTeams > 0
                          ? `${((stats.maxTeams - stats.minTeams) / stats.maxTeams) * 100}%`
                          : "0%",
                      background: stats.heaviestHex ?? "var(--primary)",
                    }}
                  />
                </div>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                  Spread {stats.maxTeams - stats.minTeams} teams
                </p>
              </div>
            </div>
          }
        />
      </section>

      {groups.length === 0 ? (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={availableColorKeys.length === 0}
          className="ui-interactive flex min-h-[12.5rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-card/40 px-6 py-10 text-center disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none disabled:hover:border-slate-300 disabled:hover:bg-card/40 disabled:hover:shadow-none"
        >
          <span className="text-base font-semibold text-tertiary">
            + New panel
          </span>
          <span className="max-w-xs text-sm text-muted-foreground">
            Create your first color group to start organizing judges and teams.
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4">
          {sortedGroups.map((group, index) => {
            const token = getGroupColorToken(group.color_key);
            const panelNumber = Math.max(1, group.display_order || 1);
            const remaining = Math.max(0, group.expected - group.submitted);
            const done =
              group.expected > 0 && group.submitted >= group.expected;

            return (
              <motion.article
                key={group.id}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : {
                        delay: index * 0.05,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }
                }
                className="dash-group-card flex flex-col gap-3 p-4 sm:p-5"
                style={
                  {
                    "--group-tint": token.hex,
                  } as CSSProperties
                }
              >
                <div className="flex items-start gap-3">
                  <span className="dash-group-card__icon shrink-0" aria-hidden>
                    <Users className="size-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                          {group.name} · Panel #{panelNumber}
                        </p>
                        <GroupBadge
                          colorKey={group.color_key}
                          name={token.label}
                          size="sm"
                        />
                      </div>
                      <PanelOverflowMenu
                        groupName={group.name}
                        onDelete={() => setDeleteGroup(group)}
                      />
                    </div>
                    <p className="mt-0.5 text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl">
                      {group.percent}
                      <span className="text-lg font-semibold text-muted-foreground sm:text-xl">
                        %
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                      {group.members.length} judge
                      {group.members.length === 1 ? "" : "s"}
                      <span className="mx-1 text-border" aria-hidden>
                        ·
                      </span>
                      {group.teamCount} team
                      {group.teamCount === 1 ? "" : "s"}
                      <span className="mx-1 text-border" aria-hidden>
                        ·
                      </span>
                      {done ? "Complete" : "Active"}
                      {group.draft > 0
                        ? ` · ${group.draft} draft${group.draft === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div
                  className="dash-group-card__bar-track"
                  role="progressbar"
                  aria-valuenow={group.submitted}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(1, group.expected)}
                  aria-label={`${group.name} progress`}
                >
                  <motion.div
                    className="dash-group-card__bar-fill"
                    initial={reducedMotion ? false : { width: 0 }}
                    animate={{ width: `${Math.min(100, group.percent)}%` }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : {
                            duration: 0.7,
                            ease: [0.16, 1, 0.3, 1],
                            delay: 0.1 + index * 0.04,
                          }
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <GroupHorizBar
                    label="Submitted"
                    value={group.submitted}
                    max={Math.max(1, group.expected)}
                    color={token.hex}
                  />
                  <GroupHorizBar
                    label="In progress"
                    value={group.draft}
                    max={Math.max(1, group.expected)}
                    color="var(--status-partial)"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {group.submitted}
                    </span>
                    /{group.expected} evals
                  </span>
                  <span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        remaining > 0 ? "text-foreground" : "text-tertiary",
                      )}
                    >
                      {remaining}
                    </span>{" "}
                    remaining
                  </span>
                </div>

                <div className="mt-auto flex gap-2 border-t border-border/50 pt-3">
                  <Button
                    type="button"
                    size="lg"
                    className="h-11 flex-1 bg-foreground text-background hover:bg-foreground/90"
                    onClick={() => setManageGroup(group)}
                  >
                    Manage judges
                  </Button>
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 flex-1 border-gray-300 bg-white/70 text-gray-800 hover:bg-white"
                  >
                    <Link href={`/admin/assignments?eventId=${eventId}`}>
                      Assign teams
                    </Link>
                  </Button>
                </div>
              </motion.article>
            );
          })}

          {availableColorKeys.length > 0 ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="ui-interactive flex min-h-[12.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-transparent px-6 py-10 text-base font-semibold text-tertiary hover:border-tertiary/55 hover:bg-tertiary/5"
            >
              + New panel
            </button>
          ) : null}
        </div>
      )}

      {groups.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Progress matches Live Monitor: submitted evaluations out of judges ×
          assigned teams for each panel.
        </p>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Judge Group</DialogTitle>
            <DialogDescription>
              Add a color-coded judging panel for this expo.
            </DialogDescription>
          </DialogHeader>

          {groups.length > 0 ? (
            <div className="dash-panel bg-muted/40 px-3 py-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Already created
              </p>
              <div className="flex flex-wrap gap-2">
                {[...groups]
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((group) => (
                    <GroupBadge
                      key={group.id}
                      colorKey={group.color_key}
                      name={`${group.name} · #${Math.max(1, group.display_order || 1)}`}
                    />
                  ))}
              </div>
            </div>
          ) : null}

          <AdminActionForm
            action={upsertGroupAction}
            onSuccess={() => {
              setCreateOpen(false);
              router.refresh();
            }}
            className="space-y-4"
          >
            <input type="hidden" name="event_id" value={eventId} />
            <div className="space-y-1.5">
              <Label htmlFor="group-color">Color</Label>
              <Select
                id="group-color"
                name="color_key"
                defaultValue=""
                placeholder="Select color"
                className="h-10 rounded-md"
                required
              >
                {availableColorKeys.map((key) => (
                  <option key={key} value={key}>
                    {getGroupColorToken(key).label}
                  </option>
                ))}
              </Select>
              {availableColorKeys.length > 0 ? (
                <ul className="flex flex-wrap gap-2 pt-1" aria-hidden>
                  {availableColorKeys.map((key) => {
                    const t = getGroupColorToken(key);
                    return (
                      <li
                        key={key}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[10px] font-semibold text-foreground"
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: t.hex }}
                        />
                        {t.label}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {availableColorKeys.length === 0
                  ? "All colors are in use."
                  : "Group name is set automatically from the color (e.g. Red, Blue)."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-order">Display order</Label>
              <Select
                id="group-order"
                name="display_order"
                defaultValue=""
                placeholder="Select order"
                className="h-10 rounded-md"
                required
              >
                {(availableOrders.length > 0
                  ? availableOrders
                  : Array.from(
                      { length: groupColorKeys.length },
                      (_, i) => i + 1,
                    )
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={availableColorKeys.length === 0}
              >
                Create Group
              </Button>
            </div>
          </AdminActionForm>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(manageGroup)}
        onOpenChange={(open) => {
          if (!open) setManageGroup(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Manage Judges{manageGroup ? ` — ${manageGroup.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Add or remove judges for this color group.
            </DialogDescription>
          </DialogHeader>

          {manageGroup ? (
            <div className="space-y-4">
              <AdminActionForm
                action={upsertGroupAction}
                quietSuccess
                onSuccess={() => {
                  setManageGroup(null);
                  router.refresh();
                }}
                className="space-y-2 dash-metric p-3"
              >
                <input type="hidden" name="id" value={manageGroup.id} />
                <input type="hidden" name="event_id" value={eventId} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-group-color">Group color</Label>
                    <Select
                      id="edit-group-color"
                      name="color_key"
                      defaultValue={
                        getGroupColorToken(manageGroup.color_key).key
                      }
                      className="h-9 rounded-md"
                    >
                      {groupColorKeys
                        .filter(
                          (key) =>
                            key ===
                              getGroupColorToken(manageGroup.color_key).key ||
                            availableColorKeys.includes(key),
                        )
                        .map((key) => (
                          <option key={key} value={key}>
                            {getGroupColorToken(key).label}
                          </option>
                        ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-group-order">Display order</Label>
                    <Select
                      id="edit-group-order"
                      name="display_order"
                      defaultValue={String(
                        Math.max(1, manageGroup.display_order || 1),
                      )}
                      className="h-9 rounded-md"
                    >
                      {Array.from(
                        { length: groupColorKeys.length },
                        (_, i) => i + 1,
                      )
                        .filter(
                          (n) =>
                            n ===
                              Math.max(1, manageGroup.display_order || 1) ||
                            availableOrders.includes(n),
                        )
                        .map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Name updates automatically to match the color.
                </p>
                <Button type="submit" size="xs" className="w-full">
                  Save
                </Button>
              </AdminActionForm>

              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {manageGroup.members.length === 0 ? (
                  <li className="text-sm text-muted-foreground">
                    No judges in this group yet.
                  </li>
                ) : (
                  manageGroup.members.map((m) => {
                    const name =
                      m.judges?.profiles?.full_name?.trim() || "Judge";
                    const token = getGroupColorToken(manageGroup.color_key);
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 dash-metric px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-sm">
                          <span
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                              token.bgClass,
                              token.textClass,
                            )}
                          >
                            {initialsFromName(name)}
                          </span>
                          <span className="truncate">
                            {name}
                            {m.is_lead ? " (Lead)" : ""}
                          </span>
                        </span>
                        <AdminActionForm
                          action={removeGroupMemberAction}
                          quietSuccess
                          className="!space-y-0"
                          onSuccess={() => {
                            setManageGroup(null);
                            router.refresh();
                          }}
                        >
                          <input type="hidden" name="id" value={m.id} />
                          <Button type="submit" variant="ghost" size="xs">
                            Remove
                          </Button>
                        </AdminActionForm>
                      </li>
                    );
                  })
                )}
              </ul>

              {unassignedJudges.length > 0 ? (
                <AdminActionForm
                  action={addGroupMemberAction}
                  onSuccess={() => {
                    setManageGroup(null);
                    router.refresh();
                  }}
                  className="space-y-2"
                >
                  <input type="hidden" name="event_id" value={eventId} />
                  <input type="hidden" name="group_id" value={manageGroup.id} />
                  <Label htmlFor="add-judge">Add judge</Label>
                  <Select
                    id="add-judge"
                    name="judge_id"
                    required
                    defaultValue=""
                    className="h-10 rounded-md"
                  >
                    <option value="" disabled>
                      Select judge…
                    </option>
                    {unassignedJudges.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.profiles?.full_name ?? j.id.slice(0, 8)}
                      </option>
                    ))}
                  </Select>
                  <Button type="submit" className="w-full">
                    Add to {manageGroup.name}
                  </Button>
                </AdminActionForm>
              ) : (
                <p className="text-sm text-muted-foreground">
                  All active judges are already assigned to a group.
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all groups</DialogTitle>
            <DialogDescription>
              Permanently delete all{" "}
              <span className="font-medium text-foreground">
                {groups.length}
              </span>{" "}
              color group{groups.length === 1 ? "" : "s"} for this event,
              including memberships and team assignments. Groups with submitted
              evaluations cannot be deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <AdminActionForm
            action={deleteAllGroupsAction}
            quietSuccess
            pendingLabel="Deleting groups…"
            onSuccess={(result) => {
              setDeleteAllOpen(false);
              setManageGroup(null);
              router.refresh();
              window.setTimeout(() => {
                showAppFeedbackFromResult(true, result.message);
              }, 0);
            }}
          >
            <input type="hidden" name="event_id" value={eventId} />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteAllOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Delete all groups
              </Button>
            </div>
          </AdminActionForm>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteGroup != null}
        onOpenChange={(open) => {
          if (!open) setDeleteGroup(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteGroup?.name ?? "this group"}
              </span>
              . Judges in the group will become unassigned. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {deleteGroup ? (
            <AdminActionForm
              key={deleteGroup.id}
              action={deleteGroupAction}
              quietSuccess
              pendingLabel="Deleting group…"
              onSuccess={(result) => {
                setDeleteGroup(null);
                setManageGroup(null);
                router.refresh();
                window.setTimeout(() => {
                  showAppFeedbackFromResult(true, result.message);
                }, 0);
              }}
            >
              <input type="hidden" name="id" value={deleteGroup.id} />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteGroup(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive">
                  Delete group
                </Button>
              </div>
            </AdminActionForm>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
