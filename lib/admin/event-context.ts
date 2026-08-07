import "server-only";

import type { Event, EventStatus } from "@/types/database";
import { TABLES } from "@/lib/supabase/tables";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const OPS_STATUSES: EventStatus[] = ["draft", "active"];
const PAST_STATUSES: EventStatus[] = ["completed", "archived"];

function isOperational(status: EventStatus) {
  return OPS_STATUSES.includes(status);
}

function isPast(status: EventStatus) {
  return PAST_STATUSES.includes(status);
}

async function loadEvents(supabase: Supabase): Promise<Event[]> {
  const { data: events, error } = await supabase
    .from(TABLES.events)
    .select("*")
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (events ?? []) as Event[];
}

/**
 * Live ops pages (Teams, Groups, Assignments, Monitor, Judges, Settings).
 * Prefer active, else newest draft. Completed/archived never become the
 * default workspace. Explicit eventId of a past event → null + lockedEvent.
 */
export async function resolveOperationalEvent(
  supabase: Supabase,
  eventId?: string | null,
): Promise<{
  event: Event | null;
  events: Event[];
  lockedEvent: Event | null;
}> {
  const list = await loadEvents(supabase);
  if (list.length === 0) {
    return { event: null, events: [], lockedEvent: null };
  }

  if (eventId) {
    const match = list.find((e) => e.id === eventId) ?? null;
    if (match && isOperational(match.status)) {
      return { event: match, events: list, lockedEvent: null };
    }
    if (match && isPast(match.status)) {
      const fallback =
        list.find((e) => e.status === "active") ??
        list.find((e) => e.status === "draft") ??
        null;
      return { event: fallback, events: list, lockedEvent: match };
    }
  }

  const active = list.find((e) => e.status === "active") ?? null;
  const draft = list.find((e) => e.status === "draft") ?? null;
  return { event: active ?? draft, events: list, lockedEvent: null };
}

/**
 * Read/history pages (Results, Reports, Archive).
 * Explicit eventId wins. Else active, else newest completed/archived, else newest.
 */
export async function resolveReadableEvent(
  supabase: Supabase,
  eventId?: string | null,
): Promise<{ event: Event | null; events: Event[] }> {
  const list = await loadEvents(supabase);
  if (list.length === 0) {
    return { event: null, events: [] };
  }

  if (eventId) {
    const match = list.find((e) => e.id === eventId);
    if (match) return { event: match, events: list };
  }

  const active = list.find((e) => e.status === "active");
  if (active) return { event: active, events: list };

  const past = list.find((e) => isPast(e.status));
  return { event: past ?? list[0] ?? null, events: list };
}

/**
 * @deprecated Prefer resolveOperationalEvent or resolveReadableEvent.
 * Kept as readable alias for gradual migration.
 */
export async function resolveAdminEvent(
  supabase: Supabase,
  eventId?: string | null,
): Promise<{ event: Event | null; events: Event[] }> {
  return resolveReadableEvent(supabase, eventId);
}

/**
 * Dashboard-only: returns the active event, never draft/completed/archived.
 */
export async function resolveActiveDashboardEvent(
  supabase: Supabase,
): Promise<{
  event: Event | null;
  events: Event[];
  hasAnyEvent: boolean;
}> {
  const events = await loadEvents(supabase);
  const active = events.find((e) => e.status === "active") ?? null;
  return {
    event: active,
    events,
    hasAnyEvent: events.length > 0,
  };
}
