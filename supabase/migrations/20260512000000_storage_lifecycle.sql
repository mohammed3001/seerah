-- =============================================================================
-- 20260512000000_storage_lifecycle.sql
-- Storage lifecycle hardening: orphan-object purger, retention purger for
-- support attachments, and audit trail for both.
--
-- This migration is the SQL half of the "operator action #8" in
-- docs/audit/X1-final-report.md.  The other half (enabling Supabase Storage
-- object-versioning on the bucket itself) is a dashboard / management-API
-- action and is documented in that report; not reproducible in SQL.
--
-- Scope:
--   - storage_object_lifecycle    audit table for every purge decision
--   - purge_orphan_storage_objects(batch_size int, dry_run bool)
--                                 deletes objects whose owner-uuid prefix
--                                 has no corresponding row in auth.users
--                                 (handles edge cases like service-role
--                                 bypass that misses the F3 cascade)
--   - purge_old_support_attachments(retention_days int, dry_run bool)
--                                 deletes attachments older than
--                                 retention_days for tickets that are
--                                 status = 'closed' or 'resolved'
--
-- Both functions are SECURITY DEFINER and locked to service_role.  They are
-- intended to be invoked from a daily pg_cron job (created at the bottom of
-- this migration if the pg_cron extension is available; skipped otherwise so
-- this migration still applies to vanilla Postgres in CI).
-- =============================================================================

-- ---------- audit table -----------------------------------------------------
create table if not exists public.storage_object_lifecycle (
  id            uuid primary key default gen_random_uuid(),
  bucket_id     text not null,
  object_name   text not null,
  reason        text not null check (
    reason in ('orphan_user', 'support_retention', 'manual')
  ),
  dry_run       boolean not null default false,
  acted_at      timestamptz not null default now(),
  metadata      jsonb not null default '{}'::jsonb
);

create index if not exists storage_object_lifecycle_acted_at_idx
  on public.storage_object_lifecycle (acted_at desc);

create index if not exists storage_object_lifecycle_bucket_idx
  on public.storage_object_lifecycle (bucket_id, acted_at desc);

alter table public.storage_object_lifecycle enable row level security;

-- The audit table is admin-only.  No anon / authenticated read.
drop policy if exists storage_lifecycle_admin_read
  on public.storage_object_lifecycle;
create policy storage_lifecycle_admin_read
  on public.storage_object_lifecycle
  for select
  to service_role
  using (true);

-- ---------- orphan-object purger -------------------------------------------
-- Walks storage.objects for the avatars + attachments buckets.  Splits
-- `name` on '/' to extract the owner-uuid prefix (matching the path
-- convention enforced by RLS in 20260501120800_storage_buckets.sql).  Any
-- object whose prefix has no matching row in auth.users is considered an
-- orphan and queued for deletion.
--
-- batch_size limits how many orphans are removed per call (default 1000),
-- preventing a single sweep from holding write locks for minutes when the
-- backlog is large.
--
-- dry_run = true logs candidate deletions to storage_object_lifecycle
-- without actually removing rows from storage.objects, so an operator can
-- see what *would* be purged before allowing a real run.
--
-- Returns the number of rows actually deleted (0 in dry_run mode).
create or replace function public.purge_orphan_storage_objects(
  batch_size int default 1000,
  dry_run    boolean default false
)
returns int
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  victim record;
  deleted_count int := 0;
begin
  if batch_size <= 0 then
    raise exception 'batch_size must be positive (got %)', batch_size;
  end if;

  for victim in
    select o.id, o.bucket_id, o.name
    from storage.objects o
    where o.bucket_id in ('avatars', 'attachments')
      and (storage.foldername(o.name))[1]::uuid not in (
        select id from auth.users
      )
    limit batch_size
  loop
    insert into public.storage_object_lifecycle (
      bucket_id, object_name, reason, dry_run, metadata
    )
    values (
      victim.bucket_id,
      victim.name,
      'orphan_user',
      dry_run,
      jsonb_build_object(
        'object_id', victim.id,
        'extracted_owner', (storage.foldername(victim.name))[1]
      )
    );

    if not dry_run then
      delete from storage.objects where id = victim.id;
      deleted_count := deleted_count + 1;
    end if;
  end loop;

  return deleted_count;
end;
$$;

-- ---------- support-attachment retention purger -----------------------------
-- Finds objects under attachments/<user_id>/support/<ticket_id>/* that are
-- older than retention_days AND whose ticket has status = 'closed' or
-- 'resolved'.  Default retention = 90 days, matching standard SaaS support
-- retention.  Tickets that are still open are never purged regardless of age.
--
-- Like the orphan purger, batched and dry-runnable.
create or replace function public.purge_old_support_attachments(
  retention_days int default 90,
  batch_size     int default 1000,
  dry_run        boolean default false
)
returns int
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  victim record;
  deleted_count int := 0;
  cutoff timestamptz;
begin
  if retention_days <= 0 then
    raise exception 'retention_days must be positive (got %)', retention_days;
  end if;
  if batch_size <= 0 then
    raise exception 'batch_size must be positive (got %)', batch_size;
  end if;

  cutoff := now() - make_interval(days => retention_days);

  for victim in
    select o.id, o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'attachments'
      and o.created_at < cutoff
      -- support/<ticket_id> path convention (3rd segment is the ticket)
      and (storage.foldername(o.name))[2] = 'support'
      and exists (
        select 1
        from public.support_tickets st
        where st.id::text = (storage.foldername(o.name))[3]
          and st.status in ('closed', 'resolved')
      )
    limit batch_size
  loop
    insert into public.storage_object_lifecycle (
      bucket_id, object_name, reason, dry_run, metadata
    )
    values (
      victim.bucket_id,
      victim.name,
      'support_retention',
      dry_run,
      jsonb_build_object(
        'object_id', victim.id,
        'created_at', victim.created_at,
        'retention_days', retention_days,
        'ticket_id', (storage.foldername(victim.name))[3]
      )
    );

    if not dry_run then
      delete from storage.objects where id = victim.id;
      deleted_count := deleted_count + 1;
    end if;
  end loop;

  return deleted_count;
end;
$$;

-- ---------- privileges ------------------------------------------------------
revoke all on function public.purge_orphan_storage_objects(int, boolean) from public;
revoke all on function public.purge_old_support_attachments(int, int, boolean) from public;
grant execute on function public.purge_orphan_storage_objects(int, boolean) to service_role;
grant execute on function public.purge_old_support_attachments(int, int, boolean) to service_role;

-- ---------- daily cron schedule (best-effort) -------------------------------
-- pg_cron is available on Supabase but not on vanilla Postgres images.  Wrap
-- in a conditional so this migration applies cleanly in CI.  When pg_cron
-- *is* available, schedule the two purges nightly at 03:00 UTC (off-peak).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    -- Idempotent: drop any prior schedule before recreating.
    perform cron.unschedule(jobid)
    from cron.job
    where jobname in (
      'seerah_purge_orphan_storage_objects',
      'seerah_purge_old_support_attachments'
    );

    perform cron.schedule(
      'seerah_purge_orphan_storage_objects',
      '0 3 * * *',
      $cron$ select public.purge_orphan_storage_objects(1000, false); $cron$
    );

    perform cron.schedule(
      'seerah_purge_old_support_attachments',
      '15 3 * * *',
      $cron$ select public.purge_old_support_attachments(90, 1000, false); $cron$
    );
  end if;
end
$$;
