"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  GripVertical,
  Pencil,
  Plus,
  QrCode,
  Save,
  Store,
  Trash2,
  Upload,
} from "lucide-react";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { TeamsImportDialog } from "@/components/admin/teams-import-dialog";
import { showAppFeedbackFromResult } from "@/components/shared/app-feedback";
import { GroupBadge } from "@/components/shared/group-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAllTeamsAction,
  deleteTeamAction,
  upsertTeamAction,
} from "@/lib/admin/actions/teams";
import { TEAM_DEPARTMENTS } from "@/lib/teams/constants";
import { cn } from "@/lib/utils";
import type { JudgeGroup, Team, TeamMember } from "@/types/database";

const DEPARTMENTS = TEAM_DEPARTMENTS;
const PAGE_SIZE = 15;
const DESC_MAX = 500;

export type TeamListRow = Team & {
  team_members: TeamMember[];
  groups: Array<Pick<JudgeGroup, "id" | "name" | "color_key">>;
  evalSubmitted: number;
  evalExpected: number;
};

type TeamsManagerProps = {
  eventId: string;
  teams: TeamListRow[];
  groups: JudgeGroup[];
};

type RosterMember = {
  key: string;
  student_name: string;
  student_id: string;
  student_email: string;
  role: string;
};

function evalStatus(submitted: number, expected: number) {
  if (expected <= 0) {
    if (submitted <= 0) return { label: "Pending", tone: "pending" as const };
    return { label: `${submitted} submitted`, tone: "partial" as const };
  }
  if (submitted <= 0) return { label: `0/${expected} Pending`, tone: "pending" as const };
  if (submitted >= expected)
    return { label: `${submitted}/${expected} Complete`, tone: "complete" as const };
  return { label: `${submitted}/${expected} Partial`, tone: "partial" as const };
}

function statusToneClass(tone: "pending" | "partial" | "complete") {
  switch (tone) {
    case "complete":
      return "bg-emerald-50 text-emerald-800";
    case "partial":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-rose-50 text-rose-800";
  }
}

function statusBarClass(tone: "pending" | "partial" | "complete") {
  switch (tone) {
    case "complete":
      return "bg-emerald-600";
    case "partial":
      return "bg-amber-500";
    default:
      return "bg-rose-400";
  }
}

function newRosterMember(overrides: Partial<RosterMember> = {}): RosterMember {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    student_name: "",
    student_id: "",
    student_email: "",
    role: "Member",
    ...overrides,
  };
}

