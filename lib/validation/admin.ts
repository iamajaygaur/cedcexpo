import { z } from "zod";

const GROUP_COLOR_KEYS = [
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
] as const;

export const eventStatusSchema = z.enum([
  "draft",
  "active",
  "completed",
  "archived",
]);

export const eventFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Name is required").max(200),
  semester: z.string().trim().min(1, "Semester is required").max(80),
  event_date: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  location: z.string().trim().max(200).default(""),
  status: eventStatusSchema.default("draft"),
  support_email: z
    .string()
    .trim()
    .email("Invalid support email")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  description: z.string().trim().max(5000).default(""),
  start_time: z.string().trim().max(20).default(""),
  end_time: z.string().trim().max(20).default(""),
  departments: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const teamFormSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  team_number: z.string().trim().min(1, "Team number is required").max(40),
  team_name: z.string().trim().max(200).default(""),
  project_title: z.string().trim().min(1, "Project title is required").max(300),
  project_description: z.string().trim().max(5000).default(""),
  category: z.string().trim().max(120).default(""),
  advisor: z.string().trim().max(200).default(""),
  booth_location: z.string().trim().max(120).default(""),
  members: z.string().trim().max(8000).optional(),
});

export const judgeFormSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Valid email required").max(320).optional(),
  password: z
    .string()
    .min(8, "Temporary password must be at least 8 characters")
    .max(128)
    .optional(),
  organization: z.string().trim().max(200).default(""),
  department: z.string().trim().max(200).default(""),
  notes: z.string().trim().max(2000).default(""),
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((v) => v !== "false" && v !== null),
  group_id: z.string().uuid().optional().or(z.literal("")),
  event_id: z.string().uuid().optional(),
});

export const groupFormSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  /** Optional — server always sets name from color_key. */
  name: z.string().trim().max(80).optional(),
  color_key: z.enum(GROUP_COLOR_KEYS),
  display_order: z.coerce.number().int().min(1).max(999).default(1),
});

export const groupMemberSchema = z.object({
  event_id: z.string().uuid(),
  group_id: z.string().uuid(),
  judge_id: z.string().uuid(),
});

export const assignmentSchema = z.object({
  event_id: z.string().uuid(),
  team_id: z.string().uuid(),
  /** Up to two color groups; empty = unassigned. */
  group_ids: z
    .array(z.string().uuid())
    .max(2, "A team can be assigned to at most two color groups"),
});

/** @deprecated Prefer assignmentSchema with group_ids */
export const assignmentSchemaLegacy = z.object({
  event_id: z.string().uuid(),
  team_id: z.string().uuid(),
  group_id: z.string().uuid().nullable(),
});

export const criterionFormSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  name: z.string().trim().min(2, "Name is required").max(200),
  description: z.string().trim().max(2000).default(""),
  category: z.string().trim().max(120).default(""),
  max_score: z.coerce.number().positive().max(1000),
  weight: z.coerce.number().positive().max(100).default(1),
  display_order: z.coerce.number().int().min(0).max(999).default(0),
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((v) => v !== "false" && v !== null),
  abet_codes: z.string().trim().max(200).optional(), // "1,2,3"
});

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const changeOwnPasswordSchema = z
  .object({
    current_password: passwordField,
    new_password: passwordField,
    confirm_password: passwordField,
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: "New passwords do not match",
    path: ["confirm_password"],
  })
  .refine((v) => v.current_password !== v.new_password, {
    message: "New password must be different from the current password",
    path: ["new_password"],
  });

export const setJudgePasswordSchema = z
  .object({
    id: z.string().uuid(),
    new_password: passwordField,
    confirm_password: passwordField,
  })
  .refine((v) => v.new_password === v.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
