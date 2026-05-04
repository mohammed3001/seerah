-- Phase Admin-C2: subscriptions management RPCs.
--
-- The consumer-side `admin_set_user_plan` (migration 20260507) already
-- handles "manually grant Prime" because plan + plan_expires_at on the
-- profile is what gates feature access.  This migration adds the bits
-- specific to inspecting and operating on actual `subscriptions` rows
-- (Stripe-backed and otherwise):
--
--   * admin_extend_subscription(p_subscription_id, p_new_period_end)
--       Atomically bumps current_period_end on a row.  The Stripe
--       webhook is the canonical source of truth, so this is meant for
--       operator overrides (e.g. compensating a customer for an
--       outage).  The plan-sync trigger picks up the change.
--
--   * admin_cancel_subscription_local(p_subscription_id)
--       Mirrors a Stripe-side cancellation in our DB.  The matching
--       server action calls Stripe first; this RPC is the local commit
--       that runs in the same transaction as the audit log entry.
--
--   * admin_distinct_sub_statuses()
--       Powers the filter dropdown on the admin /subscriptions list.
--       Distinct statuses, sorted, computed in Postgres so we don't
--       de-dupe in the Node layer (and don't accidentally truncate at
--       PostgREST's 1000-row limit).
--
--   * admin_stats_subscriptions_summary()
--       Status counts for the dashboard cards.  Aggregates in Postgres
--       and returns one row per status.

-- ---------- 1. Extend a subscription's current period -----------------------
create or replace function public.admin_extend_subscription(
  p_subscription_id uuid,
  p_new_period_end timestamptz,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_old_end timestamptz;
  v_stripe_sub_id text;
begin
  if p_new_period_end is null then
    raise exception 'p_new_period_end is required';
  end if;

  select user_id, current_period_end, stripe_subscription_id
    into v_user_id, v_old_end, v_stripe_sub_id
    from public.subscriptions
   where id = p_subscription_id
   for update;

  if v_user_id is null then
    raise exception 'subscription not found: %', p_subscription_id;
  end if;

  if v_old_end is not null and p_new_period_end <= v_old_end then
    raise exception 'new period end (%) must be later than current (%)',
      p_new_period_end, v_old_end;
  end if;

  update public.subscriptions
     set current_period_end = p_new_period_end,
         status = case
           when status in ('canceled', 'past_due', 'unpaid') then 'active'
           else status
         end
   where id = p_subscription_id;

  insert into admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent)
  values
    (p_admin_id, p_admin_email, 'admin.subscription.extended', 'subscription', p_subscription_id::text,
     jsonb_build_object(
       'user_id', v_user_id,
       'stripe_subscription_id', v_stripe_sub_id,
       'previous_period_end', v_old_end,
       'new_period_end', p_new_period_end
     ),
     case when p_ip is null or p_ip = '' then null else p_ip::inet end,
     p_user_agent);
end;
$$;

revoke all on function public.admin_extend_subscription(uuid, timestamptz, uuid, text, text, text)
  from public;

-- ---------- 2. Cancel a subscription locally --------------------------------
-- The server action is responsible for calling Stripe's
-- `subscriptions.update({ cancel_at_period_end: true })` (or the
-- non-Stripe-backed equivalent) before invoking this RPC.  The RPC is
-- the atomic local-state + audit-log step.
create or replace function public.admin_cancel_subscription_local(
  p_subscription_id uuid,
  p_at_period_end boolean,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_old_status text;
  v_stripe_sub_id text;
begin
  select user_id, status, stripe_subscription_id
    into v_user_id, v_old_status, v_stripe_sub_id
    from public.subscriptions
   where id = p_subscription_id
   for update;

  if v_user_id is null then
    raise exception 'subscription not found: %', p_subscription_id;
  end if;

  update public.subscriptions
     set cancel_at_period_end = coalesce(p_at_period_end, true),
         canceled_at = coalesce(canceled_at, now()),
         status = case
           when coalesce(p_at_period_end, true) then status
           else 'canceled'
         end
   where id = p_subscription_id;

  insert into admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent)
  values
    (p_admin_id, p_admin_email, 'admin.subscription.canceled', 'subscription', p_subscription_id::text,
     jsonb_build_object(
       'user_id', v_user_id,
       'stripe_subscription_id', v_stripe_sub_id,
       'previous_status', v_old_status,
       'at_period_end', coalesce(p_at_period_end, true)
     ),
     case when p_ip is null or p_ip = '' then null else p_ip::inet end,
     p_user_agent);
end;
$$;

revoke all on function public.admin_cancel_subscription_local(uuid, boolean, uuid, text, text, text)
  from public;

-- ---------- 3. Distinct subscription statuses for filter dropdown -----------
create or replace function public.admin_distinct_sub_statuses()
returns table(status text)
language sql
security definer
set search_path = public
as $$
  select distinct status
    from public.subscriptions
   where status is not null and status <> ''
   order by status;
$$;

revoke all on function public.admin_distinct_sub_statuses() from public;

-- ---------- 4. Status summary aggregate -------------------------------------
create or replace function public.admin_stats_subscriptions_summary()
returns table(status text, count bigint)
language sql
security definer
set search_path = public
as $$
  select coalesce(status, 'unknown') as status, count(*)::bigint
    from public.subscriptions
   group by coalesce(status, 'unknown')
   order by status;
$$;

revoke all on function public.admin_stats_subscriptions_summary() from public;

-- Index supporting the most common admin filter (status + ordering).  The
-- existing subscriptions_status_idx already covers the equality lookups
-- but we also want fast "newest canceled" / "oldest active" listings.
create index if not exists subscriptions_status_created_idx
  on public.subscriptions (status, created_at desc);
