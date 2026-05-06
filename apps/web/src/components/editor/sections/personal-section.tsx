"use client";

import { Loader2, Sparkles, Upload, User } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  FloatingInput,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@seerah/ui";

import { upsertSingletonAction } from "@/app/(dashboard)/dashboard/resume/[id]/actions";
import { uploadAvatarAction } from "@/lib/avatars/actions";
import { CharacterCounter } from "@/components/editor/character-counter";
import { CountrySelect } from "@/components/editor/country-select";
import { DateTriad } from "@/components/editor/date-picker";
import { useEditor } from "@/components/editor/editor-context";
import { SectionHeader } from "@/components/editor/section-header";
import { useDebouncedCallback } from "@/lib/editor/use-debounced-callback";
import type { Tables } from "@seerah/types";

type PersonalRow = Tables<"personal_info">;

const BIO_MAX = 3000;
const NAME_MAX = 120;
const TITLE_MAX = 120;

export function PersonalSection() {
  const { data, setData, editorLang, openAiPanel } = useEditor();
  const initial: Partial<PersonalRow> = data.personal ?? { resume_id: data.resume.id };
  const [form, setForm] = React.useState<Partial<PersonalRow>>(initial);
  const [savingAvatar, setSavingAvatar] = React.useState(false);

  // Sync local state when context updates externally (e.g. AI fill).
  React.useEffect(() => {
    if (data.personal) setForm(data.personal);
  }, [data.personal]);

  // Tracks the latest form so callbacks captured by long-lived components
  // (e.g. the AI panel's onAccept) read fresh values instead of the snapshot
  // taken at click time. Without this, an external sync arriving while the
  // panel is open would be reverted when the user accepts the suggestion.
  const formRef = React.useRef(form);
  React.useEffect(() => {
    formRef.current = form;
  });

  const saveDebounced = useDebouncedCallback(async (patch: Partial<PersonalRow>) => {
    const result = await upsertSingletonAction(data.resume.id, "personal_info", patch);
    if ("error" in result) toast.error(result.error);
  }, 2000);

  function update<K extends keyof PersonalRow>(key: K, value: PersonalRow[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setData((prev) => ({
      ...prev,
      personal: { ...(prev.personal ?? ({} as PersonalRow)), [key]: value } as PersonalRow,
    }));
    saveDebounced({ [key]: value } as Partial<PersonalRow>);
  }

  async function handleAvatarUpload(file: File) {
    if (!file) return;
    // Client-side size guard.  The server action enforces the same
    // limit authoritatively, but Next.js applies its own
    // `bodySizeLimit` (6 MB) BEFORE the action runs and rejects
    // larger payloads with HTTP 413 — which surfaces as a thrown
    // promise from the action call.  Catching it here gives the user
    // a helpful Arabic message instead of a silent failure.
    if (file.size > 4 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 4MB");
      return;
    }
    setSavingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadAvatarAction(fd);
      if (!result.ok || !result.path) {
        toast.error(result.message);
        return;
      }
      update("avatar_path", result.path);
      toast.success(result.message);
    } catch {
      // Defensive: handles 413 from the framework body-size limit and
      // any transport error so we never leave the user with a stuck
      // spinner and no feedback.
      toast.error("تعذّر رفع الصورة، تأكد من أن حجمها أقل من 4MB.");
    } finally {
      setSavingAvatar(false);
    }
  }

  const localized = (form[editorLang] as Record<string, string> | undefined) ?? {};
  function setLocalized(key: string, value: string) {
    const next = { ...localized, [key]: value };
    update(editorLang as "ar" | "en", next as PersonalRow["ar"]);
  }

  return (
    <section>
      <SectionHeader
        section="personal"
        title="البيانات الشخصية"
        description="المعلومات الأساسية التي ستظهر في رأس السيرة"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[140px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <Avatar className="size-28">
            {form.avatar_path ? (
              <AvatarImage src={publicAvatarUrl(form.avatar_path) ?? undefined} alt="" />
            ) : null}
            <AvatarFallback>
              <User className="size-10 text-muted-foreground/40" />
            </AvatarFallback>
          </Avatar>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAvatarUpload(file);
              }}
            />
            <span className="inline-flex h-9 items-center gap-2 rounded-button border border-border bg-background px-3 text-xs font-medium hover:bg-secondary">
              {savingAvatar ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              تحميل صورة
            </span>
          </label>
        </div>

        <div className="space-y-4">
          <FloatingInput
            label={`الاسم الكامل ${editorLang === "ar" ? "(عربي)" : "(English)"} *`}
            value={localized.full_name ?? ""}
            maxLength={NAME_MAX}
            onChange={(e) => setLocalized("full_name", e.target.value)}
          />
          <FloatingInput
            label={`المسمى الوظيفي ${editorLang === "ar" ? "(عربي)" : "(English)"}`}
            value={localized.job_title ?? ""}
            maxLength={TITLE_MAX}
            onChange={(e) => setLocalized("job_title", e.target.value)}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>نبذة مختصرة</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-accent"
                onClick={() =>
                  openAiPanel({
                    tab: "enhance",
                    section: "personal",
                    field: "bio",
                    fieldType: "bio",
                    currentText: localized.bio ?? "",
                    // Forward `lang` so accepting the English result writes
                    // to form.en.bio even when the editor was opened in
                    // Arabic mode (and vice versa).
                    onAccept: (text, lang) => {
                      // Read via formRef so a sync that arrived while the
                      // panel was open isn't clobbered by a stale snapshot.
                      const target =
                        (formRef.current[lang] as Record<string, string> | undefined) ?? {};
                      update(lang, { ...target, bio: text } as PersonalRow["ar"]);
                    },
                  })
                }
              >
                <Sparkles className="size-3.5" /> اكتب بالذكاء الاصطناعي
              </Button>
            </div>
            <Textarea
              rows={4}
              maxLength={BIO_MAX}
              value={localized.bio ?? ""}
              onChange={(e) => setLocalized("bio", e.target.value)}
            />
            <CharacterCounter value={localized.bio ?? ""} max={BIO_MAX} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FloatingInput
              label="البريد الإلكتروني (للسيرة)"
              type="email"
              dir="ltr"
              value={form.email ?? ""}
              onChange={(e) => update("email", e.target.value)}
            />
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <CountrySelect
                value={form.phone_country_code ?? "+966"}
                onChange={(v) => update("phone_country_code", v)}
                by="dial"
                placeholder="مفتاح"
              />
              <FloatingInput
                label="رقم الجوال"
                dir="ltr"
                value={form.phone ?? ""}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <FloatingInput
              label="الموقع الإلكتروني"
              dir="ltr"
              value={form.website ?? ""}
              onChange={(e) => update("website", e.target.value)}
            />
            <FloatingInput
              label="المدينة"
              value={form.city ?? ""}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>الدولة</Label>
              <CountrySelect
                value={form.country ?? null}
                onChange={(v) => update("country", v)}
                by="code"
              />
            </div>
            <div className="space-y-1.5">
              <Label>الجنسية</Label>
              <CountrySelect
                value={form.nationality ?? null}
                onChange={(v) => update("nationality", v)}
                by="code"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>تاريخ الميلاد</Label>
              <DateTriad
                value={form.date_of_birth ?? null}
                onChange={(v) => update("date_of_birth", v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>الحالة الاجتماعية</Label>
              <Select
                value={form.marital_status ?? ""}
                onValueChange={(v) =>
                  update("marital_status", (v || null) as PersonalRow["marital_status"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">أعزب</SelectItem>
                  <SelectItem value="married">متزوج</SelectItem>
                  <SelectItem value="divorced">مطلق</SelectItem>
                  <SelectItem value="widowed">أرمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <RadioField
              label="الجنس"
              value={form.gender ?? ""}
              onChange={(v) => update("gender", v as PersonalRow["gender"])}
              options={[
                { value: "male", label: "ذكر" },
                { value: "female", label: "أنثى" },
              ]}
            />
            <RadioField
              label="الحالة الصحية"
              value={form.health_status ?? ""}
              onChange={(v) => update("health_status", v as PersonalRow["health_status"])}
              options={[
                { value: "healthy", label: "سليم" },
                { value: "has_condition", label: "لدي حالة" },
                { value: "hidden", label: "إخفاء" },
              ]}
            />
            <RadioField
              label="الخدمة العسكرية"
              value={form.military_service ?? ""}
              onChange={(v) => update("military_service", v as PersonalRow["military_service"])}
              options={[
                { value: "yes", label: "نعم" },
                { value: "no", label: "لا" },
                { value: "hidden", label: "إخفاء" },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function RadioField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o.value} className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value={o.value} /> {o.label}
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

function publicAvatarUrl(path: string | null): string | null {
  if (!path) return null;
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (!url) return null;
  return `${url}/storage/v1/object/public/avatars/${path}`;
}
