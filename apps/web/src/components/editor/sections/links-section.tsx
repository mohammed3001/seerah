"use client";

import {
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

type Item = Tables<"social_links">;

const LINK_TYPES = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "github", label: "GitHub" },
  { value: "twitter", label: "X / Twitter" },
  { value: "behance", label: "Behance" },
  { value: "dribbble", label: "Dribbble" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "موقع شخصي" },
  { value: "other", label: "أخرى" },
];

export function LinksSection() {
  const actions = useSectionActions<"links", Item>("links", "social_links", {
    url: "",
    link_type: "linkedin",
  });

  return (
    <section>
      <SectionHeader
        section="links"
        title="الروابط"
        description="حسابات التواصل المهني والرسمي"
        showAi={false}
      />
      <SectionList<Item>
        items={actions.items}
        onItemsChange={actions.setItems}
        onAdd={actions.onAdd}
        onPatch={actions.onPatch}
        onDelete={actions.onDelete}
        onReorder={actions.onReorder}
        addLabel="إضافة رابط جديد"
        itemLabel={(item, idx) =>
          LINK_TYPES.find((l) => l.value === item.link_type)?.label ?? `رابط ${idx + 1}`
        }
        renderItem={({ item, patch }) => (
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div className="space-y-1.5">
              <Label>النوع</Label>
              <Select
                value={item.link_type ?? ""}
                onValueChange={(v) => patch({ link_type: v } as Partial<Item>)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FloatingInput
              label="الرابط"
              dir="ltr"
              value={item.url ?? ""}
              onChange={(e) => patch({ url: e.target.value } as Partial<Item>)}
            />
          </div>
        )}
      />
    </section>
  );
}
