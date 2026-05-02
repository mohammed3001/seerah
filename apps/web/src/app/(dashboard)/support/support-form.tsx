"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button, FloatingInput, Label, Textarea } from "@seerah/ui";

import { submitSupportTicket } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  subject_invalid: "الموضوع يجب أن يكون بين 3 و200 حرف.",
  message_invalid: "الرسالة يجب أن تكون بين 10 و4000 حرف.",
  insert_failed: "تعذّر حفظ الطلب. حاول مرة أخرى.",
};

export function SupportForm() {
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitSupportTicket({ subject, message });
      if (!result.ok) {
        toast.error(ERROR_MESSAGES[result.error ?? ""] ?? "حدث خطأ غير متوقع");
        return;
      }
      toast.success("تم استلام طلبك. ستصلك رسالة تأكيد على بريدك.");
      setSubject("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div className="space-y-2">
        <FloatingInput
          label="الموضوع"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">تفاصيل الطلب</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder="اشرح لنا ما تحتاجه بأكبر قدر من التفاصيل."
          required
        />
        <p className="text-xs text-muted-foreground">{message.length} / 4000</p>
      </div>

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? <Loader2 className="size-5 animate-spin" /> : "إرسال الطلب"}
      </Button>
    </form>
  );
}
