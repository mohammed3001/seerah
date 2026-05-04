"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentAdmin } from "../auth/current";
import { extractClientIp } from "../ip";
import { getServiceRoleClient } from "../supabase-admin";

import { notifyReply, notifyResolve } from "./email";

export interface ActionState {
  ok: boolean;
  message: string;
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
  allowed: Role[] = ["super_admin", "support_agent"],
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

// ---------- 1. Reply (or add internal note) -------------------------------

const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z
    .string()
    .min(1, "الرسالة فارغة")
    .max(8000, "الرسالة طويلة جدًا (الحدّ ٨٠٠٠ حرفًا)"),
  isInternal: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
});

export async function replyToTicket(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = replySchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
    isInternal: formData.get("isInternal"),
    attachmentUrl: formData.get("attachmentUrl"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "بيانات غير صالحة.";
    return ERR(first);
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_support_reply", {
    p_ticket_id: parsed.data.ticketId,
    p_body: parsed.data.body,
    p_is_internal: parsed.data.isInternal,
    p_attachment_url: parsed.data.attachmentUrl || null,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر حفظ الردّ: ${error.message}`);

  let warning: string | undefined;
  if (!parsed.data.isInternal) {
    const outcome = await notifyReply({
      ticketId: parsed.data.ticketId,
      body: parsed.data.body,
    });
    if (!outcome.sent) {
      warning = `الردّ مُسجَّل، لكن البريد لم يُرسَل: ${outcome.reason}`;
    }
  }

  revalidatePath(`/support/${parsed.data.ticketId}`);
  revalidatePath("/support");
  return OK(
    parsed.data.isInternal ? "تم حفظ الملاحظة الداخلية." : "تم إرسال الردّ.",
    warning,
  );
}

// ---------- 2. Change status ----------------------------------------------

const statusValues = ["open", "in_progress", "resolved", "closed"] as const;
const changeStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(statusValues),
  resolutionNote: z.string().max(2000).optional().or(z.literal("")),
});

export async function changeTicketStatus(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = changeStatusSchema.safeParse({
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
    resolutionNote: formData.get("resolutionNote"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "بيانات غير صالحة.";
    return ERR(first);
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_support_change_status", {
    p_ticket_id: parsed.data.ticketId,
    p_status: parsed.data.status,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر تحديث الحالة: ${error.message}`);

  let warning: string | undefined;
  if (parsed.data.status === "resolved") {
    const outcome = await notifyResolve({
      ticketId: parsed.data.ticketId,
      resolution: parsed.data.resolutionNote || null,
    });
    if (!outcome.sent) {
      warning = `الحالة مُحدَّثة، لكن بريد الحلّ لم يُرسَل: ${outcome.reason}`;
    }
  }

  revalidatePath(`/support/${parsed.data.ticketId}`);
  revalidatePath("/support");
  return OK("تم تحديث الحالة.", warning);
}

// ---------- 3. Assign ------------------------------------------------------

const assignSchema = z.object({
  ticketId: z.string().uuid(),
  assignee: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .pipe(z.string().uuid().nullable()),
});

export async function assignTicket(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = assignSchema.safeParse({
    ticketId: formData.get("ticketId"),
    assignee: formData.get("assignee"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "بيانات غير صالحة.";
    return ERR(first);
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_support_assign", {
    p_ticket_id: parsed.data.ticketId,
    p_assignee: parsed.data.assignee,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر التعيين: ${error.message}`);

  revalidatePath(`/support/${parsed.data.ticketId}`);
  revalidatePath("/support");
  return OK(parsed.data.assignee ? "تم تعيين التذكرة." : "تم إلغاء التعيين.");
}

// ---------- 4. Set priority ------------------------------------------------

const priorityValues = ["low", "normal", "high", "urgent"] as const;
const priorityLabels: Record<(typeof priorityValues)[number], string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "مرتفعة",
  urgent: "عاجلة",
};

const setPrioritySchema = z.object({
  ticketId: z.string().uuid(),
  priority: z.enum(priorityValues),
});

export async function setTicketPriority(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = setPrioritySchema.safeParse({
    ticketId: formData.get("ticketId"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) return ERR("بيانات غير صالحة.");

  const supabase = getServiceRoleClient();
  const { error } = await supabase.rpc("admin_support_set_priority", {
    p_ticket_id: parsed.data.ticketId,
    p_priority: parsed.data.priority,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر تحديث الأولوية: ${error.message}`);

  revalidatePath(`/support/${parsed.data.ticketId}`);
  revalidatePath("/support");
  return OK(`تم تحديث الأولوية إلى "${priorityLabels[parsed.data.priority]}".`);
}

// ---------- 5. Bulk resolve / change status -------------------------------

const bulkStatusSchema = z.object({
  ticketIds: z
    .string()
    .min(1, "اختر تذاكر أولًا")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.string().uuid()).min(1)),
  status: z.enum(statusValues),
});

