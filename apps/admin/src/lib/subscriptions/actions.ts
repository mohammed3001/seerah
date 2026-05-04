"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentAdmin } from "../auth/current";
import { extractClientIp } from "../ip";
import { getServiceRoleClient } from "../supabase-admin";

import { getStripeOptional, isStripeConfigured } from "./stripe";

export interface ActionState {
  ok: boolean;
  message: string;
  /** Optional follow-up note (e.g. "Stripe call skipped because not configured"). */
  warning?: string;
}

const OK = (message: string, warning?: string): ActionState => ({
  ok: true,
  message,
  ...(warning !== undefined ? { warning } : {}),
});
const ERR = (message: string): ActionState => ({ ok: false, message });

type Role = "super_admin" | "support_agent" | "template_manager";

type RequireAdminResult =
  | { ok: false; error: ActionState }
  | {
      ok: true;
      ctx: NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;
      ip: string | null;
      userAgent: string | null;
    };

async function requireAdmin(
  allowed: Role[] = ["super_admin"],
): Promise<RequireAdminResult> {
  const ctx = await getCurrentAdmin();
  if (!ctx) redirect("/login");
  if (!allowed.includes(ctx.admin.role)) {
    return { ok: false, error: ERR("ليس لديك صلاحية لتنفيذ هذا الإجراء.") };
  }
  const hdrs = await headers();
  return {
    ok: true,
    ctx,
    ip: extractClientIp(hdrs),
    userAgent: hdrs.get("user-agent"),
  };
}

// ---------- 1. Grant Prime by email ---------------------------------------
//
// Lets the operator type a user email + expiry, no need to navigate to
// the user detail page first.  Reuses `admin_set_user_plan` (B1) which
// already handles the audit log + max_resumes recompute atomically.
const grantPrimeSchema = z.object({
  email: z.string().email("بريد غير صالح"),
  expiresAt: z
    .string()
    .min(1, "يرجى تحديد تاريخ انتهاء")
    .transform((s) => `${s}T23:59:59.999Z`),
});

export async function grantPrimeByEmail(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin"]);
  if (!guard.ok) return guard.error;

  const parsed = grantPrimeSchema.safeParse({
    email: formData.get("email"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "بيانات غير صالحة.";
    return ERR(first);
  }

  const supabase = getServiceRoleClient();
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, email, plan")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (profileErr) return ERR(`خطأ في البحث: ${profileErr.message}`);
  if (!profile) return ERR("لا يوجد مستخدم بهذا البريد.");

  const { error } = await supabase.rpc("admin_set_user_plan", {
    p_user_id: profile.id,
    p_plan: "prime",
    p_expires_at: parsed.data.expiresAt,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر منح برايم: ${error.message}`);

  revalidatePath("/subscriptions");
  revalidatePath(`/users/${profile.id}`);
  return OK(`تم منح برايم لـ ${profile.email} حتى ${formData.get("expiresAt")}.`);
}

// ---------- 2. Cancel a subscription --------------------------------------
//
// Two modes via the `atPeriodEnd` flag.  When true (the default), we
// flip `cancel_at_period_end=true` on Stripe so the customer keeps
// access until the period ends.  When false we cancel immediately.
// Either way the local DB row is updated in the same flow, then the
// webhook will eventually reconcile (idempotent).
const cancelSchema = z.object({
  subscriptionId: z.string().uuid(),
  atPeriodEnd: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export async function cancelSubscription(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin"]);
  if (!guard.ok) return guard.error;

  const parsed = cancelSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    atPeriodEnd: formData.get("atPeriodEnd"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const supabase = getServiceRoleClient();
  const { data: row, error: fetchErr } = await supabase
    .from("subscriptions")
    .select("id, stripe_subscription_id, provider, status")
    .eq("id", parsed.data.subscriptionId)
    .maybeSingle();
  if (fetchErr) return ERR(`خطأ: ${fetchErr.message}`);
  if (!row) return ERR("الاشتراك غير موجود.");

  let warning: string | undefined;

  if (row.provider === "stripe" && row.stripe_subscription_id) {
    const stripe = getStripeOptional();
    if (!stripe) {
      warning =
        "تم إلغاء الاشتراك في قاعدة البيانات فقط؛ مفتاح Stripe غير مهيّأ — يجب الإلغاء يدويًا في لوحة Stripe.";
    } else {
      try {
        if (parsed.data.atPeriodEnd) {
          await stripe.subscriptions.update(row.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
        } else {
          await stripe.subscriptions.cancel(row.stripe_subscription_id);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return ERR(`تعذّر الإلغاء على Stripe: ${msg}`);
      }
    }
  }

  const { error: rpcErr } = await supabase.rpc(
    "admin_cancel_subscription_local",
    {
      p_subscription_id: parsed.data.subscriptionId,
      p_at_period_end: parsed.data.atPeriodEnd,
      p_admin_id: guard.ctx.admin.id,
      p_admin_email: guard.ctx.admin.email,
      p_ip: guard.ip,
      p_user_agent: guard.userAgent,
    },
  );
  if (rpcErr) return ERR(`تعذّر تحديث الحالة محلّيًا: ${rpcErr.message}`);

  revalidatePath("/subscriptions");
  return OK(
    parsed.data.atPeriodEnd
      ? "سيُلغى الاشتراك في نهاية الفترة الحالية."
      : "تم إلغاء الاشتراك فورًا.",
    warning,
  );
}

// ---------- 3. Extend a subscription's period -----------------------------
//
// Pure DB update — does NOT call Stripe.  Stripe billing keeps charging
// per its own schedule; this is for compensating customers (e.g.
// outage credits) where we want the local plan-expiry trigger to keep
// premium access live a bit longer than Stripe's clock.
const extendSchema = z.object({
  subscriptionId: z.string().uuid(),
  newPeriodEnd: z
    .string()
    .min(1, "تاريخ الانتهاء الجديد مطلوب")
    .transform((s) => `${s}T23:59:59.999Z`),
});

export async function extendSubscription(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin(["super_admin"]);
  if (!guard.ok) return guard.error;

  const parsed = extendSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    newPeriodEnd: formData.get("newPeriodEnd"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "بيانات غير صالحة.";
    return ERR(first);
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_extend_subscription", {
    p_subscription_id: parsed.data.subscriptionId,
    p_new_period_end: parsed.data.newPeriodEnd,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر التمديد: ${error.message}`);

  revalidatePath("/subscriptions");
  return OK(
    isStripeConfigured()
      ? "تم تمديد فترة الاشتراك في قاعدة البيانات. ملاحظة: لم يُغيّر هذا فوترة Stripe — استخدم Stripe Dashboard إن كنت تريد إيقاف فاتورة قادمة."
      : "تم تمديد فترة الاشتراك.",
  );
}
