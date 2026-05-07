/**
 * Inngest client — single instance shared by every function file and by
 * the `/api/inngest` serve handler.
 *
 * Inngest reads INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY automatically
 * from the environment when present. In dev / preview without keys it
 * falls back to the local-dev pattern; the `serve()` handler at
 * `/api/inngest` will not register the functions in production until
 * both keys are configured.
 */

import { Inngest } from "inngest";

/**
 * Strongly-typed event catalogue. Add new events here so dispatchers
 * (e.g. `inngest.send({ name: "user/welcome", data: ... })`) get full
 * autocomplete + compile-time validation.
 *
 * Naming convention: `<entity>/<verb>.<modifier?>` (Inngest's idiomatic
 * pattern). `entity` is the noun the event is about; `verb` is past
 * tense for state changes, present tense for commands.
 */
export type SeerahEvents = {
  "user/welcome": {
    data: {
      user_id: string;
      email: string;
      full_name: string | null;
      locale: "ar" | "en";
    };
  };
  "subscription/renewal-reminder": {
    data: {
      user_id: string;
      subscription_id: string;
      current_period_end_iso: string;
    };
  };
};

export const inngest = new Inngest({
  id: "seerah-web",
});
