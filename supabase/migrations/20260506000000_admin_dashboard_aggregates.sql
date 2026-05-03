-- =============================================================================
-- Admin dashboard aggregate functions
-- =============================================================================
-- The /admin dashboard previously pulled raw rows from `profiles`, `resumes`,
-- `ai_usage`, and `subscriptions` to count and bucket them in JS.  PostgREST's
-- default 1000-row ceiling silently truncated those reads as soon as the
-- platform crossed that size, so the charts (plan distribution, template
-- usage, daily signups, daily AI activity, monthly revenue) would quietly
-- start lying.
--
-- These RPCs do the GROUP BY in Postgres, so the response is bounded by the
-- number of buckets, not the number of underlying rows.  All are
-- SECURITY DEFINER + locked to service_role — no anon / authenticated grants
-- are added (the admin app uses the service-role key).
-- =============================================================================

set check_function_bodies = off;

-- ---------- plan distribution -----------------------------------------------
create or replace function public.admin_stats_plan_distribution()
returns table (plan text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select plan::text, count(*)::bigint as count
  from profiles
  group by plan
  order by count desc;
$$;

revoke all on function public.admin_stats_plan_distribution() from public;

-- ---------- template usage --------------------------------------------------
-- p_limit caps the result set so the bar chart isn't overwhelmed; the dashboard
-- defaults to 8.  Service-role can pass NULL to get every template.
create or replace function public.admin_stats_template_usage(p_limit integer default null)
returns table (template_id text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select template_id, count(*)::bigint as count
  from resumes
  group by template_id
  order by count desc
  limit coalesce(p_limit, 1000);
$$;

revoke all on function public.admin_stats_template_usage(integer) from public;

-- ---------- daily signups ---------------------------------------------------
-- Returns one row per day in [p_from, p_to).  We bucket via date_trunc so the
-- caller only has to pass any two timestamps; missing days are NOT filled here
-- because the JS layer already constructs an empty 30-day window and merges
-- the returned rows into it.
create or replace function public.admin_stats_signups_daily(
  p_from timestamptz,
  p_to timestamptz
)
returns table (day date, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select date_trunc('day', created_at)::date as day, count(*)::bigint as count
  from profiles
  where created_at >= p_from
    and created_at < p_to
  group by 1
  order by 1;
$$;

revoke all on function public.admin_stats_signups_daily(timestamptz, timestamptz) from public;

-- ---------- daily AI usage --------------------------------------------------
create or replace function public.admin_stats_ai_usage_daily(
  p_from timestamptz,
  p_to timestamptz
)
returns table (day date, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select date_trunc('day', created_at)::date as day, count(*)::bigint as count
  from ai_usage
  where created_at >= p_from
    and created_at < p_to
  group by 1
  order by 1;
$$;

revoke all on function public.admin_stats_ai_usage_daily(timestamptz, timestamptz) from public;

-- ---------- monthly subscriptions ------------------------------------------
-- Counts subscriptions that became active in each YYYY-MM bucket within the
-- range.  Status / provider filters are intentionally enforced inside the
-- function so the dashboard can't accidentally widen the definition of "paid"
-- without a migration review.
create or replace function public.admin_stats_subscriptions_monthly(
  p_from timestamptz,
  p_to timestamptz
)
returns table (month text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
         count(*)::bigint as count
  from subscriptions
  where provider = 'stripe'
    and status = 'active'
    and created_at >= p_from
    and created_at < p_to
  group by 1
  order by 1;
$$;

revoke all on function public.admin_stats_subscriptions_monthly(timestamptz, timestamptz)
  from public;
