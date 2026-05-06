"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button, Card } from "@seerah/ui";

import { cn } from "@/lib/utils";

import { useEditor } from "./editor-context";
import { VisibilityToggle } from "./visibility-toggle";

interface BaseItem {
  id: string;
  is_visible: boolean;
  sort_order: number;
}

interface RenderProps<T extends BaseItem> {
  item: T;
  index: number;
  patch: (patch: Partial<T>) => void;
}

interface Props<T extends BaseItem> {
  items: T[];
  renderItem: (props: RenderProps<T>) => React.ReactNode;
  onAdd: () => Promise<T | null>;
  onPatch: (id: string, patch: Partial<T>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  addLabel: string;
  itemLabel: (item: T, index: number) => string;
  onItemsChange: (items: T[]) => void;
}

export function SectionList<T extends BaseItem>({
  items,
  renderItem,
  onAdd,
  onPatch,
  onDelete,
  onReorder,
  addLabel,
  itemLabel,
  onItemsChange,
}: Props<T>) {
  const [adding, setAdding] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [openItemId, setOpenItemId] = React.useState<string | null>(items[0]?.id ?? null);

  async function handleAdd() {
    setAdding(true);
    try {
      const created = await onAdd();
      if (created) setOpenItemId(created.id);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    const previous = items;
    onItemsChange(items.filter((i) => i.id !== id));
    try {
      await onDelete(id);
    } catch {
      onItemsChange(previous);
      toast.error("تعذّر الحذف");
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function handleVisibility(id: string, value: boolean) {
    const previous = items;
    onItemsChange(items.map((i) => (i.id === id ? { ...i, is_visible: value } : i)));
    try {
      await onPatch(id, { is_visible: value } as Partial<T>);
    } catch {
      onItemsChange(previous);
    }
  }

  function handlePatch(id: string, patch: Partial<T>) {
    onItemsChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    void onPatch(id, patch).catch(() => toast.error("تعذّر الحفظ"));
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index) return;
    const next = Array.from(items);
    const [moved] = next.splice(result.source.index, 1);
    if (!moved) return;
    next.splice(result.destination.index, 0, moved);
    const reindexed = next.map((it, idx) => ({ ...it, sort_order: idx }));
    onItemsChange(reindexed);
    try {
      await onReorder(reindexed.map((it) => it.id));
    } catch {
      toast.error("تعذّر إعادة الترتيب");
    }
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="section-items">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {items.map((item, index) => {
                const isOpen = openItemId === item.id;
                return (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <Card
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={cn(
                          "overflow-hidden border-border transition-shadow",
                          snapshot.isDragging && "shadow-card-dark",
                        )}
                      >
                        <div className="flex items-center gap-2 border-b border-border bg-secondary/30 px-3 py-2">
                          <button
                            type="button"
                            {...dragProvided.dragHandleProps}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="إعادة الترتيب"
                          >
                            <GripVertical className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenItemId(isOpen ? null : item.id)}
                            className="flex-1 truncate text-start text-sm font-medium"
                          >
                            {itemLabel(item, index)}
                          </button>
                          <VisibilityToggle
                            value={item.is_visible}
                            onChange={(v) => void handleVisibility(item.id, v)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDelete(item.id)}
                            disabled={pendingDeleteId === item.id}
                            aria-label="حذف"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            {pendingDeleteId === item.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                        {isOpen ? (
                          <div className="space-y-4 p-4">
                            {renderItem({
                              item,
                              index,
                              patch: (patch) => handlePatch(item.id, patch),
                            })}
                          </div>
                        ) : null}
                      </Card>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button type="button" variant="outline" onClick={() => void handleAdd()} disabled={adding}>
        {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {addLabel}
      </Button>
    </div>
  );
}
