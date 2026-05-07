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

import { Inngest, eventType, staticSchema } from "inngest";

/**
 * Strongly-typed event catalogue. Each `eventType` call binds an event
 * name to a `data` shape; passing the EventType to `createFunction`'s
 * `triggers` array gives the handler `event.data` with full type
 * inference and gives `inngest.send({ event, data })` compile-time
 * validation that the data matches the schema.
 *
 * `staticSchema<T>()` is a type-only schema (no runtime validation,
 * zero bundle cost). Switch to a Zod or Valibot schema if a producer
 * starts dispatching from untrusted sources.
 *
 * Naming convention: `<entity>/<verb>.<modifier?>` (Inngest's idiomatic
 * pattern). `entity` is the noun the event is about; `verb` is past
 * tense for state changes, present tense for commands.
 */
export const userWelcomeEvent = eventType("user/welcome", {
  schema: staticSchema<{
    user_id: string;
    email: string;
    full_name: string | null;
    locale: "ar" | "en";
  }>(),
});

export const subscriptionRenewalEvent = eventType("subscription/renewal-reminder", {
  schema: staticSchema<{
    user_id: string;
    subscription_id: string;
    current_period_end_iso: string;
  }>(),
});

export const inngest = new Inngest({
  id: "seerah-web",
});