export async function bulkChangeTicketStatus(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = bulkStatusSchema.safeParse({
    ticketIds: formData.get("ticketIds"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "بيانات غير صالحة.";
    return ERR(first);
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_support_bulk_status", {
    p_ticket_ids: parsed.data.ticketIds,
    p_status: parsed.data.status,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر التحديث الجماعي: ${error.message}`);

  // Send resolve emails for each ticket — best effort, sequential to
  // avoid hammering Resend.  We don't fail the whole action if one
  // email fails; we just report a warning.
  let emailFailures = 0;
  if (parsed.data.status === "resolved") {
    for (const id of parsed.data.ticketIds) {
      const outcome = await notifyResolve({ ticketId: id });
      if (!outcome.sent) emailFailures += 1;
    }
  }

  revalidatePath("/support");
  for (const id of parsed.data.ticketIds) {
    revalidatePath(`/support/${id}`);
  }

  const warning =
    emailFailures > 0
      ? `حُدّثت ${data ?? 0} تذكرة، لكن ${emailFailures} بريد لم يُرسَل.`
      : undefined;
  return OK(`حُدّثت ${data ?? 0} تذكرة.`, warning);
}

// ---------- 6. Bulk assign ------------------------------------------------

const bulkAssignSchema = z.object({
  ticketIds: z
    .string()
    .min(1, "اختر تذاكر أولًا")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.string().uuid()).min(1)),
  assignee: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .pipe(z.string().uuid().nullable()),
});

export async function bulkAssignTickets(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = bulkAssignSchema.safeParse({
    ticketIds: formData.get("ticketIds"),
    assignee: formData.get("assignee"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "بيانات غير صالحة.";
    return ERR(first);
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.rpc("admin_support_bulk_assign", {
    p_ticket_ids: parsed.data.ticketIds,
    p_assignee: parsed.data.assignee,
    p_admin_id: guard.ctx.admin.id,
    p_admin_email: guard.ctx.admin.email,
    p_ip: guard.ip,
    p_user_agent: guard.userAgent,
  });
  if (error) return ERR(`تعذّر التعيين الجماعي: ${error.message}`);

  revalidatePath("/support");
  for (const id of parsed.data.ticketIds) {
    revalidatePath(`/support/${id}`);
  }
  return OK(
    parsed.data.assignee
      ? `عُيّنت ${data ?? 0} تذكرة.`
      : `أُلغِي تعيين ${data ?? 0} تذكرة.`,
  );
}

// ---------- 7. Update internal admin notes (free text on the ticket row) --

const updateNotesSchema = z.object({
  ticketId: z.string().uuid(),
  notes: z
    .string()
    .max(8000, "النص طويل جدًا (الحدّ ٨٠٠٠ حرفًا)")
    .or(z.literal("")),
});

export async function updateTicketAdminNotes(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.error;

  const parsed = updateNotesSchema.safeParse({
    ticketId: formData.get("ticketId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0]?.message ?? "بيانات غير صالحة.";
    return ERR(first);
  }

  const supabase = getServiceRoleClient();
  // Direct UPDATE here (not a dedicated RPC) — admin_notes is a
  // free-text scratchpad with no business logic, so the audit log
  // entry is enough.  We still log it explicitly because the row-level
  // updated_at trigger doesn't tell us *who* made the edit.
  const { error: updateErr } = await supabase
    .from("support_tickets")
    .update({
      admin_notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.ticketId);
  if (updateErr) return ERR(`تعذّر حفظ الملاحظات: ${updateErr.message}`);

  await supabase.from("admin_audit_log").insert({
    admin_id: guard.ctx.admin.id,
    admin_email: guard.ctx.admin.email,
    action: "admin.support.notes_updated",
    target_type: "ticket",
    target_id: parsed.data.ticketId,
    metadata: { length: parsed.data.notes.length },
    ip: guard.ip,
    user_agent: guard.userAgent,
  });

  revalidatePath(`/support/${parsed.data.ticketId}`);
  return OK("تم حفظ الملاحظات الداخلية.");
}
