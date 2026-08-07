/**
 * Team CSV / Excel import helpers (safe for client + server).
 *
 * Template: one row per team, Member 1…N name/role/email columns.
 */

import {
  normalizeMemberRole,
  TEAM_DEPARTMENTS,
  TEAM_IMPORT_MAX_MEMBERS,
  type TeamDepartment,
  type TeamMemberRole,
} from "@/lib/teams/constants";

export const TEAM_IMPORT_BASE_HEADERS = [
  "Team #",
  "Table Number",
  "Project Name",
  "Official Title",
  "Department",
  "Description",
] as const;

export function teamImportMemberHeaders(maxMembers = TEAM_IMPORT_MAX_MEMBERS) {
  const headers: string[] = [];
  for (let i = 1; i <= maxMembers; i++) {
    headers.push(`Member ${i} Name`, `Member ${i} Role`, `Member ${i} Email`);
  }
  return headers;
}

export function teamImportHeaders(maxMembers = TEAM_IMPORT_MAX_MEMBERS) {
  return [...TEAM_IMPORT_BASE_HEADERS, ...teamImportMemberHeaders(maxMembers)];
}

/** Sample row for the downloadable template. */
export function teamImportSampleRow(maxMembers = TEAM_IMPORT_MAX_MEMBERS) {
  const base = [
    "T-01",
    "Table 1",
    "Experimental Launch Module (E.L.Mo)",
    "Experimental Launch Module",
    "MULTI",
    "Short abstract for judges (max 5000 chars).",
  ];
  const members = [
    "Ada Lovelace",
    "Team Lead",
    "ada@ucdenver.edu",
    "Alan Turing",
    "Member",
    "alan@ucdenver.edu",
  ];
  const pad = Math.max(0, maxMembers * 3 - members.length);
  return [...base, ...members, ...Array.from({ length: pad }, () => "")];
}

export function buildTeamImportTemplateCsv(
  maxMembers = TEAM_IMPORT_MAX_MEMBERS,
): string {
  const headers = teamImportHeaders(maxMembers);
  const sample = teamImportSampleRow(maxMembers);
  const escape = (cell: string) => {
    if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
    return cell;
  };
  return `${headers.map(escape).join(",")}\n${sample.map(escape).join(",")}\n`;
}

export type ImportedTeamMember = {
  student_name: string;
  role: TeamMemberRole;
  student_email: string;
};

export type ImportedTeam = {
  team_number: string;
  booth_location: string;
  team_name: string;
  project_title: string;
  category: string;
  project_description: string;
  members: ImportedTeamMember[];
};

export type TeamImportRowError = {
  row: number;
  message: string;
};

export type TeamImportParseResult = {
  teams: ImportedTeam[];
  errors: TeamImportRowError[];
  skippedEmptyRows: number;
};

const HEADER_ALIASES: Record<string, string> = {
  "team #": "Team #",
  "team#": "Team #",
  team: "Team #",
  team_number: "Team #",
  "team number": "Team #",
  "team no": "Team #",
  "team no.": "Team #",
  "table number": "Table Number",
  "table #": "Table Number",
  "table#": "Table Number",
  table: "Table Number",
  booth: "Table Number",
  booth_location: "Table Number",
  "project name": "Project Name",
  team_name: "Project Name",
  "official title": "Official Title",
  project_title: "Official Title",
  title: "Official Title",
  department: "Department",
  category: "Department",
  dept: "Department",
  description: "Description",
  abstract: "Description",
  "abstract / description": "Description",
  project_description: "Description",
};

function normalizeHeaderKey(raw: string): string {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  const lower = trimmed.toLowerCase().replace(/[_]+/g, " ");
  if (HEADER_ALIASES[lower]) return HEADER_ALIASES[lower]!;
  if (HEADER_ALIASES[trimmed.toLowerCase()]) {
    return HEADER_ALIASES[trimmed.toLowerCase()]!;
  }

  const memberMatch = lower.match(/^member\s*(\d+)\s*(name|role|email)$/);
  if (memberMatch) {
    const n = memberMatch[1];
    const kind = memberMatch[2]!;
    const label =
      kind === "name" ? "Name" : kind === "role" ? "Role" : "Email";
    return `Member ${n} ${label}`;
  }

  return trimmed;
}

function normalizeDepartment(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const match = TEAM_DEPARTMENTS.find(
    (d) => d.toLowerCase() === raw.toLowerCase(),
  );
  return match ?? raw;
}

function isAllowedDepartment(value: string): value is TeamDepartment {
  return (TEAM_DEPARTMENTS as readonly string[]).includes(value);
}

/** Normalize Excel quirks: "1.0" → "1", trim whitespace. */
export function normalizeTeamNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d+\.0+$/.test(trimmed)) {
    return trimmed.replace(/\.0+$/, "");
  }
  return trimmed;
}

/**
 * Detect CSV delimiter from the header line (comma vs semicolon).
 * Excel in some locales exports with `;`.
 */
export function detectCsvDelimiter(text: string): "," | ";" {
  const firstLine =
    text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .find((line) => line.trim().length > 0) ?? "";

  let commas = 0;
  let semis = 0;
  let inQuotes = false;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === ",") commas += 1;
    if (ch === ";") semis += 1;
  }
  return semis > commas ? ";" : ",";
}

