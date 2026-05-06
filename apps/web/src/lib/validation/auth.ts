import { z } from "zod";

import { COMMON_PASSWORDS, MIN_PASSWORD_LENGTH, validatePassword } from "@seerah/api/security";

export const loginSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("صيغة البريد الإلكتروني غير صحيحة"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Builds a zod string schema enforcing the shared password policy.
 *
 * The policy is implemented by `validatePassword` in `@seerah/api/security`
 * so the same checks run on the client (for instant feedback in the
 * registration / reset-password forms) and on the server (in the
 * `signupAction` / `resetPasswordAction` server actions, where the
 * decision is authoritative).
 */
function passwordSchema() {
  return z.string().superRefine((value, ctx) => {
    for (const err of validatePassword(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err.messageAr,
      });
    }
  });
}

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "الاسم الكامل مطلوب"),
    email: z.string().min(1, "البريد الإلكتروني مطلوب").email("صيغة البريد الإلكتروني غير صحيحة"),
    password: passwordSchema(),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: "يجب الموافقة على الشروط والأحكام",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "كلمتا المرور غير متطابقتين",
      });
    }
    // Once we have the email, repeat the policy check with email
    // context so we catch `password === email` / local-part variants
    // before the form is submitted.
    for (const err of validatePassword(data.password, { email: data.email })) {
      // Only surface the additional error introduced by the email check —
      // the base policy errors are already reported by passwordSchema().
      if (err.code === "looks_like_email") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: err.messageAr,
        });
      }
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("صيغة البريد الإلكتروني غير صحيحة"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema(),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Pure password-strength scorer. Returns a 0..4 score and an Arabic label.
 *
 * The policy gate (`validatePassword`) is binary; this function gives
 * the strength meter something more granular to render so users know
 * whether they have built headroom above the floor.
 */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  // A password that fails the gate (or is in the common list) is always
  // "very weak" regardless of formal complexity, so we don't reward
  // length on `password123`.
  const lower = password.toLowerCase();
  const stripped = lower.replace(/\d+$/, "");
  if (COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(stripped)) {
    return { score: 0, label: "ضعيفة جدًا" };
  }
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) && password.length >= 12) score++;

  const labels = ["ضعيفة جدًا", "ضعيفة", "متوسطة", "قوية", "ممتازة"] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score]! };
}
