-- =============================================================================
-- Admin users management — server-side aggregates + helpers
-- =============================================================================
-- The /admin/users list shows a resume count and "last activity" indicator
-- for every user.  Pulling raw resumes / ai_usage rows and counting in JS
-- would silently truncate at PostgREST's 1000-row ceiling once the platform
-- crosses that size, so all aggregates here are computed in Postgres.
--
-- Same pattern as 20260506_dashboard_aggregates: SECURITY DEFINER, locked
-- to service_role (the admin app uses the service-role key).
-- =============================================================================

set check_function_bodies = off;

-- ---------- resume counts for a slice of user ids --------------------------
-- The list page shows ≤ 100 users at a time; we fetch their resume counts
-- in a single round-trip rather than N+1 queries.
create or replace function public.admin_user_resume_counts(p_user_ids uuid[])
returns table (user_id uuid, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select user_id, count(*)::bigint as count
  from resumes
  where user_id = any (p_user_ids)
  group by user_id;
$$;

revoke all on function public.admin_user_resume_counts(uuid[]) from public;

-- ---------- ai-usage counts for a slice of user ids ------------------------
-- Used both on the list ("AI requests today" badge) and on the detail page
-- ("AI usage stats").  The caller passes a date window so we don't count
-- a user's lifetime activity by accident.
create or replace function public.admin_user_ai_counts(
  p_user_ids uuid[],
  p_from timestamptz,
  p_to timestamptz
)
returns table (user_id uuid, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select user_id, count(*)::bigint as count
  from ai_usage
  where user_id = any (p_user_ids)
    and created_at >= p_from
    and created_at < p_to
  group by user_id;
$$;

revoke all on function public.admin_user_ai_counts(uuid[], timestamptz, timestamptz) from public;

-- ---------- distinct billing countries -------------------------------------
-- Populates the country filter dropdown.  Same DISTINCT-as-RPC pattern as
-- admin_distinct_audit_actions to avoid LIMIT-by-row truncation.
create or replace function public.admin_distinct_user_countries()
returns table (country text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct billing_country
  from profiles
  where billing_country is not null
    and length(trim(billing_country)) > 0
  order by billing_country
  limit 500;
$$;

revoke all on function public.admin_distinct_user_countries() from public;

-- ---------- per-user AI usage detail (last 30 days) ------------------------
-- Used only on /admin/users/[id]; returns one row per (date, action_type)
-- pair so the detail page can render a small breakdown.  Bounded by the
-- 30-day window × number of distinct action_types — far below 1000 rows
-- in any realistic case.
create or replace function public.admin_user_ai_breakdown(
  p_user_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (action_type text, count bigint, total_tokens bigint)
language sql
stable
security definer
set search_path = public
as $$
  select action_type,
         count(*)::bigint as count,
         coalesce(sum(tokens_used), 0)::bigint as total_tokens
  from ai_usage
  where user_id = p_user_id
    and created_at >= p_from
    and created_at < p_to
  group by action_type
  order by count desc;
$$;

revoke all on function public.admin_user_ai_breakdown(uuid, timestamptz, timestamptz)
  from public;

-- ---------- destructive helpers --------------------------------------------
-- We expose a single SECURITY DEFINER wrapper so the audit-log row and the
-- profile UPDATE happen atomically.  The admin server passes the admin id /
-- email so the audit row is correctly attributed.

-- Disable / enable a user account.  Empty p_reason on enable, required on
-- disable (caller enforces the business rule; we just persist whatever they
-- pass).  Returns the new is_disabled value so the server action can confirm
-- the round-trip.
create or replace function public.admin_set_user_disabled(
  p_user_id uuid,
  p_disabled boolean,
  p_reason text,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if p_disabled then
    update profiles
    set is_disabled = true,
        disabled_reason = nullif(p_reason, ''),
        disabled_at = now()
    where id = p_user_id;
    v_action := 'admin.user.disabled';
  else
    update profiles
    set is_disabled = false,
        disabled_reason = null,
        disabled_at = null
    where id = p_user_id;
    v_action := 'admin.user.enabled';
  end if;

  if not found then
    raise exception 'profile not found: %', p_user_id;
  end if;

  insert into admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent)
  values
    (p_admin_id, p_admin_email, v_action, 'user', p_user_id::text,
     jsonb_build_object('reason', p_reason),
     case when p_ip is null or p_ip = '' then null else p_ip::inet end,
     p_user_agent);

  return p_disabled;
end;
$$;

revoke all on function public.admin_set_user_disabled(uuid, boolean, text, uuid, text, text, text)
  from public;

-- Manual plan change.  Resets max_resumes based on the new plan because the
-- consumer-facing app keys gating off that column rather than recomputing
-- from profiles.plan on every request.
create or replace function public.admin_set_user_plan(
  p_user_id uuid,
  p_plan text,
  p_expires_at timestamptz,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_old_plan text;
begin
  if p_plan not in ('free', 'prime', 'enterprise') then
    raise exception 'invalid plan: %', p_plan;
  end if;

  v_max := case p_plan
    when 'free' then 1
    when 'prime' then 10
    when 'enterprise' then 100
  end;

  select plan into v_old_plan from profiles where id = p_user_id;
  if v_old_plan is null then
    raise exception 'profile not found: %', p_user_id;
  end if;

  update profiles
  set plan = p_plan,
      plan_expires_at = p_expires_at,
      max_resumes = v_max
  where id = p_user_id;

  insert into admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent)
  values
    (p_admin_id, p_admin_email, 'admin.user.plan_changed', 'user', p_user_id::text,
     jsonb_build_object(
       'from', v_old_plan,
       'to', p_plan,
       'expires_at', p_expires_at
     ),
     case when p_ip is null or p_ip = '' then null else p_ip::inet end,
     p_user_agent);
end;
$$;

revoke all on function public.admin_set_user_plan(uuid, text, timestamptz, uuid, text, text, text)
  from public;
