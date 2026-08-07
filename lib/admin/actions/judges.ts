"use server";

import { revalidatePath } from "next/cache";

import {
  actionFail,
  actionOk,
  type ActionResult,
} from "@/lib/admin/action-result";
import { requireAdminClient } from "@/lib/admin/guard";
import {
  authEmailFromUsername,
  displayNameFromParts,
  parseLoginUsername,
  toLoginUsername,
  usernameFromNameParts,
} from "@/lib/auth/username";
import { createAdminClient } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/supabase/tables";
import { judgeFormSchema } from "@/lib/validation/admin";

function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function createJudgeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const parsed = judgeFormSchema.safeParse({
      first_name: formString(formData, "first_name"),
      last_name: formString(formData, "last_name"),
      email: formString(formData, "email") || undefined,
      password: formString(formData, "password") || undefined,
      organization: formString(formData, "organization"),
      department: formString(formData, "department"),
      notes: formString(formData, "notes"),
      active: formData.get("active"),
      group_id: formString(formData, "group_id"),
      event_id: formString(formData, "event_id") || undefined,
    });

    if (!parsed.success) {
      return actionFail(parsed.error.issues[0]?.message ?? "Invalid judge");
    }

    if (!parsed.data.password) {
      return actionFail("Temporary password is required for new judges.");
    }

    const username = usernameFromNameParts(
      parsed.data.first_name,
      parsed.data.last_name,
    );
    const usernameParsed = parseLoginUsername(username);
    if (!usernameParsed.ok) {
      return actionFail(usernameParsed.message);
    }
    const fullName = displayNameFromParts(
      parsed.data.first_name,
      parsed.data.last_name,
    );
    const email =
      parsed.data.email?.trim() ||
      authEmailFromUsername(usernameParsed.username);

    const admin = createAdminClient();

    const { data: existingProfiles } = await admin
      .from(TABLES.profiles)
      .select("id, full_name, email");
    const clash = (existingProfiles ?? []).some(
      (p) =>
        toLoginUsername(p.full_name) === usernameParsed.username ||
        (p.email && toLoginUsername(p.email.split("@")[0] ?? "") ===
          usernameParsed.username),
    );
    if (clash) {
      return actionFail(
        "A user with this username already exists. First and last name must make a unique username.",
      );
    }

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          username: usernameParsed.username,
        },
      });

    if (createError || !created.user) {
      return actionFail(createError?.message ?? "Could not create auth user");
    }

    // Ensure profile (trigger may race); force judge role + name.
    const { error: profileError } = await admin.from(TABLES.profiles).upsert(
      {
        id: created.user.id,
        email,
        full_name: fullName,
        role: "judge",
      },
      { onConflict: "id" },
    );
    if (profileError) return actionFail(profileError.message);

    const { data: judge, error: judgeError } = await admin
      .from(TABLES.judges)
      .insert({
        profile_id: created.user.id,
        organization: parsed.data.organization,
        title: "",
        department: parsed.data.department,
        notes: parsed.data.notes,
        active: parsed.data.active,
      })
      .select("id")
      .single();

    if (judgeError) return actionFail(judgeError.message);

    if (
      parsed.data.group_id &&
      parsed.data.event_id &&
      judge?.id
    ) {
      const { error: memberError } = await supabase
        .from(TABLES.judgeGroupMembers)
        .insert({
          event_id: parsed.data.event_id,
          group_id: parsed.data.group_id,
          judge_id: judge.id,
        });
      if (memberError) return actionFail(memberError.message);
    }

    revalidatePath("/admin/judges");
    revalidatePath("/admin/groups");
    return actionOk(
      `Judge created. Login username: ${usernameParsed.username}. Share the temporary password securely.`,
    );
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to create judge",
    );
  }
}

