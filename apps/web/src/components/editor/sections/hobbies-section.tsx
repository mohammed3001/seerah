"use client";

import { FloatingInput } from "@seerah/ui";

import { useEditor } from "@/components/editor/editor-context";
import { SectionHeader } from "@/components/editor/section-header";
import { SectionList } from "@/components/editor/section-list";
import { useSectionActions } from "@/components/editor/sections/use-section-actions";
import type { Tables } from "@seerah/types";

type Item = Tables<"hobbies">;

export function HobbiesSection() {
  const { editorLang } = useEditor();
  const actions = useSectionActions<"hobbies", Item>("hobbies", "hobbies", { name: null });

  return (
    <section>
      <SectionHeader section="hobbies" title="الهوايات" description="هواياتك واهتماماتك" />
      <SectionList<Item>
        items={actions.items}
        onItemsChange={actions.setItems}
        onAdd={actions.onAdd}
        onPatch={actions.onPatch}
        onDelete={actions.onDelete}
        onReorder={actions.onReorder}
        addLabel="إضافة هواية جديدة"
        itemLabel={(item, idx) => item.name ?? `هواية ${idx + 1}`}
        renderItem={({ item, patch }) => {
          const localized = ((item[editorLang as "ar" | "en"] as Record<string, string>) ?? {}) as {
            name?: string;
          };
          return (
            <FloatingInput
              label={`اسم الهواية ${editorLang === "ar" ? "(عربي)" : "(English)"}`}
              value={localized.name ?? ""}
              onChange={(e) =>
                patch({ [editorLang]: { ...localized, name: e.target.value } } as Partial<Item>)
              }
            />
          );
        }}
      />
    </section>
  );
}