function TeamEditorForm({
  eventId,
  team,
  onCancel,
}: {
  eventId: string;
  team?: TeamListRow | null;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(
    team?.project_description ?? "",
  );
  const [members, setMembers] = useState<RosterMember[]>(() => {
    if (team?.team_members?.length) {
      return team.team_members.map((m) =>
        newRosterMember({
          student_name: m.student_name,
          student_id: m.student_id ?? "",
          student_email: m.student_email ?? "",
          role: m.role || "Member",
        }),
      );
    }
    return [newRosterMember({ role: "Team Lead" }), newRosterMember()];
  });

  function updateMember(key: string, patch: Partial<RosterMember>) {
    setMembers((prev) =>
      prev.map((m) => (m.key === key ? { ...m, ...patch } : m)),
    );
  }

  function removeMember(key: string) {
    setMembers((prev) =>
      prev.length <= 1 ? prev : prev.filter((m) => m.key !== key),
    );
  }

  return (
    <AdminActionForm
      action={upsertTeamAction}
      onSuccess={() => {
        onCancel();
        router.refresh();
      }}
      className="space-y-0"
    >
      {team ? <input type="hidden" name="id" value={team.id} /> : null}
      <input type="hidden" name="event_id" value={eventId} />
      {members.map((m) => (
        <span key={m.key} className="contents">
          <input type="hidden" name="member_name" value={m.student_name} />
          <input type="hidden" name="member_email" value={m.student_email} />
          <input type="hidden" name="member_student_id" value={m.student_id} />
          <input type="hidden" name="member_role" value={m.role} />
        </span>
      ))}

      <PageHeader
        className="mb-6"
        breadcrumbs={[
          { label: "Teams", href: "/admin/teams" },
          { label: team ? "Edit Team" : "Add New Team" },
        ]}
        title="Add / Edit Team"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="px-5"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" size="default" className="gap-2 px-5">
              <Save className="size-4" aria-hidden />
              Save Team
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-md border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold tracking-wide text-foreground uppercase">
              Project Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="team_number" className="text-xs uppercase">
                  Team #
                </Label>
                <Input
                  id="team_number"
                  name="team_number"
                  required
                  defaultValue={team?.team_number}
                  placeholder="T-01"
                  className="h-10 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="booth_location" className="text-xs uppercase">
                  Table Number
                </Label>
                <Input
                  id="booth_location"
                  name="booth_location"
                  defaultValue={team?.booth_location}
                  placeholder="e.g. Table 12"
                  className="h-10 rounded-md"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="team_name" className="text-xs uppercase">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="team_name"
                  name="team_name"
                  defaultValue={team?.team_name || team?.project_title}
                  placeholder="Short project / team name"
                  className="h-10 rounded-md"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="project_title" className="text-xs uppercase">
                  Official Title
                </Label>
                <Input
                  id="project_title"
                  name="project_title"
                  required
                  defaultValue={team?.project_title}
                  placeholder="Full official project title"
                  className="h-10 rounded-md"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="category" className="text-xs uppercase">
                  Department
                </Label>
                <Select
                  id="category"
                  name="category"
                  defaultValue={team?.category || ""}
                  className="h-10 rounded-md"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold tracking-wide text-foreground uppercase">
              Abstract / Description
            </h2>
            <Textarea
              name="project_description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, DESC_MAX))
              }
              placeholder="Project summary for judges and public directory..."
              className="min-h-32 rounded-md"
              rows={6}
            />
            <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground">
              <span>
                {description.length} / {DESC_MAX}
              </span>
            </div>
          </section>
        </div>

        <section className="rounded-md border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
                Team Roster
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Manage students assigned to this project
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setMembers((prev) => [...prev, newRosterMember()])}
            >
              <Plus className="size-3.5" aria-hidden />
              Add Member
            </Button>
          </div>

          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.key}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <GripVertical
                    className="size-4 text-muted-foreground"
                    aria-hidden
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    aria-label="Remove member"
                    onClick={() => removeMember(member.key)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={member.student_name}
                      onChange={(e) =>
                        updateMember(member.key, {
                          student_name: e.target.value,
                        })
                      }
                      placeholder="Full Name"
                      className="h-9 rounded-md"
                    />
                    <Select
                      value={member.role}
                      onChange={(e) =>
                        updateMember(member.key, { role: e.target.value })
                      }
                      className="h-9 rounded-md"
                    >
                      <option value="Team Lead">Team Lead</option>
                      <option value="Member">Member</option>
                    </Select>
                  </div>
                  <Input
                    type="email"
                    value={member.student_email}
                    onChange={(e) =>
                      updateMember(member.key, {
                        student_email: e.target.value,
                      })
                    }
                    placeholder="Email Address"
                    className="h-9 rounded-md"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40"
            onClick={() => setMembers((prev) => [...prev, newRosterMember()])}
          >
            <Plus className="size-4" aria-hidden />
            Add Another Row
          </button>
        </section>
      </div>
    </AdminActionForm>
  );
}

