/** Shared team form / import constants. */

export const TEAM_DEPARTMENTS = [
  "BME",
  "CE/CEM",
  "CM",
  "CS",
  "CY",
  "EE",
  "ME",
  "MULTI",
] as const;

export type TeamDepartment = (typeof TEAM_DEPARTMENTS)[number];

export const TEAM_MEMBER_ROLES = ["Team Lead", "Member"] as const;

export type TeamMemberRole = (typeof TEAM_MEMBER_ROLES)[number];

/** Max roster columns in the import template (Member 1 … Member N). */
export const TEAM_IMPORT_MAX_MEMBERS = 8;

export function isTeamDepartment(value: string): value is TeamDepartment {
  return (TEAM_DEPARTMENTS as readonly string[]).includes(value);
}

export function normalizeMemberRole(value: string): TeamMemberRole {
  const v = value.trim().toLowerCase();
  if (v === "team lead" || v === "lead" || v === "leader") return "Team Lead";
  return "Member";
}
