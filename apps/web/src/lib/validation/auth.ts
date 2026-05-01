import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("صيغة البريد الإلكتروني غير صحيحة"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "الاسم الكامل مطلوب"),
    email: z.string().min(1, "البريد الإلكتروني مطلوب").email("صيغة البريد الإلكتروني غير صحيحة"),
    password: z
      .string()
      .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير على الأقل")
      .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير على الأقل")
      .regex(/[0-9]/, "يجب أن تحتوي على رقم على الأقل"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: "يجب الموافقة على الشروط والأحكام",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "البريد الإلكتروني مطلوب").email("صيغة البريد الإلكتروني غير صحيحة"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
      .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير على الأقل")
      .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير على الأقل")
      .regex(/[0-9]/, "يجب أن تحتوي على رقم على الأقل"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Pure password-strength scorer. Returns a 0..4 score and an Arabic label.
 */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) && password.length >= 12) score++;

  const labels = ["ضعيفة جدًا", "ضعيفة", "متوسطة", "قوية", "ممتازة"] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score]! };
}
