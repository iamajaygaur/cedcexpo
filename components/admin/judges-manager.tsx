"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Copy,
  IdCard,
  KeyRound,
  Pencil,
  Save,
  StickyNote,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AssignedGroupPicker } from "@/components/admin/assigned-group-picker";
import { JudgesImportDialog } from "@/components/admin/judges-import-dialog";
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
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createJudgeAction,
  deleteAllJudgesAction,
  deleteJudgeAction,
  setJudgeActiveAction,
  updateJudgeAction,
} from "@/lib/admin/actions/judges";
import { setJudgePasswordAction } from "@/lib/admin/actions/passwords";
import {
  splitFullName,
  toLoginUsername,
  usernameFromNameParts,
} from "@/lib/auth/username";
import { getGroupColorToken } from "@/lib/groups/color-tokens";
import { cn } from "@/lib/utils";
import type { Judge, JudgeGroup, Profile } from "@/types/database";

export type GroupTeamSummary = {
  id: string;
  team_number: string;
  project_title: string;
};

export type JudgeRow = Judge & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
  group?: Pick<
    JudgeGroup,
    "id" | "name" | "color_key" | "display_order"
  > | null;
};

type JudgesManagerProps = {
  eventId: string | null;
  judges: JudgeRow[];
  groups: JudgeGroup[];
  teamsByGroup: Record<string, GroupTeamSummary[]>;
  /** Opens the password dialog for this judge (from dashboard help banner). */
  focusJudgeId?: string | null;
};

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

function loginFor(judge: JudgeRow) {
  const name = judge.profiles?.full_name?.trim();
  if (name) return toLoginUsername(name);
  const email = judge.profiles?.email?.trim() ?? "";
  if (email.endsWith("@cedc-expo.local")) {
    return email.slice(0, -"@cedc-expo.local".length);
  }
  return toLoginUsername(email.split("@")[0] ?? "") || "—";
}

function affiliationChip(judge: JudgeRow) {
  const org = judge.organization?.trim();
  const dept = judge.department?.trim();
  if (org && dept) return `${org} · ${dept}`;
  return org || dept || null;
}

function formatDelta(delta: number) {
  if (Object.is(delta, -0) || Math.abs(delta) < 0.05) return "0";
  const rounded = Math.round(delta * 10) / 10;
  const body = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
  return rounded > 0 ? `+${body}` : body;
}

function workloadTone(delta: number): {
  label: string;
  className: string;
  warn: boolean;
} {
  if (Math.abs(delta) <= 1.5) {
    return {
      label: "balanced",
      className: "text-emerald-700",
      warn: false,
    };
  }
  if (delta < -1.5) {
    return { label: "light", className: "text-amber-800", warn: true };
  }
  return { label: "heavy", className: "text-orange-800", warn: true };
}

