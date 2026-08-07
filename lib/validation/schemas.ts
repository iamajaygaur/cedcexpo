import { z } from "zod";

/** Shared Zod primitives — domain schemas expand in later phases. */

export const emailSchema = z.string().trim().email().max(320);

export const uuidSchema = z.string().uuid();

export const scoreSchema = z.number().finite().min(0);