export function TeamsManager({
  eventId,
  teams,
  groups,
}: TeamsManagerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const editingTeam = useMemo(
    () => teams.find((t) => t.id === editingId) ?? null,
    [teams, editingId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teams.filter((team) => {
      if (deptFilter !== "all" && team.category !== deptFilter) return false;
      if (groupFilter === "unassigned" && team.groups.length > 0) return false;
      if (
        groupFilter !== "all" &&
        groupFilter !== "unassigned" &&
        !team.groups.some((g) => g.id === groupFilter)
      ) {
        return false;
      }

      const status = evalStatus(team.evalSubmitted, team.evalExpected);
      if (statusFilter === "pending" && status.tone !== "pending") return false;
      if (statusFilter === "partial" && status.tone !== "partial") return false;
      if (statusFilter === "complete" && status.tone !== "complete") return false;

      if (!q) return true;
      const haystack = [
        team.team_number,
        team.team_name,
        team.project_title,
        team.category,
        team.booth_location,
        team.groups.map((g) => g.name).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [teams, query, deptFilter, statusFilter, groupFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + PAGE_SIZE, filtered.length);

  if (mode === "create" || mode === "edit") {
    return (
      <TeamEditorForm
        eventId={eventId}
        team={mode === "edit" ? editingTeam : null}
        onCancel={() => {
          setMode("list");
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title="Teams"
        description="Manage all participating teams and their evaluation status."
        breadcrumbs={[{ label: "Teams" }]}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={teams.length === 0}
              onClick={() => setDeleteAllOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete All Teams
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" aria-hidden />
              Import CSV / Excel
            </Button>
            <Button
              type="button"
              size="lg"
              className="gap-2"
              onClick={() => {
                setEditingId(null);
                setMode("create");
              }}
            >
              <Plus className="size-4" aria-hidden />
              Add Team
            </Button>
          </>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Team Name or #"
              aria-label="Search teams"
            />
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">
              Sort by:
            </span>
            <Select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-auto min-w-[9rem] shrink-0 rounded-md"
              aria-label="Filter by department"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-auto min-w-[8.5rem] shrink-0 rounded-md"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="complete">Complete</option>
            </Select>
            <Select
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-auto min-w-[8.5rem] shrink-0 rounded-md"
              aria-label="Filter by group"
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
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-muted/40 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Team #</th>
                <th className="px-4 py-3">Team Name</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3">Table #</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    {teams.length === 0
                      ? "No teams yet. Click Add Team to create one."
                      : "No teams match your search or filters."}
                  </td>
                </tr>
              ) : (
                pageRows.map((team) => {
                  const status = evalStatus(
                    team.evalSubmitted,
                    team.evalExpected,
                  );
                  const displayName =
                    team.team_name?.trim() || team.project_title || "—";
                  const progress =
                    team.evalExpected > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (team.evalSubmitted / team.evalExpected) * 100,
                          ),
                        )
                      : team.evalSubmitted > 0
                        ? 100
                        : 0;
                  return (
                    <tr
                      key={team.id}
                      className="border-t border-border align-middle"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="text-lg font-bold tracking-tight text-foreground">
                          {team.team_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-foreground">
                          {displayName}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        {team.category ? (
                          <span className="inline-flex rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground">
                            {team.category}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          <Store
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="max-w-[140px] truncate">
                            {team.booth_location
                              ? team.booth_location.startsWith("Table") || team.booth_location.startsWith("Booth")
                                ? team.booth_location.replace(/^Booth\s*/i, "Table ")
                                : `Table ${team.booth_location}`
                              : "—"}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {team.groups.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {team.groups.map((g) => (
                              <GroupBadge
                                key={g.id}
                                colorKey={g.color_key}
                                name={g.name}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex min-w-[7.5rem] flex-col gap-1.5">
                          <span
                            className={cn(
                              "inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold",
                              statusToneClass(status.tone),
                            )}
                          >
                            {status.tone === "complete" ? (
                              <CheckCircle2
                                className="size-3.5"
                                aria-hidden
                              />
                            ) : (
                              <CircleDashed
                                className="size-3.5"
                                aria-hidden
                              />
                            )}
                            {status.label}
                          </span>
                          <div
                            className="h-1.5 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                statusBarClass(status.tone),
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Edit ${displayName}`}
                            title="Edit"
                            onClick={() => {
                              setEditingId(team.id);
                              setMode("edit");
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="icon-sm"
                          >
                            <Link
                              href={`/admin/teams/${team.id}/qr`}
                              aria-label="View QR"
                              title="QR code"
                            >
                              <QrCode className="size-3.5" />
                            </Link>
                          </Button>
                          <AdminActionForm
                            action={deleteTeamAction}
                            className="!space-y-0"
                            onSuccess={() => router.refresh()}
                          >
                            <input type="hidden" name="id" value={team.id} />
                            <Button
                              type="submit"
                              variant="outline"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Delete team"
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AdminActionForm>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {showingFrom} to {showingTo} of {filtered.length} teams
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={currentPage <= 1}
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
                  Math.abs(n - currentPage) <= 1
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
                      variant={n === currentPage ? "default" : "outline"}
                      onClick={() => setPage(n)}
                      aria-current={n === currentPage ? "page" : undefined}
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
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      <TeamsImportDialog
        eventId={eventId}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => router.refresh()}
      />

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all teams</DialogTitle>
            <DialogDescription>
              Permanently delete all{" "}
              <span className="font-medium text-foreground">
                {teams.length}
              </span>{" "}
              team{teams.length === 1 ? "" : "s"} for this event, including
              members, assignments, and evaluations. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <AdminActionForm
            action={deleteAllTeamsAction}
            quietSuccess
            pendingLabel="Deleting teams…"
            onSuccess={(result) => {
              setDeleteAllOpen(false);
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
                Delete all teams
              </Button>
            </div>
          </AdminActionForm>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
