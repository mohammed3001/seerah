"use client";

import { Checkbox, FloatingInput, Label, Textarea } from "@seerah/ui";

import { CharacterCounter } from "@/components/editor/character-counter";
import { DateTriad } from "@/components/editor/date-picker";
import { useEditor } from "@/components/editor/editor-context";
import { SectionHeader } from "@/components/editor/section-header";
import { SectionList } from "@/components/editor/section-list";
import { useSectionActions } from "@/components/editor/sections/use-section-actions";
import type { Tables } from "@seerah/types";

type Item = Tables<"projects">;
const DESC_MAX = 2000;

export function ProjectsSection() {
  const { editorLang } = useEditor();
  const actions = useSectionActions<"projects", Item>("projects", "projects", {
    name: null,
    url: null,
    is_current: false,
    description: null,
  });

  return (
    <section>
      <SectionHeader
        section="projects"
        title="المشاريع"
        description="أبرز مشاريعك العملية أو الشخصية"
      />
      <SectionList<Item>
        items={actions.items}
        onItemsChange={actions.setItems}
        onAdd={actions.onAdd}
        onPatch={actions.onPatch}
        onDelete={actions.onDelete}
        onReorder={actions.onReorder}
        addLabel="إضافة مشروع جديد"
        itemLabel={(item, idx) => item.name ?? `مشروع ${idx + 1}`}
        renderItem={({ item, patch }) => {
          const localized = ((item[editorLang as "ar" | "en"] as Record<string, string>) ?? {}) as {
            name?: string;
            description?: string;
          };
          function setLocalized(key: keyof typeof localized, value: string) {
            patch({ [editorLang]: { ...localized, [key]: value } } as Partial<Item>);
          }
          return (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FloatingInput
                  label={`اسم المشروع ${editorLang === "ar" ? "(عربي)" : "(English)"}`}
                  value={localized.name ?? ""}
                  onChange={(e) => setLocalized("name", e.target.value)}
                />
                <FloatingInput
                  label="رابط المشروع"
                  dir="ltr"
                  value={item.url ?? ""}
                  onChange={(e) => patch({ url: e.target.value } as Partial<Item>)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
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
                <span>مشروع جارٍ</span>
              </label>
              <div className="space-y-1.5">
                <Label>الوصف</Label>
                <Textarea
                  rows={4}
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
