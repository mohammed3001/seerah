"use client";

import { Label, Textarea } from "@seerah/ui";
import * as React from "react";
import { toast } from "sonner";

import { upsertSingletonAction } from "@/app/(dashboard)/dashboard/resume/[id]/actions";
import { useEditor } from "@/components/editor/editor-context";
import { SectionHeader } from "@/components/editor/section-header";
import { useDebouncedCallback } from "@/lib/editor/use-debounced-callback";
import type { Tables } from "@seerah/types";

type AddressRow = Tables<"address">;
const NAT_MAX = 200;

export function AddressSection() {
  const { data, setData, editorLang } = useEditor();
  const initial: Partial<AddressRow> = data.address ?? { resume_id: data.resume.id };
  const [form, setForm] = React.useState<Partial<AddressRow>>(initial);

  React.useEffect(() => {
    if (data.address) setForm(data.address);
  }, [data.address]);

  const saveDebounced = useDebouncedCallback(async (patch: Partial<AddressRow>) => {
    const result = await upsertSingletonAction(data.resume.id, "address", patch);
    if ("error" in result) toast.error(result.error);
  }, 2000);

  function update<K extends keyof AddressRow>(key: K, value: AddressRow[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setData((prev) => ({
      ...prev,
      address: { ...(prev.address ?? ({} as AddressRow)), [key]: value } as AddressRow,
    }));
    saveDebounced({ [key]: value } as Partial<AddressRow>);
  }

  return (
    <section>
      <SectionHeader
        section="address"
        title="العنوان"
        description="العنوان الوطني الذي يظهر في السيرة"
        showAi={false}
      />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>العنوان الوطني {editorLang === "ar" ? "(عربي)" : "(English)"}</Label>
          <Textarea
            rows={3}
            maxLength={NAT_MAX}
            value={form.national_address ?? ""}
            onChange={(e) => update("national_address", e.target.value)}
            placeholder="مثال: حي العليا، الرياض 12345، المملكة العربية السعودية"
          />
        </div>
      </div>
    </section>
  );
}