/** Minimal RFC4180-ish CSV parse → rows of cells. */
export function parseCsvText(
  text: string,
  delimiter: "," | ";" = ",",
): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    const allEmpty = row.every((c) => c.trim() === "");
    if (allEmpty) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      pushCell();
      continue;
    }
    if (ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    cell += ch;
  }
  pushCell();
  if (row.length > 0 && !row.every((c) => c.trim() === "")) {
    pushRow();
  }
  return rows;
}

/** Raw matrix → records (headers trimmed only; callers apply their own aliases). */
export function recordsFromCsvMatrix(
  matrix: string[][],
): Record<string, string>[] {
  if (matrix.length === 0) return [];
  const headers = (matrix[0] ?? []).map((h) =>
    String(h ?? "")
      .replace(/^\uFEFF/, "")
      .trim(),
  );
  return matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (!header) return;
      // Keep first value if duplicate headers appear.
      if (record[header] != null && record[header] !== "") return;
      record[header] = String(cells[i] ?? "").trim();
    });
    return record;
  });
}

export function recordsFromObjectRows(
  rows: Array<Record<string, unknown>>,
): Record<string, string>[] {
  return rows.map((row) => {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const header = String(key ?? "")
        .replace(/^\uFEFF/, "")
        .trim();
      if (!header) continue;
      if (record[header] != null && record[header] !== "") continue;
      record[header] = value == null ? "" : String(value).trim();
    }
    return record;
  });
}

function normalizeTeamRecords(
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

/** Turn a sheet matrix (header + rows) into import records. */
export function recordsFromSheetMatrix(
  matrix: Array<Array<string | number | boolean | null | undefined>>,
): Record<string, string>[] {
  const asStrings = matrix.map((row) =>
    row.map((cell) => {
      if (cell == null) return "";
      if (typeof cell === "number" && Number.isFinite(cell)) {
        // Avoid "1.0" style noise from Excel serials when possible.
        if (Number.isInteger(cell)) return String(cell);
        const asInt = Math.round(cell);
        if (Math.abs(cell - asInt) < 1e-9) return String(asInt);
        return String(cell);
      }
      return String(cell).trim();
    }),
  );
  return recordsFromCsvMatrix(asStrings);
}

function get(record: Record<string, string>, key: string): string {
  return (record[key] ?? "").trim();
}

function parseMembersFromRecord(
  record: Record<string, string>,
  maxMembers = TEAM_IMPORT_MAX_MEMBERS,
): ImportedTeamMember[] {
  const members: ImportedTeamMember[] = [];
  for (let i = 1; i <= maxMembers; i++) {
    const student_name = get(record, `Member ${i} Name`);
    if (!student_name) continue;
    const email = get(record, `Member ${i} Email`);
    const role = normalizeMemberRole(
      get(record, `Member ${i} Role`) || "Member",
    );
    members.push({
      student_name: student_name.slice(0, 200),
      role,
      student_email: email.slice(0, 320),
    });
  }
  return members;
}

export function parseImportedTeamRecords(
  rawRecords: Record<string, string>[],
): TeamImportParseResult {
  const records = normalizeTeamRecords(rawRecords);
  const teams: ImportedTeam[] = [];
  const errors: TeamImportRowError[] = [];
  let skippedEmptyRows = 0;
  const seenNumbers = new Set<string>();

  records.forEach((record, index) => {
    const row = index + 2; // 1-based + header
    const team_number = normalizeTeamNumber(get(record, "Team #"));
    const project_title = get(record, "Official Title");
    const team_name = get(record, "Project Name");
    const booth_location = get(record, "Table Number");
    const categoryRaw = get(record, "Department");
    const category = normalizeDepartment(categoryRaw);
    const project_description = get(record, "Description");

    const isEmpty =
      !team_number &&
      !project_title &&
      !team_name &&
      !booth_location &&
      !categoryRaw &&
      !project_description;

    if (isEmpty) {
      skippedEmptyRows += 1;
      return;
    }

    if (!team_number) {
      errors.push({ row, message: "Team # is required." });
      return;
    }
    if (team_number.length > 40) {
      errors.push({ row, message: "Team # must be 40 characters or fewer." });
      return;
    }
    const numberKey = team_number.toLowerCase();
    if (seenNumbers.has(numberKey)) {
      errors.push({
        row,
        message: `Duplicate Team # "${team_number}" in file.`,
      });
      return;
    }
    seenNumbers.add(numberKey);

    const title = project_title || team_name;
    if (!title) {
      errors.push({
        row,
        message: "Official Title or Project Name is required.",
      });
      return;
    }

    if (category && !isAllowedDepartment(category)) {
      errors.push({
        row,
        message: `Department "${categoryRaw}" must be one of: ${TEAM_DEPARTMENTS.join(", ")}.`,
      });
      return;
    }

    teams.push({
      team_number,
      booth_location: booth_location.slice(0, 120),
      team_name: (team_name || title).slice(0, 200),
      project_title: title.slice(0, 300),
      category: category.slice(0, 120),
      project_description: project_description.slice(0, 5000),
      members: parseMembersFromRecord(record),
    });
  });

  return { teams, errors, skippedEmptyRows };
}
