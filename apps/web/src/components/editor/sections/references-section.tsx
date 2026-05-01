"use client";

import { FloatingInput, Label, Textarea } from "@seerah/ui";

import { CharacterCounter } from "@/components/editor/character-counter";
import { CountrySelect } from "@/components/editor/country-select";
import { useEditor } from "@/components/editor/editor-context";
import { SectionHeader } from "@/components/editor/section-header";
import { SectionList } from "@/components/editor/section-list";
import { useSectionActions } from "@/components/editor/sections/use-section-actions";
import type { Tables } from "@seerah/types";

type Item = Tables<"references">;
const DESC_MAX = 500;

export function ReferencesSection() {
  const { editorLang } = useEditor();
  const actions = useSectionActions<"references", Item>("references", "references", {
    name: null,
    email: null,
    phone: null,
    description: null,
  });

  return (
    <section>
      <SectionHeader section="references" title="المراجع" description="أشخاص يمكنهم تزكيتك" />
      <SectionList<Item>
        items={actions.items}
        onItemsChange={actions.setItems}
        onAdd={actions.onAdd}
        onPatch={actions.onPatch}
        onDelete={actions.onDelete}
        onReorder={actions.onReorder}
        addLabel="إضافة مرجع جديد"
        itemLabel={(item, idx) => item.name ?? `مرجع ${idx + 1}`}
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
              <FloatingInput
                label={`الاسم ${editorLang === "ar" ? "(عربي)" : "(English)"}`}
                value={localized.name ?? ""}
                onChange={(e) => setLocalized("name", e.target.value)}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FloatingInput
                  label="البريد الإلكتروني"
                  type="email"
                  dir="ltr"
                  value={item.email ?? ""}
                  onChange={(e) => patch({ email: e.target.value } as Partial<Item>)}
                />
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <CountrySelect
                    value={item.phone_country_code ?? "+966"}
                    onChange={(v) => patch({ phone_country_code: v } as Partial<Item>)}
                    by="dial"
                    placeholder="مفتاح"
                  />
                  <FloatingInput
                    label="الهاتف"
                    dir="ltr"
                    value={item.phone ?? ""}
                    onChange={(e) => patch({ phone: e.target.value } as Partial<Item>)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>العلاقة المهنية</Label>
                <Textarea
                  rows={2}
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