function JudgePasswordDialogForm({
  judge,
  onCancel,
  onSuccess,
}: {
  judge: JudgeRow;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <AdminActionForm action={setJudgePasswordAction} onSuccess={onSuccess}>
      <input type="hidden" name="id" value={judge.id} />
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="set_judge_password">New password</Label>
          <PasswordInput
            id="set_judge_password"
            name="new_password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="h-10 rounded-md"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="set_judge_password_confirm">Confirm password</Label>
          <PasswordInput
            id="set_judge_password_confirm"
            name="confirm_password"
            required
            minLength={8}
            placeholder="Repeat password"
            className={
              passwordsMismatch
                ? "h-10 rounded-md border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
                : "h-10 rounded-md"
            }
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={passwordsMismatch || undefined}
          />
          {passwordsMismatch ? (
            <p role="alert" className="text-sm text-destructive">
              Passwords do not match.
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={passwordsMismatch}>
          Update password
        </Button>
      </div>
    </AdminActionForm>
  );
}

function JudgeEditorForm({
  eventId,
  groups,
  judge,
  onCancel,
}: {
  eventId: string | null;
  groups: JudgeGroup[];
  judge?: JudgeRow | null;
  onCancel: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(judge);
  const initialNames = splitFullName(judge?.profiles?.full_name ?? "");
  const [firstName, setFirstName] = useState(initialNames.firstName);
  const [lastName, setLastName] = useState(initialNames.lastName);
  const username = usernameFromNameParts(firstName, lastName);

  return (
    <AdminActionForm
      action={isEdit ? updateJudgeAction : createJudgeAction}
      onSuccess={() => {
        onCancel();
        router.refresh();
      }}
      className="space-y-0"
    >
      {judge ? <input type="hidden" name="id" value={judge.id} /> : null}
      {eventId ? <input type="hidden" name="event_id" value={eventId} /> : null}

      <PageHeader
        className="mb-6"
        breadcrumbs={[
          { label: "Judges", href: "/admin/judges" },
          { label: isEdit ? "Edit Judge" : "Add Judge" },
        ]}
        title={isEdit ? "Edit Judge" : "Add Judge"}
        description={
          isEdit
            ? `Update profile details for ${judge?.profiles?.full_name ?? "this judge"}.`
            : "Create a judge account with a temporary password. There is no public signup."
        }
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
              {isEdit ? "Save Judge" : "Create Judge"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="dash-form-panel">
            <div className="mb-4 flex items-center gap-2">
              <IdCard className="size-4 text-muted-foreground" aria-hidden />
              <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
                Judge Profile
              </h2>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="judge_first_name" className="text-xs uppercase">
                    First name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="judge_first_name"
                    name="first_name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="h-10 rounded-md"
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="judge_last_name" className="text-xs uppercase">
                    Last name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="judge_last_name"
                    name="last_name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="h-10 rounded-md"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="judge_username" className="text-xs uppercase">
                  Username
                </Label>
                <Input
                  id="judge_username"
                  readOnly
                  value={username || ""}
                  placeholder="username"
                  className="h-10 rounded-md bg-muted/50"
                  aria-describedby="judge_username_hint"
                />
                <p
                  id="judge_username_hint"
                  className="text-xs text-muted-foreground"
                >
                  Lowercase, no spaces (e.g. ajaygaur) — this is how they sign
                  in.
                </p>
              </div>

              {!isEdit ? (
                <div className="space-y-1">
                  <Label htmlFor="judge_password" className="text-xs uppercase">
                    Temporary password{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <KeyRound
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="judge_password"
                      name="password"
                      type="text"
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      className="h-10 rounded-md pl-10"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="dash-form-panel">
            <div className="mb-4 flex items-center gap-2">
              <StickyNote className="size-4 text-muted-foreground" aria-hidden />
              <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
                Notes
              </h2>
            </div>
            <Textarea
              id="judge_notes"
              name="notes"
              defaultValue={judge?.notes ?? ""}
              placeholder="Optional notes for admins..."
              className="min-h-32 rounded-md"
              rows={6}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Internal only — not shown to judges.
            </p>
          </section>
        </div>

        <section className="dash-form-panel">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
                  Affiliation & Group
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Organization details and judging color group
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor="judge_organization"
                  className="text-xs uppercase"
                >
                  Organization
                </Label>
                <Input
                  id="judge_organization"
                  name="organization"
                  defaultValue={judge?.organization ?? ""}
                  placeholder="Company or university"
                  className="h-10 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="judge_department" className="text-xs uppercase">
                  Department
                </Label>
                <Input
                  id="judge_department"
                  name="department"
                  defaultValue={judge?.department ?? ""}
                  placeholder="e.g. Computer Science"
                  className="h-10 rounded-md"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label className="text-xs uppercase">Assigned group</Label>
              <AssignedGroupPicker
                id="judge_group_id"
                groups={groups}
                defaultValue={judge?.group?.id ?? ""}
                disabled={!eventId}
              />
              {!eventId ? (
                <p className="text-xs text-muted-foreground">
                  Select an event to assign a color group.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Assign this judge to a color panel for team evaluations.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminActionForm>
  );
}

function JudgeDetailDialog({
  judge,
  open,
  onOpenChange,
  eventId,
  groups,
  teams,
  teamCount,
  avgTeams,
  onEdit,
  onDelete,
  onPassword,
}: {
  judge: JudgeRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | null;
  groups: JudgeGroup[];
  teams: GroupTeamSummary[];
  teamCount: number;
  avgTeams: number;
  onEdit: () => void;
  onDelete: () => void;
  onPassword: () => void;
}) {
  const router = useRouter();
  if (!judge) return null;

  const name = judge.profiles?.full_name ?? "Judge";
  const login = loginFor(judge);
  const delta = teamCount - avgTeams;
  const tone = workloadTone(delta);
  const panelNumber = Math.max(1, judge.group?.display_order || 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(94dvh,56rem)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl sm:rounded-2xl lg:max-w-5xl">
        <div className="overflow-y-auto px-6 py-6 pr-12 sm:px-8 sm:py-8 sm:pr-14">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground sm:size-[4.5rem] sm:text-xl">
                {initials(name)}
              </span>
              <div className="min-w-0">
                <DialogHeader className="gap-1 space-y-0 text-left">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {name}
                  </DialogTitle>
                  <DialogDescription className="font-mono text-sm text-muted-foreground sm:text-base">
                    {login}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2.5">
              <Button
                type="button"
                size="lg"
                className="h-11 gap-2 px-5"
                onClick={onEdit}
              >
                <Pencil className="size-4" aria-hidden />
                Edit judge
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 gap-2 border-red-200 px-5 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={onDelete}
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
                Profile
              </h3>
              <dl className="space-y-3.5 text-base">
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="text-muted-foreground">Organization</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {judge.organization?.trim() || "—"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {judge.department?.trim() || "—"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="text-muted-foreground">Login</dt>
                  <dd className="text-right font-mono text-sm font-semibold text-foreground sm:text-base">
                    {login}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold",
                      judge.active
                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
                        : "bg-muted text-muted-foreground ring-1 ring-border",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        judge.active ? "bg-emerald-600" : "bg-muted-foreground",
                      )}
                      aria-hidden
                    />
                    {judge.active ? "Active" : "Inactive"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
                Assignment
              </h3>
              <dl className="space-y-3.5 text-base">
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-muted-foreground">Group</dt>
                  <dd>
                    {judge.group ? (
                      <GroupBadge
                        colorKey={judge.group.color_key}
                        name={`${judge.group.name} · Panel ${panelNumber}`}
                      />
                    ) : (
                      <span className="text-muted-foreground italic">
                        Unassigned
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="text-muted-foreground">Teams assigned</dt>
                  <dd className="font-semibold text-foreground">
                    {teamCount} team{teamCount === 1 ? "" : "s"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6">
                  <dt className="text-muted-foreground">Workload vs. avg</dt>
                  <dd className={cn("font-semibold", tone.className)}>
                    {formatDelta(delta)} ({tone.label})
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h3 className="mb-4 text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
                Assigned teams ({teams.length})
              </h3>
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No teams assigned to this panel yet.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2.5">
                  {teams.map((t) => (
                    <li
                      key={t.id}
                      className="inline-flex max-w-full items-baseline gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-xs"
                    >
                      <span className="shrink-0 font-bold text-foreground">
                        Team {t.team_number}
                      </span>
                      <span className="text-muted-foreground" aria-hidden>
                        ·
                      </span>
                      <span className="min-w-0 truncate text-muted-foreground">
                        {t.project_title?.trim() || "Untitled project"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5 border-t border-border pt-6">
            {eventId ? (
              <AdminActionForm
                action={updateJudgeAction}
                quietSuccess
                className="!space-y-0"
                onSuccess={() => {
                  router.refresh();
                  showAppFeedbackFromResult(true, "Group updated.");
                }}
              >
                <input type="hidden" name="id" value={judge.id} />
                <input type="hidden" name="event_id" value={eventId} />
                <input
                  type="hidden"
                  name="organization"
                  value={judge.organization ?? ""}
                />
                <input
                  type="hidden"
                  name="department"
                  value={judge.department ?? ""}
                />
                <input type="hidden" name="notes" value={judge.notes ?? ""} />
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor="detail-move-group" className="sr-only">
                    Move to another group
                  </Label>
                  <Select
                    id="detail-move-group"
                    name="group_id"
                    defaultValue={judge.group?.id ?? ""}
                    className="h-11 min-w-[14rem] rounded-xl border-border"
                    onChange={(e) => {
                      e.currentTarget.form?.requestSubmit();
                    }}
                  >
                    <option value="">Unassigned</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        Move to {g.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </AdminActionForm>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 gap-2 rounded-xl px-5"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(login);
                  showAppFeedbackFromResult(true, "Login copied.");
                } catch {
                  showAppFeedbackFromResult(false, "Could not copy login.");
                }
              }}
            >
              <Copy className="size-4" aria-hidden />
              Copy login
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 gap-2 rounded-xl px-5"
              onClick={onPassword}
            >
              <KeyRound className="size-4" aria-hidden />
              Reset password
            </Button>

            <AdminActionForm
              action={setJudgeActiveAction}
              quietSuccess
              className="!space-y-0"
              onSuccess={() => router.refresh()}
            >
              <input type="hidden" name="id" value={judge.id} />
              <input
                type="hidden"
                name="active"
                value={judge.active ? "false" : "true"}
              />
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className={cn(
                  "h-11 rounded-xl px-5",
                  judge.active
                    ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    : "",
                )}
              >
                {judge.active ? "Deactivate" : "Activate"}
              </Button>
            </AdminActionForm>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function JudgesManager({
  eventId,
  judges,
  groups,
  teamsByGroup,
  focusJudgeId = null,
}: JudgesManagerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [importOpen, setImportOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteJudge, setDeleteJudge] = useState<JudgeRow | null>(null);
  const [passwordJudge, setPasswordJudge] = useState<JudgeRow | null>(null);
  const [detailJudge, setDetailJudge] = useState<JudgeRow | null>(null);

  useEffect(() => {
    if (!focusJudgeId) return;
    const match = judges.find((j) => j.id === focusJudgeId);
    if (match) setPasswordJudge(match);
  }, [focusJudgeId, judges]);

  const detailJudgeId = detailJudge?.id ?? null;
  useEffect(() => {
    if (!detailJudgeId) return;
    setDetailJudge(judges.find((j) => j.id === detailJudgeId) ?? null);
  }, [judges, detailJudgeId]);

  const editingJudge = useMemo(
    () => judges.find((j) => j.id === editingId) ?? null,
    [judges, editingId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return judges.filter((judge) => {
      if (statusFilter === "active" && !judge.active) return false;
      if (statusFilter === "inactive" && judge.active) return false;
      if (!q) return true;
      const haystack = [
        judge.profiles?.full_name,
        judge.profiles?.email,
        judge.organization,
        judge.department,
        judge.group?.name,
        loginFor(judge),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [judges, query, statusFilter]);

  const sortedGroups = useMemo(
    () =>
      [...groups].sort(
        (a, b) =>
          Math.max(1, a.display_order || 1) -
          Math.max(1, b.display_order || 1),
      ),
    [groups],
  );

  const teamCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of sortedGroups) {
      map.set(g.id, teamsByGroup[g.id]?.length ?? 0);
    }
    return map;
  }, [sortedGroups, teamsByGroup]);

  const avgTeams = useMemo(() => {
    if (sortedGroups.length === 0) return 0;
    const total = sortedGroups.reduce(
      (sum, g) => sum + (teamCounts.get(g.id) ?? 0),
      0,
    );
    return total / sortedGroups.length;
  }, [sortedGroups, teamCounts]);

  const maxTeams = useMemo(() => {
    let max = 1;
    for (const n of teamCounts.values()) max = Math.max(max, n);
    return max;
  }, [teamCounts]);

  const unassigned = useMemo(
    () => filtered.filter((j) => !j.group?.id),
    [filtered],
  );

  function backToList() {
    setMode("list");
    setEditingId(null);
  }

  if (mode === "create" || mode === "edit") {
    return (
      <JudgeEditorForm
        key={formKey}
        eventId={eventId}
        groups={groups}
        judge={mode === "edit" ? editingJudge : null}
        onCancel={backToList}
      />
    );
  }

  const detailTeams = detailJudge?.group?.id
    ? (teamsByGroup[detailJudge.group.id] ?? [])
    : [];
  const detailTeamCount = detailJudge?.group?.id
    ? (teamCounts.get(detailJudge.group.id) ?? 0)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <PageHeader
        title="Judges Management"
        description="Manage evaluators by color panel. Click a judge for full details."
        breadcrumbs={[{ label: "Judges" }]}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={judges.length === 0}
              onClick={() => setDeleteAllOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete All Judges
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" aria-hidden />
              Import Judges
            </Button>
            <Button
              type="button"
              size="lg"
              className="gap-2"
              onClick={() => {
                setEditingId(null);
                setFormKey((k) => k + 1);
                setMode("create");
              }}
            >
              <UserPlus className="size-4" aria-hidden />
              Add Judge
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search judges by name, login, org, or department…"
            aria-label="Search judges"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "active" | "inactive")
          }
          className="h-10 w-full shrink-0 sm:w-auto sm:min-w-[10rem]"
          aria-label="Filter by status"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {sortedGroups.length === 0 && unassigned.length === 0 ? (
        <p className="dash-empty py-14 text-sm text-muted-foreground">
          {judges.length === 0
            ? "No judges yet. Click Add Judge to create one."
            : eventId
              ? "Create color groups first, then assign judges to panels."
              : "Select an active event to organize judges by panel."}
        </p>
      ) : (
        <div
          className="grid gap-3 overflow-x-auto pb-1"
          style={{
            // Equal columns that grow to fill the row; scroll only when too narrow.
            gridTemplateColumns: `repeat(${
              sortedGroups.length +
              (unassigned.length > 0 || sortedGroups.length === 0 ? 1 : 0)
            }, minmax(14rem, 1fr))`,
          }}
        >
          {sortedGroups.map((group) => {
            const token = getGroupColorToken(group.color_key);
            const columnJudges = filtered
              .filter((j) => j.group?.id === group.id)
              .sort((a, b) =>
                (a.profiles?.full_name ?? "").localeCompare(
                  b.profiles?.full_name ?? "",
                ),
              );
            const teamCount = teamCounts.get(group.id) ?? 0;
            const delta = teamCount - avgTeams;
            const tone = workloadTone(delta);
            const fillPct = Math.min(100, (teamCount / maxTeams) * 100);

            return (
              <section
                key={group.id}
                className="dash-group-card flex min-w-0 flex-col"
                style={
                  {
                    "--group-tint": token.hex,
                  } as CSSProperties
                }
              >
                <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: token.hex }}
                      aria-hidden
                    />
                    <h2 className="truncate text-sm font-bold text-foreground">
                      {group.name}
                    </h2>
                  </div>
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-white px-2 py-0.5 text-xs font-bold text-foreground ring-1 ring-black/5">
                    {columnJudges.length}
                  </span>
                </header>

                <ul className="flex flex-1 flex-col gap-2 px-2 pb-2">
                  {columnJudges.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-border bg-white/50 px-3 py-6 text-center text-xs text-muted-foreground">
                      No judges in this panel
                    </li>
                  ) : (
                    columnJudges.map((judge) => {
                      const name = judge.profiles?.full_name ?? "Judge";
                      const chip = affiliationChip(judge);
                      return (
                        <li key={judge.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setDetailJudge(judge)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setDetailJudge(judge);
                              }
                            }}
                            aria-label={`View details for ${name}`}
                            className={cn(
                              "ui-interactive group/card w-full rounded-xl border border-border/80 bg-white p-3 text-left shadow-sm",
                              !judge.active && "opacity-70",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                                {initials(name)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {name}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  Login: {loginFor(judge)}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  className="ui-interactive-quiet inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
                                  aria-label={`Edit ${name}`}
                                  title="Edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(judge.id);
                                    setFormKey((k) => k + 1);
                                    setMode("edit");
                                  }}
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="ui-interactive-quiet inline-flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                  aria-label={`Delete ${name}`}
                                  title="Delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteJudge(judge);
                                  }}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                                <ChevronRight
                                  className="size-4 text-muted-foreground transition-colors group-hover/card:text-primary"
                                  aria-hidden
                                />
                              </div>
                            </div>
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              {chip ? (
                                <p className="inline-flex min-w-0 max-w-full truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                  {chip}
                                </p>
                              ) : (
                                <span />
                              )}
                              <span className="shrink-0 text-[10px] font-semibold text-primary">
                                View details
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>

                <footer className="mt-auto space-y-1.5 px-3 pt-1 pb-3">
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {teamCount} team{teamCount === 1 ? "" : "s"}
                    </span>
                    <span aria-hidden>·</span>
                    <span className={cn("font-medium", tone.className)}>
                      {formatDelta(delta)} avg
                    </span>
                    {tone.warn ? (
                      <AlertTriangle
                        className={cn("size-3", tone.className)}
                        aria-label={tone.label}
                      />
                    ) : null}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${fillPct}%`,
                        background: token.hex,
                      }}
                    />
                  </div>
                </footer>
              </section>
            );
          })}

          {unassigned.length > 0 || sortedGroups.length === 0 ? (
            <section className="flex min-w-0 flex-col rounded-2xl border border-dashed border-border bg-muted/30">
              <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
                <h2 className="truncate text-sm font-bold text-foreground">
                  Unassigned
                </h2>
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-white px-2 py-0.5 text-xs font-bold text-foreground ring-1 ring-black/5">
                  {unassigned.length}
                </span>
              </header>
              <ul className="flex flex-1 flex-col gap-2 px-2 pb-3">
                {unassigned.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-border bg-white/50 px-3 py-6 text-center text-xs text-muted-foreground">
                    Everyone is assigned
                  </li>
                ) : (
                  unassigned.map((judge) => {
                    const name = judge.profiles?.full_name ?? "Judge";
                    const chip = affiliationChip(judge);
                    return (
                      <li key={judge.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setDetailJudge(judge)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setDetailJudge(judge);
                            }
                          }}
                          aria-label={`View details for ${name}`}
                          className="ui-interactive group/card w-full rounded-xl border border-border/80 bg-white p-3 text-left shadow-sm"
                        >
                          <div className="flex items-start gap-2">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                              {initials(name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {name}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                Login: {loginFor(judge)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                className="ui-interactive-quiet inline-flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
                                aria-label={`Edit ${name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(judge.id);
                                  setFormKey((k) => k + 1);
                                  setMode("edit");
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                className="ui-interactive-quiet inline-flex size-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                aria-label={`Delete ${name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteJudge(judge);
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                              <ChevronRight
                                className="size-4 text-muted-foreground transition-colors group-hover/card:text-primary"
                                aria-hidden
                              />
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            {chip ? (
                              <p className="inline-flex min-w-0 max-w-full truncate rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                {chip}
                              </p>
                            ) : (
                              <span />
                            )}
                            <span className="shrink-0 text-[10px] font-semibold text-primary">
                              View details
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <JudgeDetailDialog
        judge={detailJudge}
        open={detailJudge != null}
        onOpenChange={(open) => {
          if (!open) setDetailJudge(null);
        }}
        eventId={eventId}
        groups={groups}
        teams={detailTeams}
        teamCount={detailTeamCount}
        avgTeams={avgTeams}
        onEdit={() => {
          if (!detailJudge) return;
          setEditingId(detailJudge.id);
          setFormKey((k) => k + 1);
          setDetailJudge(null);
          setMode("edit");
        }}
        onDelete={() => {
          if (!detailJudge) return;
          setDeleteJudge(detailJudge);
        }}
        onPassword={() => {
          if (!detailJudge) return;
          setPasswordJudge(detailJudge);
        }}
      />

      <Dialog
        open={passwordJudge != null}
        onOpenChange={(open) => {
          if (!open) setPasswordJudge(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Set a new login password for{" "}
              <span className="font-medium text-foreground">
                {passwordJudge?.profiles?.full_name ?? "this judge"}
              </span>
              {passwordJudge ? (
                <>
                  {" "}
                  (username:{" "}
                  <span className="font-medium text-foreground">
                    {loginFor(passwordJudge)}
                  </span>
                  )
                </>
              ) : null}
              .
            </DialogDescription>
          </DialogHeader>
          {passwordJudge ? (
            <JudgePasswordDialogForm
              key={passwordJudge.id}
              judge={passwordJudge}
              onCancel={() => setPasswordJudge(null)}
              onSuccess={() => {
                setPasswordJudge(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteJudge != null}
        onOpenChange={(open) => {
          if (!open) setDeleteJudge(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Judge</DialogTitle>
            <DialogDescription>
              Permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteJudge?.profiles?.full_name ?? "this judge"}
              </span>{" "}
              and their login account. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteJudge ? (
            <AdminActionForm
              key={deleteJudge.id}
              action={deleteJudgeAction}
              quietSuccess
              pendingLabel="Deleting judge…"
              onSuccess={(result) => {
                setDeleteJudge(null);
                setDetailJudge(null);
                router.refresh();
                window.setTimeout(() => {
                  showAppFeedbackFromResult(true, result.message);
                }, 0);
              }}
            >
              <input type="hidden" name="id" value={deleteJudge.id} />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteJudge(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive">
                  Delete judge
                </Button>
              </div>
            </AdminActionForm>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all judges</DialogTitle>
            <DialogDescription>
              Permanently delete all{" "}
              <span className="font-medium text-foreground">
                {judges.length}
              </span>{" "}
              judge{judges.length === 1 ? "" : "s"}, including login accounts,
              group memberships, and evaluations. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <AdminActionForm
            action={deleteAllJudgesAction}
            quietSuccess
            pendingLabel="Deleting judges…"
            onSuccess={(result) => {
              setDeleteAllOpen(false);
              router.refresh();
              window.setTimeout(() => {
                showAppFeedbackFromResult(true, result.message);
              }, 0);
            }}
          >
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteAllOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Delete all judges
              </Button>
            </div>
          </AdminActionForm>
        </DialogContent>
      </Dialog>

      <JudgesImportDialog
        eventId={eventId}
        groupNames={groups.map((g) => g.name)}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => router.refresh()}
      />
    </motion.div>
  );
}
