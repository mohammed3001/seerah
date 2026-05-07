"use client";

import {
  Checkbox,
  FloatingInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@seerah/ui";

import { SectionHeader } from "@/components/editor/section-header";
import { SectionList } from "@/components/editor/section-list";
import { useSectionActions } from "@/components/editor/sections/use-section-actions";
import type { Tables } from "@seerah/types";

type Item = Tables<"languages">;

const FLUENCY: { value: NonNullable<Item["fluency"]>; label: string }[] = [
  { value: "beginner", label: "مبتدئ" },
  { value: "limited", label: "محدود" },
  { value: "professional", label: "احترافي" },
  { value: "full", label: "كامل" },
  { value: "native", label: "اللغة الأم" },
];

export function LanguagesSection() {
  const actions = useSectionActions<"languages", Item>("languages", "languages", {
    language_name: "",
    fluency: "professional" as Item["fluency"],
    is_sign_language: false,
  });

  return (
    <section>
      <SectionHeader
        section="languages"
        title="اللغات"
        description="اللغات التي تجيدها"
        showAi={false}
      />
      <SectionList<Item>
        items={actions.items}
        onItemsChange={actions.setItems}
        onAdd={actions.onAdd}
        onPatch={actions.onPatch}
        onDelete={actions.onDelete}
        onReorder={actions.onReorder}
        addLabel="إضافة لغة جديدة"
        itemLabel={(item, idx) => item.language_name || `لغة ${idx + 1}`}
        renderItem={({ item, patch }) => (
          <div className="space-y-4">
            <div className="grid gap-4 @md:grid-cols-[1fr_180px]">
              <FloatingInput
                label="اللغة"
                value={item.language_name}
                onChange={(e) => patch({ language_name: e.target.value } as Partial<Item>)}
              />
              <div className="space-y-1.5">
                <Label>المستوى</Label>
                <Select
                  value={item.fluency ?? ""}
                  onValueChange={(v) =>
                    patch({ fluency: (v || null) as Item["fluency"] } as Partial<Item>)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    {FLUENCY.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={item.is_sign_language}
                onCheckedChange={(v) => patch({ is_sign_language: Boolean(v) } as Partial<Item>)}
              />
              <span>لغة إشارة</span>
            </label>
          </div>
        )}
      />
    </section>
  );
}
