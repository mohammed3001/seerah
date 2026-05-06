"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { createTemplate, type ActionState } from "@/lib/templates/actions";
import { TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABELS_AR } from "@/lib/templates/types";

import { ActionFeedback } from "./action-feedback";
import { TemplateImageUpload } from "./image-upload";

/**
 * "Add new template" modal.  We require the admin to set the template id
 * (which must match the React component name in apps/web/src/templates)
 * before they can upload images, because uploads are bucket-scoped by
 * template id.  Once the id is locked, both image upload controls become
 * active; on success the metadata + image URLs are committed in a single
 * call to admin_create_template.
 *
 * The body is split into a dedicated `<CreateTemplateModalBody>` child so
 * that closing the modal unmounts it — that drops the useActionState
 * hook with it, so reopening starts from an empty form with no stale
 * success banner or pending flag from the previous session.
 */
export function CreateTemplateModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5" />
        قالب جديد
      </button>
      {open ? <CreateTemplateModalBody onClose={() => setOpen(false)} /> : null}
    </>
  );
}

interface CreateTemplateModalBodyProps {
  onClose: () => void;
}

function CreateTemplateModalBody({ onClose }: CreateTemplateModalBodyProps) {
  const [draftId, setDraftId] = useState("");
  const [committedId, setCommittedId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createTemplate,
    undefined,
  );

  // Auto-close on success.  Because this whole component unmounts on
  // close, there's no stale-state problem on the next reopen — fresh
  // mount means fresh useActionState.
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 800);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  const idValid = /^[a-z0-9_]{3,64}$/.test(draftId);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">إضافة قالب جديد</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              معرّف القالب (يطابق اسم الكومبوننت في الكود)
            </label>
            <div className="flex items-stretch gap-2">
              <input
                name="id"
                value={committedId ?? draftId}
                onChange={(e) =>
                  setDraftId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
                }
                placeholder="مثال: template_modern_blue"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm shadow-sm"
                dir="ltr"
                required
                readOnly={committedId !== null}
              />
              {committedId === null ? (
                <button
                  type="button"
                  onClick={() => setCommittedId(draftId)}
                  disabled={!idValid}
                  className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  تثبيت المعرّف
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCommittedId(null)}
                  className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  تغيير
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              أحرف صغيرة وأرقام وشرطة سفلية فقط (٣–٦٤). يتم تثبيته قبل رفع الصور.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">الاسم (عربي)</label>
              <input
                name="nameAr"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                الاسم (إنجليزي)
              </label>
              <input
                name="name"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">الوصف (عربي)</label>
            <textarea
              name="descriptionAr"
              rows={2}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">الوصف (إنجليزي)</label>
            <textarea
              name="descriptionEn"
              rows={2}
              dir="ltr"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">الفئة</label>
              <select
                name="category"
                defaultValue="modern"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {TEMPLATE_CATEGORY_LABELS_AR[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">التسعير</label>
              <select
                name="isPremium"
                defaultValue="false"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="false">مجاني</option>
                <option value="true">مدفوع</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                الوسوم (مفصولة بفواصل)
              </label>
              <input
                name="tags"
                placeholder="تنفيذي, داكن"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          {committedId ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TemplateImageUpload
                templateId={committedId}
                kind="thumbnail"
                fieldName="thumbnailUrl"
                defaultValue=""
                label="الصورة المصغّرة"
              />
              <TemplateImageUpload
                templateId={committedId}
                kind="preview"
                fieldName="previewUrl"
                defaultValue=""
                label="صورة المعاينة (كاملة)"
              />
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500">
              ثبّت معرّف القالب أعلاه أوّلًا لرفع الصور.
            </p>
          )}

          <ActionFeedback state={state} />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={pending || committedId === null}
              className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            >
              {pending ? "جاري الإنشاء…" : "إنشاء"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
