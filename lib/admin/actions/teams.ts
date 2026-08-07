"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import { TABLES } from "@/lib/supabase/tables";
import { teamFormSchema } from "@/lib/validation/admin";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

function formStringAll(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim());
}

function formatSchemaError(message: string): string {
  if (
    /team_name|student_id|column.*schema cache/i.test(message) ||
    /Could not find the 'role' column of 'team_members'/i.test(message)
  ) {
    return (
      "Database is missing team form columns. In Supabase → SQL Editor, run " +
      "supabase/APPLY_TEAM_FORM_FIELDS.sql, then try Save again."
    );
  }
  return message;
}

type MemberRow = {
  student_name: string;
  student_email: string | null;
  student_id: string;
  role: string;
};

function parseStructuredMembers(formData: FormData): MemberRow[] | null {
  const names = formStringAll(formData, "member_name");
  if (names.length === 0 && !formData.has("member_name")) return null;

  const emails = formStringAll(formData, "member_email");
  const studentIds = formStringAll(formData, "member_student_id");
  const roles = formStringAll(formData, "member_role");

  const rows: MemberRow[] = [];
  for (let i = 0; i < names.length; i++) {
    const student_name = names[i] ?? "";
    if (!student_name) continue;
    const email = emails[i]?.trim() || null;
    rows.push({
      student_name,
      student_email: email,
      student_id: studentIds[i] ?? "",
      role: roles[i] || "Member",
    });
  }
  return rows;
}

function parseLegacyMembers(raw: string | undefined): MemberRow[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const emailMatch = part.match(/<([^>]+)>/);
      const email = emailMatch?.[1]?.trim() ?? null;
      const student_name = part.replace(/<[^>]+>/, "").trim();
      return {
        student_name,
        student_email: email,
        student_id: "",
        role: "Member",
      };
    })
    .filter((m) => m.student_name.length > 0);
}

export async function upsertTeamAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const parsed = teamFormSchema.safeParse({
      id: formString(formData, "id") || undefined,
      event_id: formString(formData, "event_id"),
      team_number: formString(formData, "team_number"),
      team_name: formString(formData, "team_name"),
      project_title: formString(formData, "project_title"),
      project_description: formString(formData, "project_description"),
      category: formString(formData, "category"),
      advisor: formString(formData, "advisor"),
      booth_location: formString(formData, "booth_location"),
      members: formString(formData, "members"),
    });

    if (!parsed.success) {
      return actionFail(parsed.error.issues[0]?.message ?? "Invalid team");
    }

    const { id, members, ...payload } = parsed.data;
    if (!payload.team_name?.trim()) {
      payload.team_name = payload.project_title;
    }
    const structured = parseStructuredMembers(formData);
    const memberRows =
      structured !== null ? structured : parseLegacyMembers(members);

    let teamId = id;

    if (id) {
      const { error } = await supabase
        .from(TABLES.teams)
        .update(payload)
        .eq("id", id);
      if (error) return actionFail(formatSchemaError(error.message));
    } else {
      const qr_identifier = randomUUID().replace(/-/g, "");
      const { data, error } = await supabase
        .from(TABLES.teams)
        .insert({ ...payload, qr_identifier })
        .select("id")
        .single();
      if (error) return actionFail(formatSchemaError(error.message));
      teamId = data.id;
    }

    if (teamId) {
      await supabase.from(TABLES.teamMembers).delete().eq("team_id", teamId);
      if (memberRows.length > 0) {
        const { error: memberError } = await supabase
          .from(TABLES.teamMembers)
          .insert(memberRows.map((m) => ({ ...m, team_id: teamId! })));
        if (memberError) return actionFail(formatSchemaError(memberError.message));
      }
    }

    revalidatePath("/admin/teams");
    return actionOk(id ? "Team updated." : "Team created.");
  } catch (e) {
    return actionFail(e instanceof Error ? e.message : "Failed to save team");
  }
}