export async function updateJudgeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const id = formString(formData, "id");
    if (!id) return actionFail("Missing judge id");

    const organization = formString(formData, "organization");
    const department = formString(formData, "department");
    const notes = formString(formData, "notes");
    const firstName = formString(formData, "first_name");
    const lastName = formString(formData, "last_name");
    const activeRaw = formData.get("active");

    const { data: judge, error: loadError } = await supabase
      .from(TABLES.judges)
      .select("profile_id")
      .eq("id", id)
      .single();
    if (loadError || !judge) return actionFail("Judge not found");

    const patch: {
      organization: string;
      department: string;
      notes: string;
      active?: boolean;
    } = { organization, department, notes };
    if (typeof activeRaw === "string" && activeRaw.length > 0) {
      patch.active = activeRaw !== "false";
    }

    const { error } = await supabase
      .from(TABLES.judges)
      .update(patch)
      .eq("id", id);
    if (error) return actionFail(error.message);

    if (firstName || lastName) {
      const nextUsername = usernameFromNameParts(firstName, lastName);
      const usernameParsed = parseLoginUsername(nextUsername);
      if (!usernameParsed.ok) {
        return actionFail(usernameParsed.message);
      }
      const nextName = displayNameFromParts(firstName, lastName);

      const { data: others } = await supabase
        .from(TABLES.profiles)
        .select("id, full_name, email")
        .neq("id", judge.profile_id);
      const clash = (others ?? []).some(
        (p) =>
          toLoginUsername(p.full_name) === usernameParsed.username ||
          (p.email &&
            toLoginUsername(p.email.split("@")[0] ?? "") ===
              usernameParsed.username),
      );
      if (clash) {
        return actionFail(
          "A user with this username already exists. First and last name must make a unique username.",
        );
      }

      await supabase
        .from(TABLES.profiles)
        .update({ full_name: nextName })
        .eq("id", judge.profile_id);
    }

    const eventId = formString(formData, "event_id");
    if (formData.has("group_id") && eventId) {
      const groupId = formString(formData, "group_id");
      if (groupId) {
        const { error: memberError } = await supabase
          .from(TABLES.judgeGroupMembers)
          .upsert(
            {
              event_id: eventId,
              group_id: groupId,
              judge_id: id,
            },
            { onConflict: "event_id,judge_id" },
          );
        if (memberError) return actionFail(memberError.message);
      } else {
        const { error: removeError } = await supabase
          .from(TABLES.judgeGroupMembers)
          .delete()
          .eq("event_id", eventId)
          .eq("judge_id", id);
        if (removeError) return actionFail(removeError.message);
      }
    }

    revalidatePath("/admin/judges");
    revalidatePath("/admin/groups");
    return actionOk("Judge updated.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to update judge",
    );
  }
}

export async function setJudgeActiveAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminClient();
    const id = formString(formData, "id");
    const active = formString(formData, "active") === "true";
    if (!id) return actionFail("Missing judge id");

    const { error } = await supabase
      .from(TABLES.judges)
      .update({ active })
      .eq("id", id);
    if (error) return actionFail(error.message);

    revalidatePath("/admin/judges");
    return actionOk();
  } catch (e) {
    return actionFail(e instanceof Error ? e.message : "Failed to update judge");
  }
}

export async function deleteJudgeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminClient();
    const id = formString(formData, "id");
    if (!id) return actionFail("Missing judge id");

    const admin = createAdminClient();
    const { data: judge, error: loadError } = await admin
      .from(TABLES.judges)
      .select("profile_id")
      .eq("id", id)
      .single();
    if (loadError || !judge) return actionFail("Judge not found");

    // Clear memberships first (belt-and-suspenders; also cascades from judge).
    await admin.from(TABLES.judgeGroupMembers).delete().eq("judge_id", id);

    // Evaluations reference judges; remove them before auth user delete.
    const { data: evals } = await admin
      .from(TABLES.evaluations)
      .select("id")
      .eq("judge_id", id);
    const evalIds = (evals ?? []).map((e) => e.id);
    if (evalIds.length > 0) {
      await admin
        .from(TABLES.evaluationScores)
        .delete()
        .in("evaluation_id", evalIds);
      await admin.from(TABLES.evaluations).delete().eq("judge_id", id);
    }

    const { error: judgeDeleteError } = await admin
      .from(TABLES.judges)
      .delete()
      .eq("id", id);
    if (judgeDeleteError) return actionFail(judgeDeleteError.message);

    const { error: deleteError } = await admin.auth.admin.deleteUser(
      judge.profile_id,
    );
    // Judge row is already gone; auth delete failure should still surface.
    if (deleteError) {
      return actionFail(
        `Judge removed, but login cleanup failed: ${deleteError.message}`,
      );
    }

    // Client shows success dialog, then router.refresh().
    return actionOk("Judge deleted successfully.");
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to delete judge",
    );
  }
}

