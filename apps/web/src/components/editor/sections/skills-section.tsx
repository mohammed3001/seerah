"use client";

import { FloatingInput, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@seerah/ui";

import { SectionHeader } from "@/components/editor/section-header";
import { SectionList } from "@/components/editor/section-list";
import { useSectionActions } from "@/components/editor/sections/use-section-actions";
import type { Tables } from "@seerah/types";

type Item = Tables<"skills">;

const SKILL_LEVELS: { value: NonNullable<Item["level"]>; label: string }[] = [
  { value: "beginner", label: "مبتدئ" },
  { value: "intermediate", label: "متوسط" },
  { value: "good", label: "جيد" },
  { value: "advanced", label: "متقدم" },
  { value: "expert", label: "خبير" },
];

export function SkillsSection() {
  const actions = useSectionActions<"skills", Item>("skills", "skills", {
    name: "",
    level: "intermediate" as Item["level"],
  });

  return (
    <section>
      <SectionHeader
        section="skills"
        title="المهارات"
        description="أضف مهاراتك الأساسية وحدد مستوى إتقانك"
        showAi
      />
      <SectionList<Item>
        items={actions.items}
        onItemsChange={actions.setItems}
        onAdd={actions.onAdd}
        onPatch={actions.onPatch}
        onDelete={actions.onDelete}
        onReorder={actions.onReorder}
        addLabel="إضافة مهارة جديدة"
        itemLabel={(item, idx) => item.name || `مهارة ${idx + 1}`}
        renderItem={({ item, patch }) => (
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <FloatingInput
              label="اسم المهارة"
              value={item.name}
              onChange={(e) => patch({ name: e.target.value } as Partial<Item>)}
            />
            <div className="space-y-1.5">
              <Label>المستوى</Label>
              <Select
                value={item.level ?? ""}
                onValueChange={(v) => patch({ level: (v || null) as Item["level"] } as Partial<Item>)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      />
    </section>
  );
}