export async function deleteTeamAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const id = formString(formData, "id");
    if (!id) return actionFail("Missing team id");

    const { error } = await supabase.from(TABLES.teams).delete().eq("id", id);
    if (error) return actionFail(error.message);

    // Client shows success dialog, then router.refresh() — avoid revalidate here
    // so the row (and dialog state) isn't unmounted mid-feedback.
    return actionOk("Team deleted successfully.");
  } catch (e) {
    return actionFail(e instanceof Error ? e.message : "Failed to delete team");
  }
}

export async function deleteAllTeamsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const eventId = formString(formData, "event_id");
    if (!eventId) return actionFail("Missing event.");

    const { data: existing, error: countError } = await supabase
      .from(TABLES.teams)
      .select("id")
      .eq("event_id", eventId);
    if (countError) return actionFail(countError.message);

    const count = existing?.length ?? 0;
    if (count === 0) {
      return actionFail("No teams to delete for this event.");
    }

    const { error } = await supabase
      .from(TABLES.teams)
      .delete()
      .eq("event_id", eventId);
    if (error) return actionFail(error.message);

    return actionOk(
      `All ${count} team${count === 1 ? "" : "s"} deleted successfully.`,
    );
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to delete all teams",
    );
  }
}

export async function regenerateTeamQrAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const id = formString(formData, "id");
    if (!id) return actionFail("Missing team id");

    const qr_identifier = randomUUID().replace(/-/g, "");
    const { error } = await supabase
      .from(TABLES.teams)
      .update({ qr_identifier })
      .eq("id", id);
    if (error) return actionFail(error.message);

    revalidatePath("/admin/teams");
    revalidatePath(`/admin/teams/${id}/qr`);
    return actionOk("QR identifier regenerated.");
  } catch (e) {
    return actionFail(e instanceof Error ? e.message : "Failed to regenerate QR");
  }
}

export type ImportTeamsResult = ActionResult & {
  created?: number;
  updated?: number;
  failed?: Array<{ team_number: string; message: string }>;
};

const MAX_IMPORT_TEAMS = 200;

