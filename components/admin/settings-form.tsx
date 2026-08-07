"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { upsertEventAction } from "@/lib/admin/actions/events";
import type { Event } from "@/types/database";

type SettingsFormProps = {
  event: Event;
};

export function SettingsForm({ event }: SettingsFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(event.status);

  return (
    <section className="h-full rounded-md border border-border bg-card p-5">
      <h2 className="mb-4 text-lg font-semibold">Current event</h2>
      <AdminActionForm
        action={upsertEventAction}
        onSuccess={() => {
          if (status === "completed" || status === "archived") {
            router.push(`/admin/archive/${event.id}`);
            return;
          }
          router.refresh();
        }}
      >
        <input type="hidden" name="id" value={event.id} />
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={event.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="semester">Semester</Label>
          <Input
            id="semester"
            name="semester"
            required
            defaultValue={event.semester}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="event_date">Event date</Label>
            <Input
              id="event_date"
              name="event_date"
              type="date"
              defaultValue={event.event_date ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              value={status}
              onChange={(e) => {
                const next = e.target.value as Event["status"];
                if (
                  (next === "completed" || next === "archived") &&
                  event.status !== next
                ) {
                  const ok = window.confirm(
                    "Mark this event completed/archived?\n\nJudging will close. Data is kept in Archive and Reports.",
                  );
                  if (!ok) return;
                }
                setStatus(next);
              }}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            defaultValue={event.location}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="support_email">Email</Label>
          <Input
            id="support_email"
            name="support_email"
            type="email"
            defaultValue={event.support_email ?? ""}
            placeholder="Email"
          />
        </div>
        <Button type="submit" size="lg">
          Save event settings
        </Button>
      </AdminActionForm>
    </section>
  );
}
