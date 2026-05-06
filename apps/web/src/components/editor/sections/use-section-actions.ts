"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  deleteSectionItem,
  insertSectionItem,
  reorderSectionItems,
  updateSectionItem,
} from "@/app/(dashboard)/dashboard/resume/[id]/actions";
import { useEditor } from "@/components/editor/editor-context";

interface BaseItem {
  id: string;
  is_visible: boolean;
  sort_order: number;
}

type ItemTable =
  | "education"
  | "experience"
  | "courses"
  | "skills"
  | "projects"
  | "references"
  | "languages"
  | "social_links"
  | "hobbies";

/**
 * Provides typed CRUD actions plus the optimistic state setters expected by
 * `<SectionList>` for any of the multi-row section tables.
 */
export function useSectionActions<
  K extends keyof Pick<
    ReturnType<typeof useEditor>["data"],
    | "education"
    | "experience"
    | "courses"
    | "skills"
    | "projects"
    | "references"
    | "languages"
    | "links"
    | "hobbies"
  >,
  T extends BaseItem,
>(field: K, table: ItemTable, defaults: Partial<T>) {
  const { data, setData } = useEditor();
  const items = data[field] as unknown as T[];

  const setItems = React.useCallback(
    (next: T[]) => {
      setData((prev) => ({ ...prev, [field]: next as unknown as (typeof prev)[K] }));
    },
    [setData, field],
  );

  const onAdd = React.useCallback(async () => {
    const sortOrder = items.length;
    const result = await insertSectionItem<Record<string, unknown>>(data.resume.id, table, {
      ...defaults,
      sort_order: sortOrder,
      is_visible: true,
    } as Record<string, unknown>);
    if ("error" in result) {
      toast.error(result.error);
      return null;
    }
    const created = {
      id: result.id,
      is_visible: true,
      sort_order: sortOrder,
      ...defaults,
    } as unknown as T;
    setItems([...items, created]);
    return created;
  }, [data.resume.id, defaults, items, setItems, table]);

  const onPatch = React.useCallback(
    async (id: string, patch: Partial<T>) => {
      const result = await updateSectionItem<Record<string, unknown>>(
        data.resume.id,
        table,
        id,
        patch as Record<string, unknown>,
      );
      if ("error" in result) {
        toast.error(result.error);
        throw new Error(result.error);
      }
    },
    [data.resume.id, table],
  );

  const onDelete = React.useCallback(
    async (id: string) => {
      const result = await deleteSectionItem(data.resume.id, table, id);
      if ("error" in result) {
        toast.error(result.error);
        throw new Error(result.error);
      }
    },
    [data.resume.id, table],
  );

  const onReorder = React.useCallback(
    async (orderedIds: string[]) => {
      const result = await reorderSectionItems(data.resume.id, table, orderedIds);
      if ("error" in result) {
        toast.error(result.error);
        throw new Error(result.error);
      }
    },
    [data.resume.id, table],
  );

  return { items, setItems, onAdd, onPatch, onDelete, onReorder };
}
