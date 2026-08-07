"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Calendar,
  CalendarClock,
  Clock,
  Copy,
  History,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteEventAction,
  upsertEventAction,
} from "@/lib/admin/actions/events";
import { cn } from "@/lib/utils";
import type { Event, EventStatus } from "@/types/database";

const DEPARTMENTS = [
  "BME",
  "CE/CEM",
  "CM",
  "CS",
  "CY",
  "EE",
  "ME",
  "MULTI",
] as const;

const SEMESTER_SEASONS = ["Spring", "Summer", "Fall"] as const;

type EventsManagerProps = {
  events: Event[];
  teamCountByEventId?: Record<string, number>;
};

function parseSemester(semester: string): { season: string; year: string } {
  const parts = semester.trim().split(/\s+/);
  const season = SEMESTER_SEASONS.includes(
    parts[0] as (typeof SEMESTER_SEASONS)[number],
  )
    ? parts[0]
    : "";
  const year = parts.find((p) => /^\d{4}$/.test(p)) ?? "";
  return { season, year };
}

function yearOptions() {
  const current = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => String(current - 1 + i));
}

function statusBadgeClass(status: EventStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-800";
    case "completed":
    case "archived":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusLabel(status: EventStatus) {
  switch (status) {
    case "draft":
      return "Scheduled";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function EventStatusIcon({ status }: { status: EventStatus }) {
  const base =
    "flex size-11 shrink-0 items-center justify-center rounded-md";

  if (status === "active") {
    return (
      <span
        className={cn(base, "bg-primary-container text-on-primary-container")}
        aria-hidden
      >
        <Calendar className="size-5" strokeWidth={2} />
      </span>
    );
  }

  if (status === "draft") {
    return (
      <span className={cn(base, "bg-muted text-muted-foreground")} aria-hidden>
        <CalendarClock className="size-5" strokeWidth={2} />
      </span>
    );
  }

  // completed + archived
  return (
    <span className={cn(base, "bg-muted text-muted-foreground")} aria-hidden>
      <History className="size-5" strokeWidth={2} />
    </span>
  );
}

function EventEditorForm({
  event,
  isEdit,
  canDuplicate,
  onDuplicate,
  onDone,
}: {
  event?: Event | null;
  isEdit: boolean;
  canDuplicate?: boolean;
  onDuplicate?: () => void;
  onDone?: () => void;
}) {
  const router = useRouter();
  const initial = parseSemester(event?.semester ?? "");
  const [season, setSeason] = useState(initial.season || "Spring");
  const [year, setYear] = useState(
    initial.year || String(new Date().getFullYear()),
  );
  const [departments, setDepartments] = useState<string[]>(
    event?.departments ?? [],
  );
  const [status, setStatus] = useState(event?.status ?? "draft");

  const semesterValue = `${season} ${year}`.trim();

  function toggleDepartment(code: string) {
    setDepartments((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code],
    );
  }

  return (
    <AdminActionForm
      id="event-editor-form"
      action={upsertEventAction}
      onSuccess={() => {
        onDone?.();
        router.refresh();
      }}
      className="space-y-6"
    >
      {isEdit && event?.id ? (
        <input type="hidden" name="id" value={event.id} />
      ) : null}
      <input type="hidden" name="semester" value={semesterValue} />
      <input type="hidden" name="status" value={status} />
      {departments.map((d) => (
        <input key={d} type="hidden" name="departments" value={d} />
      ))}

      <PageHeader
        className="mb-6"
        breadcrumbs={[
          { label: "Events", href: "/admin/events" },
          { label: isEdit ? "Edit" : "Create New" },
        ]}
        title={isEdit ? "Edit Expo Event" : "Create Expo Event"}
        actions={
          <>
            {!isEdit && canDuplicate && onDuplicate ? (
              <Button
                type="button"
                variant="outline"
                size="default"
                className="gap-2 px-5"
                onClick={onDuplicate}
              >
                <Copy className="size-4" aria-hidden />
                Duplicate Previous Event
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="default"
              className="gap-2 px-5"
              onClick={() => onDone?.()}
            >
              <X className="size-4" aria-hidden />
              Cancel
            </Button>
            <Button type="submit" size="default" className="gap-2 px-5">
              <Save className="size-4" aria-hidden />
              Save Event
            </Button>
          </>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-8"
      >
          <div className="grid gap-4 border-b border-border pb-6 md:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label htmlFor="event-name">
                Event Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="event-name"
                name="name"
                required
                defaultValue={event?.name}
                placeholder="e.g., Spring 2025 Engineering Showcase"
                className="h-11 rounded-md"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-status">Status</Label>
              <Select
                id="event-status"
                className="h-11 rounded-md"
                value={status}
                onChange={(e) => setStatus(e.target.value as Event["status"])}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 border-b border-border py-6 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-season">Semester</Label>
              <Select
                id="event-season"
                className="h-11 rounded-md"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              >
                <option value="">Select</option>
                {SEMESTER_SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-year">Year</Label>
              <Select
                id="event-year"
                className="h-11 rounded-md"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {yearOptions().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-location">Primary Location</Label>
              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="event-location"
                  name="location"
                  defaultValue={event?.location}
                  placeholder="Building, Room, or Venue"
                  className="h-11 rounded-md pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-b border-border py-6 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-date">Event Date</Label>
              <div className="relative">
                <Calendar
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="event-date"
                  name="event_date"
                  type="date"
                  defaultValue={event?.event_date ?? ""}
                  className="h-11 rounded-md pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-start">Start Time</Label>
              <div className="relative">
                <Clock
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="event-start"
                  name="start_time"
                  type="time"
                  defaultValue={event?.start_time ?? ""}
                  className="h-11 rounded-md pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-end">End Time</Label>
              <div className="relative">
                <Clock
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="event-end"
                  name="end_time"
                  type="time"
                  defaultValue={event?.end_time ?? ""}
                  className="h-11 rounded-md pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 border-b border-border py-6">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Participating Departments
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select all departments eligible to submit projects to this expo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map((code) => {
                const selected = departments.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleDepartment(code)}
                    className={cn(
                      "inline-flex h-10 min-w-14 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors",
                      selected
                        ? "border-[#002022] bg-[#002022] text-white"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                    aria-pressed={selected}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 border-b border-border py-6">
            <Label htmlFor="event-description">Public Description</Label>
            <Textarea
              id="event-description"
              name="description"
              defaultValue={event?.description ?? ""}
              placeholder="Provide details about the expo schedule, keynote speakers, or special instructions for judges and participants..."
              className="min-h-28 rounded-md"
              rows={5}
            />
          </div>

          <div className="space-y-1.5 pt-6">
            <Label htmlFor="event-support">Email</Label>
            <Input
              id="event-support"
              name="support_email"
              type="email"
              defaultValue={event?.support_email ?? ""}
              placeholder="Email"
              className="h-11 rounded-md"
            />
          </div>
      </motion.div>
    </AdminActionForm>
  );
}

export function EventsManager({
  events,
  teamCountByEventId = {},
}: EventsManagerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<Event | null>(null);
  const [formKey, setFormKey] = useState(0);

  const editingEvent = useMemo(
    () => events.find((e) => e.id === editingId) ?? null,
    [events, editingId],
  );

  const formEvent = useMemo(() => {
    if (mode === "edit") return editingEvent;
    if (!duplicateSource) return null;
    return {
      ...duplicateSource,
      name: `${duplicateSource.name} (Copy)`,
      status: "draft" as const,
    };
  }, [mode, editingEvent, duplicateSource]);

  function openCreate(from?: Event | null) {
    setDuplicateSource(from ?? null);
    setEditingId(null);
    setFormKey((k) => k + 1);
    setMode("create");
  }

  function openEdit(event: Event) {
    setDuplicateSource(null);
    setEditingId(event.id);
    setFormKey((k) => k + 1);
    setMode("edit");
  }

  function backToList() {
    setMode("list");
    setEditingId(null);
    setDuplicateSource(null);
  }

  if (mode === "create" || mode === "edit") {
    return (
      <EventEditorForm
        key={formKey}
        event={formEvent}
        isEdit={mode === "edit"}
        canDuplicate={events.length > 0}
        onDuplicate={() => openCreate(events[0] ?? null)}
        onDone={backToList}
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
        title="Events Management"
        description="Create and manage Capstone Design Expo events across semesters."
        breadcrumbs={[{ label: "Events" }]}
        actions={
          <>
            {events[0] ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => openCreate(events[0])}
              >
                <Copy className="size-4" aria-hidden />
                Duplicate Previous Event
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="gap-2"
              onClick={() => openCreate()}
            >
              <Plus className="size-4" aria-hidden />
              Create Expo Event
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
        {events.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-medium text-foreground">No events yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click Create Expo Event to set up your first Capstone Design Expo.
            </p>
            <Button
              type="button"
              size="default"
              className="mt-4 gap-2"
              onClick={() => openCreate()}
            >
              <Plus className="size-4" aria-hidden />
              Create Expo Event
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/40 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Semester</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Teams</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-t border-border align-middle"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <EventStatusIcon status={event.status} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">
                            {event.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {event.semester ||
                              (event.departments?.length
                                ? event.departments.join(", ")
                                : "—")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-foreground">
                      {event.semester || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-foreground">
                        <Calendar
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        {event.event_date ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-foreground">
                        <MapPin
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="max-w-[180px] truncate">
                          {event.location || "—"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase",
                          statusBadgeClass(event.status),
                        )}
                      >
                        {event.status === "active" ? (
                          <span
                            className="size-1.5 rounded-full bg-emerald-600"
                            aria-hidden
                          />
                        ) : null}
                        {statusLabel(event.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground">
                        <Users
                          className="size-3.5 text-muted-foreground"
                          aria-hidden
                        />
                        {teamCountByEventId[event.id] ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {event.status === "completed" ||
                        event.status === "archived" ? (
                          <Button asChild variant="outline" size="icon-sm">
                            <Link
                              href={`/admin/archive/${event.id}`}
                              aria-label={`Archive ${event.name}`}
                              title="View archive"
                            >
                              <Archive className="size-3.5" />
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Edit ${event.name}`}
                          title="Edit"
                          onClick={() => openEdit(event)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <AdminActionForm
                          action={deleteEventAction}
                          quietSuccess
                          className="!space-y-0"
                          onSuccess={() => router.refresh()}
                        >
                          <input type="hidden" name="id" value={event.id} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Delete ${event.name}`}
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </AdminActionForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
