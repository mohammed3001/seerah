"use client";

import { Pencil, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  updateTemplateMetadata,
  type ActionState,
} from "@/lib/templates/actions";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS_AR,
  type AdminTemplateRow,
} from "@/lib/templates/types";

import { ActionFeedback } from "./action-feedback";
import { TemplateImageUpload } from "./image-upload";

interface EditTemplateModalProps {
  template: AdminTemplateRow;
}

export function EditTemplateModal({ template }: EditTemplateModalProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionState | undefined,
    FormData
  >(updateTemplateMetadata, undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        title="تعديل البيانات الوصفية"
      >
        <Pencil className="h-3 w-3" />
        تعديل
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                تعديل القالب — {template.name_ar ?? template.name}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="templateId" value={template.id} />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    الاسم (عربي)
                  </label>
                  <input
                    name="nameAr"
                    defaultValue={template.name_ar ?? ""}
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
                    defaultValue={template.name}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  الوصف (عربي)
                </label>
                <textarea
                  name="descriptionAr"
                  defaultValue={template.description_ar ?? ""}
                  rows={2}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  الوصف (إنجليزي)
                </label>
                <textarea
                  name="descriptionEn"
                  defaultValue={template.description_en ?? ""}
                  rows={2}
                  dir="ltr"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    الفئة
                  </label>
                  <select
                    name="category"
                    defaultValue={
                      TEMPLATE_CATEGORIES.includes(
                        template.category as (typeof TEMPLATE_CATEGORIES)[number],
                      )
                        ? template.category
                        : "modern"
                    }
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
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    الوسوم (مفصولة بفواصل)
                  </label>
                  <input
                    name="tags"
                    defaultValue={(template.tags ?? []).join(", ")}
                    placeholder="مثال: تنفيذي, داكن, عمودين"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <TemplateImageUpload
                  templateId={template.id}
                  kind="thumbnail"
                  fieldName="thumbnailUrl"
                  defaultValue={template.thumbnail_url ?? ""}
                  label="الصورة المصغّرة"
                />
                <TemplateImageUpload
                  templateId={template.id}
                  kind="preview"
                  fieldName="previewUrl"
                  defaultValue={template.preview_url ?? ""}
                  label="صورة المعاينة (كاملة)"
                />
              </div>

              <ActionFeedback state={state} />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
                >
                  {pending ? "جاري الحفظ…" : "حفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
