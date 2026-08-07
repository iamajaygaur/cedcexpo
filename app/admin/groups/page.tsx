import {
  GroupsManager,
  type GroupCardData,
} from "@/components/admin/groups-manager";
import { OpsEventEmpty } from "@/components/admin/ops-event-empty";
import { PageHeader } from "@/components/admin/page-header";
import { resolveOperationalEvent } from "@/lib/admin/event-context";
import { requireAdminClient } from "@/lib/admin/guard";
import { TABLES } from "@/lib/supabase/tables";
import type { Judge, JudgeGroup, Profile } from "@/types/database";

type PageProps = {
  searchParams: Promise<{ eventId?: string }>;
};

export default async function GroupsPage({ searchParams }: PageProps) {
  const { eventId } = await searchParams;
  const { supabase } = await requireAdminClient();
  const { event, events, lockedEvent } = await resolveOperationalEvent(
    supabase,
    eventId,
  );

  let groups: GroupCardData[] = [];
  let unassignedJudges: Array<
    Judge & { profiles: Pick<Profile, "full_name" | "email"> | null }
  > = [];

  if (event) {
    const { data: groupsData, error: groupsError } = await supabase
      .from(TABLES.judgeGroups)
      .select("*")
      .eq("event_id", event.id)
      .order("display_order");
    if (groupsError) throw new Error(groupsError.message);

    const { data: members, error: membersError } = await supabase
      .from(TABLES.judgeGroupMembers)
      .select(
        "id, judge_id, group_id, is_lead, judges(*, profiles(full_name, email))",
      )
      .eq("event_id", event.id);
    if (membersError) throw new Error(membersError.message);

    const { data: assignments, error: assignError } = await supabase
      .from(TABLES.judgingAssignments)
      .select("group_id")
      .eq("event_id", event.id);
    if (assignError) throw new Error(assignError.message);

    const teamCountByGroup = new Map<string, number>();
    for (const a of assignments ?? []) {
      teamCountByGroup.set(
        a.group_id,
        (teamCountByGroup.get(a.group_id) ?? 0) + 1,
      );
    }

    const assignedJudgeIds = new Set((members ?? []).map((m) => m.judge_id));

    groups = ((groupsData ?? []) as JudgeGroup[]).map((g) => ({
      ...g,
      teamCount: teamCountByGroup.get(g.id) ?? 0,
      members: (members ?? [])
        .filter((m) => m.group_id === g.id)
        .map((m) => ({
          id: m.id,
          judge_id: m.judge_id,
          is_lead: Boolean((m as { is_lead?: boolean }).is_lead),
          judges: m.judges as GroupCardData["members"][number]["judges"],
        }))
        .sort((a, b) => Number(b.is_lead) - Number(a.is_lead)),
    }));

    const { data: allJudges, error: judgesError } = await supabase
      .from(TABLES.judges)
      .select("*, profiles(full_name, email)")
      .eq("active", true)
      .order("created_at");
    if (judgesError) throw new Error(judgesError.message);

    unassignedJudges = (
      (allJudges ?? []) as Array<
        Judge & { profiles: Pick<Profile, "full_name" | "email"> | null }
      >
    ).filter((j) => !assignedJudgeIds.has(j.id));
  }

  return (
    <div>
      {lockedEvent && event ? (
        <div className="mb-6">
          <OpsEventEmpty lockedEvent={lockedEvent} hasAnyEvent />
        </div>
      ) : null}
      {event ? (
        <GroupsManager
          eventId={event.id}
          groups={groups}
          unassignedJudges={unassignedJudges}
        />
      ) : (
        <>
          <PageHeader
            breadcrumbs={[{ label: "Groups" }]}
            title="Judge Groups"
            description="Organize judging panels and assign evaluating teams."
          />
          <OpsEventEmpty
            lockedEvent={lockedEvent}
            hasAnyEvent={events.length > 0}
          />
        </>
      )}
    </div>
  );
}
