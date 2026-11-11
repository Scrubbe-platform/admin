import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Enter your email.").email("That is not a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const mfaCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export type MfaCodeValues = z.infer<typeof mfaCodeSchema>;
