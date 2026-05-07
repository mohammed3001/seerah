"use client";

import { FloatingInput, Label, Textarea } from "@seerah/ui";

import { CharacterCounter } from "@/components/editor/character-counter";
import { DateTriad } from "@/components/editor/date-picker";
import { useEditor } from "@/components/editor/editor-context";
import { SectionHeader } from "@/components/editor/section-header";
import { SectionList } from "@/components/editor/section-list";
import { useSectionActions } from "@/components/editor/sections/use-section-actions";
import type { Tables } from "@seerah/types";

type Item = Tables<"education">;
const DESC_MAX = 1500;

export function EducationSection() {
  const { editorLang } = useEditor();
  const actions = useSectionActions<"education", Item>("education", "education", {
    institution: null,
    degree: null,
    field_of_study: null,
    description: null,
  });

  return (
    <section>
      <SectionHeader
        section="education"
        title="المؤهلات العلمية"
        description="رتب مؤهلاتك من الأحدث إلى الأقدم"
      />
      <SectionList<Item>
        items={actions.items}
        onItemsChange={actions.setItems}
        onAdd={actions.onAdd}
        onPatch={actions.onPatch}
        onDelete={actions.onDelete}
        onReorder={actions.onReorder}
        addLabel="إضافة مؤهل علمي جديد"
        itemLabel={(item, idx) => item.degree ?? item.institution ?? `مؤهل ${idx + 1}`}
        renderItem={({ item, patch }) => {
          const localized = ((item[editorLang as "ar" | "en"] as Record<string, string>) ?? {}) as {
            institution?: string;
            degree?: string;
            field_of_study?: string;
            description?: string;
          };
          function setLocalized(key: keyof typeof localized, value: string) {
            const next = { ...localized, [key]: value };
            patch({ [editorLang]: next } as Partial<Item>);
          }
          return (
            <div className="space-y-4">
              <div className="grid gap-4 @xl:grid-cols-2">
                <FloatingInput
                  label={`الجامعة/المؤسسة ${editorLang === "ar" ? "(عربي)" : "(English)"}`}
                  value={localized.institution ?? ""}
                  onChange={(e) => setLocalized("institution", e.target.value)}
                />
                <FloatingInput
                  label={`الدرجة العلمية ${editorLang === "ar" ? "(عربي)" : "(English)"}`}
                  value={localized.degree ?? ""}
                  onChange={(e) => setLocalized("degree", e.target.value)}
                />
              </div>
              <FloatingInput
                label={`التخصص ${editorLang === "ar" ? "(عربي)" : "(English)"}`}
                value={localized.field_of_study ?? ""}
                onChange={(e) => setLocalized("field_of_study", e.target.value)}
              />
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
                    onChange={(v) => patch({ end_date: v } as Partial<Item>)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>الوصف</Label>
                <Textarea
                  rows={3}
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
