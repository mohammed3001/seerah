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

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user?.id ?? null,
        subject: subject.trim(),
        message: message.trim(),
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("تم استلام طلبك. سنتواصل معك قريبًا.");
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
