import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Event } from "@/types/database";

type OpsEventEmptyProps = {
  lockedEvent?: Event | null;
  hasAnyEvent?: boolean;
};

/**
 * Shown when operational pages have no draft/active event to manage.
 */
export function OpsEventEmpty({
  lockedEvent = null,
  hasAnyEvent = false,
}: OpsEventEmptyProps) {
  if (lockedEvent) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">
            “{lockedEvent.name}” is {lockedEvent.status}.
          </p>
          <p className="mt-1 text-muted-foreground">
            Judging is closed. Data is kept — open Archive or Reports to view
            and download results. Operational pages only manage active or draft
            events.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/admin/archive/${lockedEvent.id}`}>View archive</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/admin/reports?eventId=${lockedEvent.id}`}>
              Reports
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/events">Events</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">
        {hasAnyEvent
          ? "No active or draft event"
          : "No event yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAnyEvent
          ? "Create or activate an event on Events to manage teams, assignments, and live judging. Past expos stay in Archive."
          : "Create an event to start managing teams, judges, and assignments."}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/admin/events">Go to Events</Link>
        </Button>
        {hasAnyEvent ? (
          <Button asChild variant="outline">
            <Link href="/admin/archive">View archive</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
