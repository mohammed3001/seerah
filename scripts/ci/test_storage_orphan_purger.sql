-- =============================================================================
-- test_storage_orphan_purger.sql
-- Regression test for the orphan-purger ::uuid-cast bug fixed in
-- 20260515000000_storage_lifecycle_fix.sql.
--
-- Pre-fix (with `::uuid` cast):
--   Inserting any object whose first path segment is not a valid UUID
--   (e.g. Supabase's `.emptyFolderPlaceholder`) makes the SELECT inside
--   `purge_orphan_storage_objects` raise `invalid input syntax for type
--   uuid`, aborting the function.  No orphans get purged at all.
--
-- Post-fix (text-vs-text):
--   Non-UUID prefixes are simply not in `auth.users.id::text`, so they
--   are correctly classified as orphans and removed.  Real user-prefixed
--   objects whose owner exists in auth.users are preserved.
-- =============================================================================

\set ON_ERROR_STOP on

begin;

-- 1. seed two known-good auth.users so non-orphan objects survive
do $$
declare
  alive_user uuid := '00000000-0000-0000-0000-000000000a01';
begin
  insert into auth.users (id, email)
  values (alive_user, 'orphan-test-alive@example.com')
  on conflict (id) do nothing;
end $$;

-- 2. seed three storage objects that exercise both code paths:
--    a) a UUID-prefixed object whose owner DOES exist in auth.users (kept)
--    b) a UUID-prefixed object whose owner does NOT exist (orphan)
--    c) a non-UUID-prefixed object (the regression case: pre-fix this
--       row alone would crash the entire purger run)
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('attachments', 'attachments', false)
on conflict (id) do nothing;

insert into storage.objects (bucket_id, name, owner)
values
  ('avatars',     '00000000-0000-0000-0000-000000000a01/avatar.png', null),
  ('avatars',     '99999999-9999-9999-9999-999999999fff/orphan.png', null),
  ('attachments', '.emptyFolderPlaceholder', null);

-- 3. run the purger.  Pre-fix this raised `invalid input syntax for
--    type uuid` here and the test would abort.  Post-fix it returns the
--    delete count cleanly.
select public.purge_orphan_storage_objects(1000, false) as purged_count
\gset

-- 4. verify outcomes
do $$
declare
  remaining_alive int;
  remaining_orphan int;
  remaining_emptyplaceholder int;
  audit_rows int;
begin
  -- alive object survives
  select count(*) into remaining_alive
    from storage.objects
   where bucket_id = 'avatars'
     and name = '00000000-0000-0000-0000-000000000a01/avatar.png';
  if remaining_alive <> 1 then
    raise exception 'expected alive avatar to survive (%)', remaining_alive;
  end if;

  -- orphan with valid uuid prefix is purged
  select count(*) into remaining_orphan
    from storage.objects
   where bucket_id = 'avatars'
     and name = '99999999-9999-9999-9999-999999999fff/orphan.png';
  if remaining_orphan <> 0 then
    raise exception 'orphan avatar should have been purged (%)', remaining_orphan;
  end if;

  -- non-UUID prefix is purged (pre-fix this row would crash the SELECT)
  select count(*) into remaining_emptyplaceholder
    from storage.objects
   where bucket_id = 'attachments'
     and name = '.emptyFolderPlaceholder';
  if remaining_emptyplaceholder <> 0 then
    raise exception
      '.emptyFolderPlaceholder should have been purged as orphan (%)',
      remaining_emptyplaceholder;
  end if;

  -- audit table should have two rows (one per delete)
  select count(*) into audit_rows
    from public.storage_object_lifecycle
   where reason = 'orphan_user';
  if audit_rows <> 2 then
    raise exception 'expected 2 audit rows for orphan_user, got %', audit_rows;
  end if;

  raise notice 'orphan purger crashes-on-non-UUID regression test: PASS';
end $$;

rollback;
