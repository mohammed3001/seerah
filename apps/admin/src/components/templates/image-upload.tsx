"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { uploadTemplateImage } from "@/lib/templates/actions";
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES, type TemplateImageKind } from "@/lib/templates/types";

interface TemplateImageUploadProps {
  templateId: string;
  kind: TemplateImageKind;
  /** Hidden form field that the parent form will submit. */
  fieldName: string;
  /** Current value (URL).  Empty string when nothing uploaded yet. */
  defaultValue: string;
  label: string;
}

/**
 * Single-image upload control that submits the file directly to a server
 * action (no Supabase JS in the browser, no service-role exposure).  On
 * success, the returned public URL is written to a hidden input on this
 * component so the surrounding metadata form can submit it.
 */
export function TemplateImageUpload({
  templateId,
  kind,
  fieldName,
  defaultValue,
  label,
}: TemplateImageUploadProps) {
  const [url, setUrl] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_IMAGE_BYTES) {
      setError("حجم الصورة أكبر من ١٠ ميغابايت.");
      return;
    }
    if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
      setError("الصيغة غير مدعومة (PNG / JPG / WebP فقط).");
      return;
    }

    const fd = new FormData();
    fd.append("templateId", templateId);
    fd.append("kind", kind);
    fd.append("file", file);

    startTransition(async () => {
      const res = await uploadTemplateImage(undefined, fd);
      if (res.ok && typeof res.data?.url === "string") {
        setUrl(res.data.url);
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-600">{label}</label>
      <div className="flex items-start gap-3">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- public bucket URL, may be from any host
            <img src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          {pending ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            </div>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_MIME.join(",")}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              // Reset so re-selecting the same file fires onChange again.
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {url ? "تغيير الصورة" : "اختر صورة"}
          </button>
          <p className="text-[11px] text-slate-500">PNG / JPG / WebP — حد ١٠ ميغا.</p>
          {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
          {url ? (
            <p className="break-all text-[11px] text-slate-400" dir="ltr">
              {url}
            </p>
          ) : null}
        </div>
      </div>
      <input type="hidden" name={fieldName} value={url} />
    </div>
  );
}