export async function importTeamsAction(params: {
  eventId: string;
  /** Prefer JSON string so large arrays serialize reliably through server actions. */
  teamsJson: string;
}): Promise<ImportTeamsResult> {
  try {
    const { supabase } = await requireAdminClient();
    const eventId = params.eventId?.trim();
    if (!eventId) {
      return actionFail("Import failed: missing event.");
    }

    let teams: Array<{
      team_number: string;
      booth_location: string;
      team_name: string;
      project_title: string;
      category: string;
      project_description: string;
      members: Array<{
        student_name: string;
        role: string;
        student_email: string;
      }>;
    }> = [];

    try {
      const parsedJson = JSON.parse(params.teamsJson) as unknown;
      if (!Array.isArray(parsedJson)) {
        return actionFail("Import failed: invalid team list.");
      }
      teams = parsedJson as typeof teams;
    } catch {
      return actionFail("Import failed: could not read team data.");
    }

    if (teams.length === 0) {
      return actionFail("Import failed: no teams to import.");
    }
    if (teams.length > MAX_IMPORT_TEAMS) {
      return actionFail(
        `Import failed: limited to ${MAX_IMPORT_TEAMS} teams at a time.`,
      );
    }

    const { data: event, error: eventError } = await supabase
      .from(TABLES.events)
      .select("id")
      .eq("id", eventId)
      .maybeSingle();
    if (eventError) {
      return actionFail(`Import failed: ${eventError.message}`);
    }
    if (!event) {
      return actionFail("Import failed: event not found.");
    }

    const numbers = teams.map((t) => t.team_number.trim()).filter(Boolean);
    const { data: existingRows, error: existingError } = await supabase
      .from(TABLES.teams)
      .select("id, team_number")
      .eq("event_id", eventId)
      .in("team_number", numbers);
    if (existingError) {
      return actionFail(`Import failed: ${existingError.message}`);
    }

    const existingByNumber = new Map(
      (existingRows ?? []).map((row) => [
        String(row.team_number).toLowerCase(),
        row.id as string,
      ]),
    );

    let created = 0;
    let updated = 0;
    const failed: Array<{ team_number: string; message: string }> = [];

    for (const raw of teams) {
      const parsed = teamFormSchema.safeParse({
        event_id: eventId,
        team_number: raw.team_number,
        team_name: raw.team_name,
        project_title: raw.project_title,
        project_description: raw.project_description ?? "",
        category: raw.category ?? "",
        advisor: "",
        booth_location: raw.booth_location ?? "",
      });

      if (!parsed.success) {
        failed.push({
          team_number: raw.team_number || "(blank)",
          message: parsed.error.issues[0]?.message ?? "Invalid team",
        });
        continue;
      }

      const {
        id: _id,
        members: _legacyMembers,
        event_id,
        ...teamFields
      } = parsed.data;
      void _id;
      void _legacyMembers;

      const teamPayload = {
        ...teamFields,
        team_name: teamFields.team_name?.trim()
          ? teamFields.team_name
          : teamFields.project_title,
      };

      const memberRows = (raw.members ?? [])
        .filter((m) => m.student_name?.trim())
        .map((m) => ({
          student_name: m.student_name.trim(),
          student_email: m.student_email?.trim() || null,
          student_id: "",
          role: m.role?.trim() || "Member",
        }));

      const existingId = existingByNumber.get(
        teamPayload.team_number.toLowerCase(),
      );

      try {
        let teamId = existingId;
        if (existingId) {
          const { error } = await supabase
            .from(TABLES.teams)
            .update(teamPayload)
            .eq("id", existingId);
          if (error) {
            failed.push({
              team_number: teamPayload.team_number,
              message: formatSchemaError(error.message),
            });
            continue;
          }
          updated += 1;
        } else {
          const qr_identifier = randomUUID().replace(/-/g, "");
          const { data, error } = await supabase
            .from(TABLES.teams)
            .insert({
              ...teamPayload,
              event_id,
              qr_identifier,
            })
            .select("id")
            .single();
          if (error || !data) {
            failed.push({
              team_number: teamPayload.team_number,
              message: formatSchemaError(error?.message ?? "Insert failed"),
            });
            continue;
          }
          teamId = data.id;
          existingByNumber.set(teamPayload.team_number.toLowerCase(), data.id);
          created += 1;
        }

        if (teamId) {
          const { error: deleteMembersError } = await supabase
            .from(TABLES.teamMembers)
            .delete()
            .eq("team_id", teamId);
          if (deleteMembersError) {
            failed.push({
              team_number: teamPayload.team_number,
              message: formatSchemaError(deleteMembersError.message),
            });
            continue;
          }
          if (memberRows.length > 0) {
            const { error: memberError } = await supabase
              .from(TABLES.teamMembers)
              .insert(memberRows.map((m) => ({ ...m, team_id: teamId! })));
            if (memberError) {
              failed.push({
                team_number: teamPayload.team_number,
                message: formatSchemaError(memberError.message),
              });
            }
          }
        }
      } catch (e) {
        failed.push({
          team_number: teamPayload.team_number,
          message: e instanceof Error ? e.message : "Import failed",
        });
      }
    }

    revalidatePath("/admin/teams");

    const imported = created + updated;
    if (imported === 0) {
      return {
        ...actionFail(
          failed.length > 0
            ? `Import failed: none of the ${teams.length} teams could be saved.`
            : "Import failed: no teams were saved.",
        ),
        created,
        updated,
        failed,
      };
    }

    const successParts = [
      created > 0 ? `${created} created` : null,
      updated > 0 ? `${updated} updated` : null,
    ].filter(Boolean);

    if (failed.length === 0) {
      return {
        ...actionOk("Teams imported successfully."),
        created,
        updated,
        failed,
      };
    }

    return {
      ...actionOk(
        `Import partially successful: ${successParts.join(", ")}; ${failed.length} failed.`,
      ),
      created,
      updated,
      failed,
    };
  } catch (e) {
    return actionFail(
      e instanceof Error
        ? `Import failed: ${e.message}`
        : "Import failed: unexpected error.",
    );
  }
}

