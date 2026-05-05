"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button, Input, Label } from "@seerah/ui";

import { deleteOwnAccountAction } from "./actions";

interface DeleteAccountFormProps {
  /** The signed-in user's email — shown in the form label so the user
   *  can see exactly which account they are about to lose. */
  email: string;
}

/**
 * Two-input "type to confirm" form for self-service account deletion.
 * The user must:
 *   - retype their own email (defends against tab-switching mistakes)
 *   - type DELETE in caps (defends against accidental clicks)
 *
 * Both checks are also enforced on the server in
 * `deleteOwnAccountAction` — this client-side mirror only exists so
 * the user gets immediate, in-form feedback before submitting.
 */
export function DeleteAccountForm({ email }: DeleteAccountFormProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [emailInput, setEmailInput] = React.useState("");
  const [confirmInput, setConfirmInput] = React.useState("");

  const emailMatches =
    emailInput.trim().toLowerCase() === email.toLowerCase() && emailInput.length > 0;
  const confirmMatches = confirmInput.trim().toUpperCase() === "DELETE";
  const canSubmit = emailMatches && confirmMatches && !pending;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    try {
      const fd = new FormData();
      // Send the trimmed values so the server-side zod `.email()`
      // check (which rejects leading/trailing whitespace) matches the
      // client-side gate that already runs `.trim()` before
      // comparing.  Without this an accidental leading space enables
      // the submit button but the server rejects the request with a
      // generic "بيانات النموذج غير صالحة" (Devin Review on PR #32).
      fd.set("email", emailInput.trim());
      fd.set("confirm", confirmInput.trim());
      const result = await deleteOwnAccountAction(fd);
      if (!result.ok) {
        toast.error(result.message);
        setPending(false);
        return;
      }
      // The server action returns the redirect target instead of
      // calling Next's redirect() itself.  Doing the navigation on the
      // client lets the catch block below distinguish a true failure
      // from the happy-path redirect (caught by Devin Review on PR #32).
      router.replace(result.redirectTo);
    } catch (err) {
      // Real failure (e.g. network drop, browser hostile to fetch).
      // Server-success cases never reach here now that the action
      // returns a result envelope instead of throwing NEXT_REDIRECT.
      console.error("delete-account-form: action failed", err);
      toast.error("تعذّر حذف الحساب. حاول مرة أخرى.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="delete-email">البريد الإلكتروني للتأكيد</Label>
        <Input
          id="delete-email"
          type="email"
          autoComplete="off"
          dir="ltr"
          placeholder={email}
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          aria-describedby="delete-email-hint"
        />
        <p id="delete-email-hint" className="text-xs text-muted-foreground">
          أعد كتابة <span dir="ltr">{email}</span> للمتابعة.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="delete-confirm">اكتب DELETE للتأكيد</Label>
        <Input
          id="delete-confirm"
          type="text"
          autoComplete="off"
          dir="ltr"
          placeholder="DELETE"
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="destructive"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
        >
          {pending ? "جاري الحذف..." : "احذف حسابي نهائيًا"}
        </Button>
      </div>
    </form>
  );
}
