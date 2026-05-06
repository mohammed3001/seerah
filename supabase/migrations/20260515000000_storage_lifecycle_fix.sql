-- =============================================================================
-- 20260515000000_storage_lifecycle_fix.sql
-- Follow-up to 20260512000000_storage_lifecycle.sql.
--
-- The original `purge_orphan_storage_objects` cast the first path segment to
-- `uuid` for the NOT IN comparison.  Any object whose first segment is not a
-- valid UUID -- e.g. Supabase's `.emptyFolderPlaceholder`, or a service-role
-- upload that bypassed the user-prefix path convention -- raises
-- `invalid input syntax for type uuid` at SELECT time, aborting the whole
-- purger run.  This is exactly the orphan class the function was supposed to
-- catch (service-role bypass), so the bug was self-defeating.
--
-- The fix compares as text on both sides: cast the auth.users id to text in
-- the subquery instead of casting the path segment to uuid.  This matches
-- the RLS policy convention in 20260501120800_storage_buckets.sql, which also
-- does text-to-text comparisons for path segment matching.
--
-- Functions are forward-only; we use `create or replace` to swap the body
-- without dropping privileges or breaking the daily pg_cron schedule
-- registered in the original migration.
-- =============================================================================

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
      -- Compare as text on both sides.  Casting the path segment to uuid
      -- raises on non-UUID prefixes (e.g. .emptyFolderPlaceholder), which
      -- aborts the entire SELECT and breaks the purger.  Any non-UUID
      -- prefix is, by definition, not in auth.users, so the text-vs-text
      -- check returns true for it (the orphan is purged).
      and (storage.foldername(o.name))[1] not in (
        select id::text from auth.users
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

-- Privileges are inherited from the original migration; redeclare for safety
-- in case this migration is applied to a database where the original
-- function was dropped and recreated by some other path.
revoke all on function public.purge_orphan_storage_objects(int, boolean) from public;
grant execute on function public.purge_orphan_storage_objects(int, boolean) to service_role;
