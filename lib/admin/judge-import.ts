/**
 * Judge CSV / Excel import helpers (safe for client + server).
 * One row per judge.
 */

import {
  detectCsvDelimiter,
  parseCsvText,
  recordsFromCsvMatrix,
  recordsFromSheetMatrix,
} from "@/lib/admin/team-import";
import {
  parseLoginUsername,
  usernameFromNameParts,
} from "@/lib/auth/username";

export const JUDGE_IMPORT_HEADERS = [
  "First Name",
  "Last Name",
  "Temporary Password",
  "Organization",
  "Department",
  "Notes",
  "Active",
  "Group",
] as const;

const HEADER_ALIASES: Record<string, string> = {
  "first name": "First Name",
  first_name: "First Name",
  firstname: "First Name",
  "last name": "Last Name",
  last_name: "Last Name",
  lastname: "Last Name",
  "temporary password": "Temporary Password",
  password: "Temporary Password",
  temp_password: "Temporary Password",
  organization: "Organization",
  org: "Organization",
  department: "Department",
  dept: "Department",
  notes: "Notes",
  active: "Active",
  status: "Active",
  group: "Group",
  "group name": "Group",
  color: "Group",
  "color group": "Group",
};

function normalizeHeaderKey(raw: string): string {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  const lower = trimmed.toLowerCase().replace(/[_]+/g, " ");
  return HEADER_ALIASES[lower] ?? HEADER_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export function buildJudgeImportTemplateCsv(): string {
  const headers = [...JUDGE_IMPORT_HEADERS];
  const sample = [
    "Ada",
    "Lovelace",
    "Welcome123!",
    "CU Denver",
    "CS",
    "",
    "yes",
    "Red",
  ];
  const escape = (cell: string) => {
    if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
    return cell;
  };
  return `${headers.map(escape).join(",")}\n${sample.map(escape).join(",")}\n`;
}

export type ImportedJudge = {
  first_name: string;
  last_name: string;
  password: string;
  organization: string;
  department: string;
  notes: string;
  active: boolean;
  /** Group color/name from file (matched on server). */
  group_name: string;
  username: string;
};

export type JudgeImportRowError = {
  row: number;
  message: string;
};

export type JudgeImportParseResult = {
  judges: ImportedJudge[];
  errors: JudgeImportRowError[];
  skippedEmptyRows: number;
};

function get(record: Record<string, string>, key: string): string {
  return (record[key] ?? "").trim();
}

function parseActive(value: string): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  if (["no", "false", "0", "inactive", "n"].includes(v)) return false;
  return true;
}

function normalizeJudgeRecords(
  records: Record<string, string>[],
): Record<string, string>[] {
  return records.map((row) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const header = normalizeHeaderKey(key);
      if (!header) continue;
      if (out[header] != null && out[header] !== "") continue;
      out[header] = value;
    }
    return out;
  });
}

export function parseImportedJudgeRecords(
  rawRecords: Record<string, string>[],
  options?: { defaultPassword?: string },
): JudgeImportParseResult {
  const records = normalizeJudgeRecords(rawRecords);
  const judges: ImportedJudge[] = [];
  const errors: JudgeImportRowError[] = [];
  let skippedEmptyRows = 0;
  const seenUsernames = new Set<string>();
  const defaultPassword = options?.defaultPassword?.trim() ?? "";

  records.forEach((record, index) => {
    const row = index + 2;
    const first_name = get(record, "First Name");
    const last_name = get(record, "Last Name");
    const passwordRaw = get(record, "Temporary Password") || defaultPassword;
    const organization = get(record, "Organization");
    const department = get(record, "Department");
    const notes = get(record, "Notes");
    const activeRaw = get(record, "Active");
    const group_name = get(record, "Group");

    const isEmpty =
      !first_name &&
      !last_name &&
      !passwordRaw &&
      !organization &&
      !department &&
      !notes &&
      !activeRaw &&
      !group_name;

    if (isEmpty) {
      skippedEmptyRows += 1;
      return;
    }

    if (!first_name) {
      errors.push({ row, message: "First Name is required." });
      return;
    }
    if (!last_name) {
      errors.push({ row, message: "Last Name is required." });
      return;
    }

    const username = usernameFromNameParts(first_name, last_name);
    const usernameParsed = parseLoginUsername(username);
    if (!usernameParsed.ok) {
      errors.push({ row, message: usernameParsed.message });
      return;
    }

    if (seenUsernames.has(usernameParsed.username)) {
      errors.push({
        row,
        message: `Duplicate username "${usernameParsed.username}" in file (from first+last name).`,
      });
      return;
    }
    seenUsernames.add(usernameParsed.username);

    if (!passwordRaw) {
      errors.push({
        row,
        message:
          "Temporary Password is required (or set a default password before import).",
      });
      return;
    }
    if (passwordRaw.length < 8) {
      errors.push({
        row,
        message: "Temporary Password must be at least 8 characters.",
      });
      return;
    }

    judges.push({
      first_name: first_name.slice(0, 100),
      last_name: last_name.slice(0, 100),
      password: passwordRaw.slice(0, 128),
      organization: organization.slice(0, 200),
      department: department.slice(0, 200),
      notes: notes.slice(0, 2000),
      active: parseActive(activeRaw),
      group_name: group_name.slice(0, 80),
      username: usernameParsed.username,
    });
  });

  return { judges, errors, skippedEmptyRows };
}

/** Re-export shared file parsers for the dialog. */
export {
  detectCsvDelimiter,
  parseCsvText,
  recordsFromCsvMatrix,
  recordsFromSheetMatrix,
};