export async function deleteAllJudgesAction(
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdminClient();
    const admin = createAdminClient();

    const { data: judges, error: loadError } = await admin
      .from(TABLES.judges)
      .select("id, profile_id");
    if (loadError) return actionFail(loadError.message);

    const rows = judges ?? [];
    if (rows.length === 0) {
      return actionFail("No judges to delete.");
    }

    const judgeIds = rows.map((j) => j.id);
    const profileIds = rows.map((j) => j.profile_id);

    await admin
      .from(TABLES.judgeGroupMembers)
      .delete()
      .in("judge_id", judgeIds);

    const { data: evals } = await admin
      .from(TABLES.evaluations)
      .select("id")
      .in("judge_id", judgeIds);
    const evalIds = (evals ?? []).map((e) => e.id);
    if (evalIds.length > 0) {
      await admin
        .from(TABLES.evaluationScores)
        .delete()
        .in("evaluation_id", evalIds);
      await admin.from(TABLES.evaluations).delete().in("id", evalIds);
    }

    const { error: judgeDeleteError } = await admin
      .from(TABLES.judges)
      .delete()
      .in("id", judgeIds);
    if (judgeDeleteError) return actionFail(judgeDeleteError.message);

    // Delete auth users in parallel (sequential calls made Delete All feel stuck).
    const authResults = await Promise.all(
      profileIds.map((profileId) => admin.auth.admin.deleteUser(profileId)),
    );
    const authFailures = authResults.filter((r) => r.error).length;

    if (authFailures > 0) {
      return actionOk(
        `Deleted ${rows.length} judge${rows.length === 1 ? "" : "s"}, but ${authFailures} login account${authFailures === 1 ? "" : "s"} could not be fully cleaned up.`,
      );
    }

    return actionOk(
      `All ${rows.length} judge${rows.length === 1 ? "" : "s"} deleted successfully.`,
    );
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to delete all judges",
    );
  }
}

export type ImportJudgesResult = ActionResult & {
  created?: number;
  failed?: Array<{ username: string; message: string }>;
};

const MAX_IMPORT_JUDGES = 100;

