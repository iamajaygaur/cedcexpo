import { z } from "zod";

import { parseLoginUsername } from "@/lib/auth/username";
import { emailSchema } from "@/lib/validation/schemas";

const usernameOrEmailSchema = z
  .string()
  .trim()
  .min(3, "Enter your username or email.")
  .max(320)
  .superRefine((value, ctx) => {
    if (value.includes("@")) {
      const email = emailSchema.safeParse(value);
      if (!email.success) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid email address.",
        });
      }
      return;
    }
    const parsed = parseLoginUsername(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: parsed.message });
    }
  });

export const loginSchema = z.object({
  username: usernameOrEmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  remember: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;
