"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@seerah/ui";

import { submitSupportTicket } from "@/app/(dashboard)/support/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  subject_invalid: "الموضوع يجب أن يكون بين 3 و200 حرف.",
  message_invalid: "الرسالة يجب أن تكون بين 10 و4000 حرف.",
  insert_failed: "تعذّر حفظ الطلب. حاول مرة أخرى.",
};

export function SupportDialog({ open, onOpenChange }: Props) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!subject.trim() || !message.trim()) {
      toast.error("يرجى تعبئة العنوان والرسالة");
      return;
    }
    setSubmitting(true);
    try {
      // Goes through the server action so the support_ticket_received email
      // fires and analytics tracking runs server-side.
      const result = await submitSupportTicket({ subject, message });
      if (!result.ok) {
        toast.error(ERROR_MESSAGES[result.error ?? ""] ?? "تعذّر إرسال الطلب");
        return;
      }
      toast.success("تم استلام طلبك. ستصلك رسالة تأكيد على بريدك.");
      setSubject("");
      setMessage("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>الدعم الفني</DialogTitle>
          <DialogDescription>
            صف لنا ما تواجهه وسنرد عليك خلال 24 ساعة عبر بريدك الإلكتروني.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">عنوان الطلب</Label>
            <Input
              id="ticket-subject"
              maxLength={120}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ticket-message">الرسالة</Label>
            <Textarea
              id="ticket-message"
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "إرسال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
