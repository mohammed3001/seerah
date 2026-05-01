"use client";

import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";

import { Popover, PopoverContent, PopoverTrigger, Button } from "@seerah/ui";

import { cn } from "@/lib/utils";
import { countries, type Country } from "@/lib/editor/countries";

interface Props {
  value: string | null;
  onChange: (next: string | null) => void;
  /** "code" stores ISO 3166-1 alpha-2; "dial" stores +XX dial codes. */
  by?: "code" | "dial";
  placeholder?: string;
  className?: string;
}

export function CountrySelect({ value, onChange, by = "code", placeholder, className }: Props) {
  const [open, setOpen] = React.useState(false);
  const selected: Country | undefined = React.useMemo(() => {
    if (!value) return undefined;
    return countries.find((c) => (by === "code" ? c.code === value : c.dial === value));
  }, [value, by]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">{selected.flag}</span>
              <span>{by === "dial" ? selected.dial : selected.nameAr}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder ?? "اختر الدولة"}</span>
          )}
          <ChevronsUpDown className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command label="ابحث عن الدولة" loop>
          <Command.Input
            placeholder="ابحث…"
            className="h-10 w-full border-b border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-64 overflow-auto p-1">
            <Command.Empty className="py-4 text-center text-xs text-muted-foreground">
              لا توجد نتائج
            </Command.Empty>
            {countries.map((c) => {
              const itemValue = `${c.nameAr} ${c.nameEn} ${c.dial} ${c.code}`;
              const isSelected = by === "code" ? value === c.code : value === c.dial;
              return (
                <Command.Item
                  key={c.code + c.dial}
                  value={itemValue}
                  onSelect={() => {
                    onChange(by === "code" ? c.code : c.dial);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    "data-[selected=true]:bg-secondary",
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{c.nameAr}</span>
                  <span className="text-[11px] text-muted-foreground" dir="ltr">
                    {c.dial}
                  </span>
                  {isSelected ? <Check className="size-4 text-accent" /> : null}
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
