"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ClipboardCheck, Layers, Plus, Trash2, Users } from "lucide-react";

import { AdminActionForm } from "@/components/admin/admin-action-form";
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

const PREVIEW_PER_COLUMN = 4;
const PREVIEW_LIMIT = PREVIEW_PER_COLUMN * 2;

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

function JudgePreviewRow({
  member,
  bgClass,
  textClass,
}: {
  member: MemberRow;
  bgClass: string;
  textClass: string;
}) {
  const name = member.judges?.profiles?.full_name?.trim() || "Judge";
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-inset ring-black/5",
          bgClass,
          textClass,
        )}
      >
        {initialsFromName(name)}
      </span>
      <span className="min-w-0 truncate font-medium text-foreground">
        {name}
      </span>
      {member.is_lead ? (
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            bgClass,
            textClass,
          )}
        >
          Lead
        </span>
      ) : null}
    </li>
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

  const sortedGroups = [...groups].sort(
    (a, b) =>
      Math.max(1, a.display_order || 1) - Math.max(1, b.display_order || 1),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Groups" }]}
        title="Judge Groups"
        description="Organize judging panels and assign evaluating teams."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={groups.length === 0}
              onClick={() => setDeleteAllOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete All Groups
            </Button>
            <Button
              type="button"
              size="lg"
              className="gap-2"
              disabled={availableColorKeys.length === 0}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Create Judge Group
            </Button>
          </>
        }
      />

      {groups.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-14 text-center text-sm text-muted-foreground">
          No judge groups yet. Click Create Judge Group to add your first panel.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGroups.map((group, index) => {
            const token = getGroupColorToken(group.color_key);
            const panelNumber = Math.max(1, group.display_order || 1);
            const visible = group.members.slice(0, PREVIEW_LIMIT);
            const more = Math.max(0, group.members.length - visible.length);
            const judgeLabel =
              group.members.length === 1
                ? "1 Judge"
                : `${group.members.length} Judges`;

            return (
              <motion.article
                key={group.id}
                initial={
                  reducedMotion ? false : { opacity: 0, y: 16 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : {
                        delay: index * 0.06,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }
                }
                whileHover={
                  reducedMotion
                    ? undefined
                    : { y: -4, transition: { duration: 0.2 } }
                }
                className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={cn("h-1 w-full shrink-0", token.barClass)} />

                <div
                  className={cn(
                    "flex items-start justify-between gap-2 px-4 py-3",
                    token.bgClass,
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          token.dotClass,
                        )}
                        aria-hidden
                      />
                      <h2 className="truncate text-base font-bold tracking-tight text-foreground">
                        {group.name}
                      </h2>
                    </div>
                    <p className="mt-0.5 pl-[18px] text-xs font-medium text-muted-foreground">
                      Panel #{panelNumber}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 bg-card/80 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
                    <Users className="size-3" aria-hidden />
                    {judgeLabel}
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-4 py-3">
                  {group.members.length === 0 ? (
                    <div className="mb-2 flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/25 px-3 py-7 text-center">
                      <Users
                        className="size-5 text-muted-foreground/70"
                        aria-hidden
                      />
                      <p className="text-sm text-muted-foreground">
                        No judges assigned yet
                      </p>
                    </div>
                  ) : (
                    <div className="mb-2 grid flex-1 grid-cols-2 gap-x-3">
                      <ul className="space-y-2.5">
                        {visible.slice(0, PREVIEW_PER_COLUMN).map((m) => (
                          <JudgePreviewRow
                            key={m.id}
                            member={m}
                            bgClass={token.bgClass}
                            textClass={token.textClass}
                          />
                        ))}
                      </ul>
                      <ul className="space-y-2.5">
                        {visible.slice(PREVIEW_PER_COLUMN).map((m) => (
                          <JudgePreviewRow
                            key={m.id}
                            member={m}
                            bgClass={token.bgClass}
                            textClass={token.textClass}
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  {more > 0 ? (
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      +{more} more judge{more === 1 ? "" : "s"}
                    </p>
                  ) : null}

                  <p className="mt-1.5 flex items-center gap-1.5 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                    <Layers className="size-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-semibold text-foreground">
                        {group.teamCount}
                      </span>{" "}
                      team{group.teamCount === 1 ? "" : "s"} assigned
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 border-t border-border bg-muted/20 px-3 py-2.5">
                  <Button
                    type="button"
                    size="xs"
                    className="flex-1 gap-1.5"
                    onClick={() => setManageGroup(group)}
                  >
                    <Users className="size-3.5" aria-hidden />
                    Manage
                  </Button>
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    size="xs"
                    className="flex-1 gap-1.5 bg-card"
                  >
                    <Link href={`/admin/assignments?eventId=${eventId}`}>
                      <ClipboardCheck className="size-3.5" aria-hidden />
                      Assign
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Delete ${group.name}`}
                    title="Delete group"
                    onClick={() => setDeleteGroup(group)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Judge Group</DialogTitle>
            <DialogDescription>
              Add a color-coded judging panel for this expo.
            </DialogDescription>
          </DialogHeader>

          {groups.length > 0 ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
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
                className="space-y-2 rounded-md border border-border p-3"
              >
                <input type="hidden" name="id" value={manageGroup.id} />
                <input type="hidden" name="event_id" value={eventId} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-group-color">Group color</Label>
                    <Select
                      id="edit-group-color"
                      name="color_key"
                      defaultValue={getGroupColorToken(manageGroup.color_key).key}
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
                            n === Math.max(1, manageGroup.display_order || 1) ||
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
                        className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
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
