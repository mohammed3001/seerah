import { format } from "date-fns";
import { Calendar, Crown, Mail, Ticket, User } from "lucide-react";
import Link from "next/link";

import type { TicketDetail } from "@/lib/support/types";

interface UserSidebarProps {
  profile: TicketDetail["user_profile"];
}

function safeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "yyyy-MM-dd");
}

const PLAN_LABELS_AR: Record<string, string> = {
  free: "مجاني",
  prime: "برايم",
};

export function UserSidebar({ profile }: UserSidebarProps) {
  if (!profile.id) {
    return (
      <aside className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
        المستخدم محذوف — لا توجد معلومات حساب لعرضها.
      </aside>
    );
  }

  const planLabel = profile.plan ? (PLAN_LABELS_AR[profile.plan] ?? profile.plan) : "—";

  return (
    <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">المستخدم</h2>
        <Link href={`/users/${profile.id}`} className="text-[11px] text-slate-500 hover:underline">
          فتح الملف
        </Link>
      </header>

      <dl className="space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <User className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
          <div>
            <dt className="text-[11px] text-slate-500">الاسم</dt>
            <dd className="font-medium text-slate-900">{profile.full_name ?? "—"}</dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Mail className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
          <div>
            <dt className="text-[11px] text-slate-500">البريد</dt>
            <dd className="font-medium text-slate-700" dir="ltr">
              {profile.email || "—"}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Crown className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
          <div>
            <dt className="text-[11px] text-slate-500">الخطة</dt>
            <dd className="font-medium text-slate-700">
              {planLabel}
              {profile.plan_expires_at ? (
                <span className="text-[11px] text-slate-500">
                  {" "}
                  (تنتهي {safeDate(profile.plan_expires_at)})
                </span>
              ) : null}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
          <div>
            <dt className="text-[11px] text-slate-500">تاريخ التسجيل</dt>
            <dd className="font-medium text-slate-700" dir="ltr">
              {safeDate(profile.created_at)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Ticket className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
          <div>
            <dt className="text-[11px] text-slate-500">إجمالي التذاكر</dt>
            <dd className="font-medium text-slate-700">
              {profile.total_tickets.toLocaleString("ar-SA")}
            </dd>
          </div>
        </div>
      </dl>
    </aside>
  );
}
