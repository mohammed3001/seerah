"use client";

import { Checkbox, FloatingInput, Label, Textarea } from "@seerah/ui";

import { CharacterCounter } from "@/components/editor/character-counter";
import { DateTriad } from "@/components/editor/date-picker";
import { useEditor } from "@/components/editor/editor-context";
import { SectionHeader } from "@/components/editor/section-header";
import { SectionList } from "@/components/editor/section-list";
import { useSectionActions } from "@/components/editor/sections/use-section-actions";
import type { Tables } from "@seerah/types";

type Item = Tables<"experience">;
const DESC_MAX = 2500;

export function ExperienceSection() {
  const { editorLang } = useEditor();
  const actions = useSectionActions<"experience", Item>("experience", "experience", {
    company: null,
    job_title: null,
    is_current: false,
    description: null,
  });

  return (
    <section>
      <SectionHeader
        section="experience"
        title="الخبرة العملية"
        description="أبرز إنجازاتك ومسؤولياتك في كل وظيفة"
      />
      <SectionList<Item>
        items={actions.items}
        onItemsChange={actions.setItems}
        onAdd={actions.onAdd}
        onPatch={actions.onPatch}
        onDelete={actions.onDelete}
        onReorder={actions.onReorder}
        addLabel="إضافة خبرة جديدة"
        itemLabel={(item, idx) => item.job_title ?? item.company ?? `وظيفة ${idx + 1}`}
        renderItem={({ item, patch }) => {
          const localized = ((item[editorLang as "ar" | "en"] as Record<string, string>) ?? {}) as {
            company?: string;
            job_title?: string;
            description?: string;
          };
          function setLocalized(key: keyof typeof localized, value: string) {
            patch({ [editorLang]: { ...localized, [key]: value } } as Partial<Item>);
          }
          return (
            <div className="space-y-4">
              <div className="grid gap-4 @xl:grid-cols-2">
                <FloatingInput
                  label={`الشركة ${editorLang === "ar" ? "(عربي)" : "(English)"}`}
                  value={localized.company ?? ""}
                  onChange={(e) => setLocalized("company", e.target.value)}
                />
                <FloatingInput
                  label={`المسمى الوظيفي ${editorLang === "ar" ? "(عربي)" : "(English)"}`}
                  value={localized.job_title ?? ""}
                  onChange={(e) => setLocalized("job_title", e.target.value)}
                />
              </div>
              <div className="grid gap-4 @xl:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>تاريخ البداية</Label>
                  <DateTriad
                    value={item.start_date}
                    onChange={(v) => patch({ start_date: v } as Partial<Item>)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ الانتهاء</Label>
                  <DateTriad
                    value={item.end_date}
                    disabled={item.is_current}
                    onChange={(v) => patch({ end_date: v } as Partial<Item>)}
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox
                  checked={item.is_current}
                  onCheckedChange={(v) => patch({ is_current: Boolean(v) } as Partial<Item>)}
                />
                <span>أعمل هنا حاليًا</span>
              </label>
              <div className="space-y-1.5">
                <Label>المهام والإنجازات</Label>
                <Textarea
                  rows={5}
                  maxLength={DESC_MAX}
                  value={localized.description ?? ""}
                  onChange={(e) => setLocalized("description", e.target.value)}
                />
                <CharacterCounter value={localized.description ?? ""} max={DESC_MAX} />
              </div>
            </div>
          );
        }}
      />
    </section>
  );
}