export async function importJudgesAction(params: {
  eventId?: string | null;
  /** Prefer JSON string so large arrays serialize reliably through server actions. */
  judgesJson: string;
}): Promise<ImportJudgesResult> {
  try {
    const { supabase } = await requireAdminClient();

    let judges: Array<{
      first_name: string;
      last_name: string;
      password: string;
      organization: string;
      department: string;
      notes: string;
      active: boolean;
      group_name: string;
      username: string;
    }> = [];

    try {
      const parsedJson = JSON.parse(params.judgesJson) as unknown;
      if (!Array.isArray(parsedJson)) {
        return actionFail("Import failed: invalid judge list.");
      }
      judges = parsedJson as typeof judges;
    } catch {
      return actionFail("Import failed: could not read judge data.");
    }

    if (judges.length === 0) {
      return actionFail("Import failed: no judges to import.");
    }
    if (judges.length > MAX_IMPORT_JUDGES) {
      return actionFail(
        `Import failed: limited to ${MAX_IMPORT_JUDGES} judges at a time.`,
      );
    }

    const eventId = params.eventId?.trim() || "";
    const groupByName = new Map<string, string>();
    if (eventId) {
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

      const { data: groups, error: groupsError } = await supabase
        .from(TABLES.judgeGroups)
        .select("id, name")
        .eq("event_id", eventId);
      if (groupsError) {
        return actionFail(`Import failed: ${groupsError.message}`);
      }
      for (const g of groups ?? []) {
        groupByName.set(String(g.name).trim().toLowerCase(), g.id as string);
      }
    }

    const admin = createAdminClient();
    const { data: existingProfiles } = await admin
      .from(TABLES.profiles)
      .select("id, full_name, email");

    const takenUsernames = new Set<string>();
    for (const p of existingProfiles ?? []) {
      const fromName = toLoginUsername(p.full_name);
      if (fromName) takenUsernames.add(fromName);
      if (p.email) {
        const fromEmail = toLoginUsername(p.email.split("@")[0] ?? "");
        if (fromEmail) takenUsernames.add(fromEmail);
      }
    }

    let created = 0;
    const failed: Array<{ username: string; message: string }> = [];

    for (const raw of judges) {
      const usernameParsed = parseLoginUsername(
        String(raw.username ?? "").trim() ||
          usernameFromNameParts(
            String(raw.first_name ?? ""),
            String(raw.last_name ?? ""),
          ),
      );
      const label = usernameParsed.ok
        ? usernameParsed.username
        : `${raw.first_name ?? ""} ${raw.last_name ?? ""}`.trim() || "unknown";

      if (!usernameParsed.ok) {
        failed.push({ username: label, message: usernameParsed.message });
        continue;
      }

      const firstName = String(raw.first_name ?? "").trim();
      const lastName = String(raw.last_name ?? "").trim();
      const password = String(raw.password ?? "");
      if (!firstName || !lastName) {
        failed.push({
          username: label,
          message: "First and last name are required.",
        });
        continue;
      }
      if (password.length < 8) {
        failed.push({
          username: label,
          message: "Temporary password must be at least 8 characters.",
        });
        continue;
      }

      if (takenUsernames.has(usernameParsed.username)) {
        failed.push({
          username: label,
          message: "A user with this username already exists.",
        });
        continue;
      }

      const groupName = String(raw.group_name ?? "").trim();
      let groupId: string | null = null;
      if (groupName) {
        if (!eventId) {
          failed.push({
            username: label,
            message: "Group requires an active event.",
          });
          continue;
        }
        groupId = groupByName.get(groupName.toLowerCase()) ?? null;
        if (!groupId) {
          failed.push({
            username: label,
            message: `Unknown group "${groupName}". Use an existing group name for this event.`,
          });
          continue;
        }
      }

      const fullName = displayNameFromParts(firstName, lastName);
      const email = authEmailFromUsername(usernameParsed.username);

      const { data: authUser, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            username: usernameParsed.username,
          },
        });

      if (createError || !authUser.user) {
        failed.push({
          username: label,
          message: createError?.message ?? "Could not create auth user",
        });
        continue;
      }

      const { error: profileError } = await admin.from(TABLES.profiles).upsert(
        {
          id: authUser.user.id,
          email,
          full_name: fullName,
          role: "judge",
        },
        { onConflict: "id" },
      );
      if (profileError) {
        failed.push({ username: label, message: profileError.message });
        continue;
      }

      const { data: judge, error: judgeError } = await admin
        .from(TABLES.judges)
        .insert({
          profile_id: authUser.user.id,
          organization: String(raw.organization ?? "").slice(0, 200),
          title: "",
          department: String(raw.department ?? "").slice(0, 200),
          notes: String(raw.notes ?? "").slice(0, 2000),
          active: raw.active !== false,
        })
        .select("id")
        .single();

      if (judgeError || !judge?.id) {
        failed.push({
          username: label,
          message: judgeError?.message ?? "Could not create judge record",
        });
        continue;
      }

      if (groupId && eventId) {
        const { error: memberError } = await supabase
          .from(TABLES.judgeGroupMembers)
          .insert({
            event_id: eventId,
            group_id: groupId,
            judge_id: judge.id,
          });
        if (memberError) {
          failed.push({
            username: label,
            message: `Created, but group assign failed: ${memberError.message}`,
          });
          takenUsernames.add(usernameParsed.username);
          created += 1;
          continue;
        }
      }

      takenUsernames.add(usernameParsed.username);
      created += 1;
    }

    revalidatePath("/admin/judges");
    revalidatePath("/admin/groups");
    revalidatePath("/admin/assignments");

    if (created === 0) {
      return {
        ...actionFail(
          failed.length > 0
            ? `Import failed: none of ${judges.length} judges could be created.`
            : "Import failed: no judges created.",
        ),
        created: 0,
        failed,
      };
    }

    const hasFailures = failed.length > 0;
    return {
      ...actionOk(
        hasFailures
          ? `Imported ${created} of ${judges.length} judges. ${failed.length} failed.`
          : `Judges imported successfully.`,
      ),
      created,
      failed,
    };
  } catch (e) {
    return actionFail(
      e instanceof Error ? e.message : "Failed to import judges",
    );
  }
}
