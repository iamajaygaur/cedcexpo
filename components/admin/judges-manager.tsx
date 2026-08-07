"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  IdCard,
  KeyRound,
  Pencil,
  Power,
  PowerOff,
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
import { cn } from "@/lib/utils";
import type { Judge, JudgeGroup, Profile } from "@/types/database";

export type JudgeRow = Judge & {
  profiles: Pick<Profile, "full_name" | "email"> | null;
  group?: Pick<JudgeGroup, "id" | "name" | "color_key"> | null;
};

type JudgesManagerProps = {
  eventId: string | null;
  judges: JudgeRow[];
  groups: JudgeGroup[];
};

const PAGE_SIZE = 15;

function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
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
          <section className="rounded-md border border-border bg-card p-5 shadow-sm">
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
                  <Label
                    htmlFor="judge_password"
                    className="text-xs uppercase"
                  >
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

          <section className="rounded-md border border-border bg-card p-5 shadow-sm">
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

        <section className="rounded-md border border-border bg-card p-5 shadow-sm">
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

export function JudgesManager({
  eventId,
  judges,
  groups,
}: JudgesManagerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteJudge, setDeleteJudge] = useState<JudgeRow | null>(null);
  const [passwordJudge, setPasswordJudge] = useState<JudgeRow | null>(null);

  const editingJudge = useMemo(
    () => judges.find((j) => j.id === editingId) ?? null,
    [judges, editingId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return judges.filter((judge) => {
      if (statusFilter === "active" && !judge.active) return false;
      if (statusFilter === "inactive" && judge.active) return false;
      if (groupFilter === "unassigned" && judge.group) return false;
      if (
        groupFilter !== "all" &&
        groupFilter !== "unassigned" &&
        judge.group?.id !== groupFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        judge.profiles?.full_name,
        judge.profiles?.email,
        judge.organization,
        judge.department,
        judge.group?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [judges, query, groupFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + PAGE_SIZE, filtered.length);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title="Judges Management"
        description="Manage evaluators, assignments, and active status."
        breadcrumbs={[{ label: "Judges" }]}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search judges by name, org, or department..."
              aria-label="Search judges"
            />
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">
              Sort by:
            </span>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | "active" | "inactive");
                setPage(1);
              }}
              className="h-10 w-auto min-w-[8.5rem] shrink-0 rounded-md"
              aria-label="Filter by status"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Select
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-auto min-w-[10rem] shrink-0 rounded-md"
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
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-muted/40 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Judge</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-14 text-center text-muted-foreground"
                  >
                    {judges.length === 0
                      ? "No judges yet. Click Add Judge to create one."
                      : "No judges match your search or filters."}
                  </td>
                </tr>
              ) : (
                pageRows.map((judge) => {
                  const name = judge.profiles?.full_name ?? "Judge";
                  return (
                    <tr
                      key={judge.id}
                      className="border-t border-border align-middle"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              judge.active
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {initials(name)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">
                              {name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              Login: {toLoginUsername(name)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-foreground">
                          {judge.organization || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {judge.department || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        {judge.group ? (
                          <GroupBadge
                            colorKey={judge.group.color_key}
                            name={judge.group.name}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
                            judge.active
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              judge.active
                                ? "bg-emerald-600"
                                : "bg-muted-foreground",
                            )}
                            aria-hidden
                          />
                          {judge.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Edit ${name}`}
                            title="Edit"
                            onClick={() => {
                              setEditingId(judge.id);
                              setFormKey((k) => k + 1);
                              setMode("edit");
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label={`Change password for ${name}`}
                            title="Change password"
                            onClick={() => setPasswordJudge(judge)}
                          >
                            <KeyRound className="size-3.5" />
                          </Button>
                          <AdminActionForm
                            action={setJudgeActiveAction}
                            className="!space-y-0"
                            quietSuccess
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
                              size="icon-sm"
                              aria-label={
                                judge.active
                                  ? `Deactivate ${name}`
                                  : `Activate ${name}`
                              }
                              title={judge.active ? "Deactivate" : "Activate"}
                            >
                              {judge.active ? (
                                <PowerOff className="size-3.5" />
                              ) : (
                                <Power className="size-3.5" />
                              )}
                            </Button>
                          </AdminActionForm>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Delete ${name}`}
                            title="Delete"
                            onClick={() => setDeleteJudge(judge)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
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
            Showing {showingFrom} to {showingTo} of {filtered.length} entries
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
                      aria-label={`Page ${n}`}
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
              {passwordJudge?.profiles?.full_name ? (
                <>
                  {" "}
                  (username:{" "}
                  <span className="font-medium text-foreground">
                    {toLoginUsername(passwordJudge.profiles.full_name)}
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
                <Button
                  type="submit"
                  variant="destructive"
                >
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
