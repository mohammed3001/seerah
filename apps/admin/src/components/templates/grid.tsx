import { Image as ImageIcon } from "lucide-react";

import {
  TEMPLATE_CATEGORY_LABELS_AR,
  type AdminTemplateRow,
  type TemplateCategory,
} from "@/lib/templates/types";
import { cn } from "@/lib/utils/cn";

import { ActiveToggle } from "./active-toggle";
import { DeleteTemplateButton } from "./delete-template-button";
import { EditTemplateModal } from "./edit-template-modal";
import { PricingToggle } from "./pricing-toggle";
import { ReorderButtons } from "./reorder-buttons";

interface TemplatesGridProps {
  templates: AdminTemplateRow[];
  /** When false, destructive actions (delete, create) are hidden. */
  canDelete: boolean;
}

function formatDate(input: string): string {
  try {
    return new Intl.DateTimeFormat("ar", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(input));
  } catch {
    return input;
  }
}

export function TemplatesGrid({ templates, canDelete }: TemplatesGridProps) {
  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        لا توجد قوالب بعد. أضف أول قالب من الزر أعلاه.
      </div>
    );
  }

  const orderedIds = templates.map((t) => t.id);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((tpl) => {
        const categoryLabel =
          TEMPLATE_CATEGORY_LABELS_AR[tpl.category as TemplateCategory] ?? tpl.category;
        return (
          <article
            key={tpl.id}
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
              !tpl.is_active && "opacity-75",
            )}
          >
            <div className="relative h-40 w-full bg-slate-100">
              {tpl.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- public bucket URL, may be from any host
                <img
                  src={tpl.thumbnail_url}
                  alt={tpl.name_ar ?? tpl.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
              <div className="absolute end-2 top-2 flex gap-1">
                <PricingToggle templateId={tpl.id} isPremium={tpl.is_premium} />
                <ActiveToggle templateId={tpl.id} isActive={tpl.is_active} />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {tpl.name_ar ?? tpl.name}
                  </h3>
                  <p className="truncate text-[11px] text-slate-500" dir="ltr" title={tpl.id}>
                    {tpl.name} • {tpl.id}
                  </p>
                </div>
                <ReorderButtons templateId={tpl.id} orderedIds={orderedIds} />
              </div>

              {tpl.description_ar ? (
                <p className="line-clamp-2 text-xs text-slate-600">{tpl.description_ar}</p>
              ) : null}

              <div className="mt-auto flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5">{categoryLabel}</span>
                <span>الترتيب: {tpl.sort_order}</span>
                <span>•</span>
                <span>{tpl.usage_count} سيرة</span>
                <span>•</span>
                <span>{formatDate(tpl.created_at)}</span>
              </div>

              {tpl.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {tpl.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-1 flex items-center gap-2 border-t border-slate-100 pt-2">
                <EditTemplateModal template={tpl} />
                {canDelete ? (
                  <DeleteTemplateButton
                    templateId={tpl.id}
                    templateLabel={tpl.name_ar ?? tpl.name}
                    usageCount={tpl.usage_count}
                  />
                ) : null}
                {tpl.preview_url ? (
                  <a
                    href={tpl.preview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ms-auto text-xs text-slate-500 hover:text-slate-700"
                  >
                    معاينة
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
