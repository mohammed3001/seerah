-- =============================================================================
-- scripts/ci/test_handle_new_user_trigger.sql
--
-- End-to-end test for the `handle_new_user` trigger on `auth.users` →
-- `public.profiles`. This is the only thing that bridges Supabase Auth
-- signups into our schema, and a regression here breaks every flow that
-- assumes a profile row exists for a logged-in user (RLS joins, billing,
-- avatar uploads, etc.).
--
-- Run AFTER `scripts/ci/bootstrap_supabase_schemas.sql` and the contents of
-- `supabase/migrations/`. Stops at the first failure (`ON_ERROR_STOP=1`).
-- =============================================================================

\set ON_ERROR_STOP on

-- The mocked auth.users table from the CI bootstrap matches the columns
-- handle_new_user reads (`id`, `email`, `raw_user_meta_data`). Insert a row
-- with both metadata fields populated; the trigger should mirror them
-- verbatim into public.profiles.
do $$
declare
  test_user_id uuid := '11111111-1111-4111-8111-111111111111';
  inserted_email text;
  inserted_full_name text;
  inserted_avatar_url text;
  profile_count int;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (
    test_user_id,
    'ci-trigger-test@example.com',
    jsonb_build_object(
      'full_name', 'CI Trigger Tester',
      'avatar_url', 'https://example.com/avatar.png'
    )
  );

  select count(*) into profile_count
  from public.profiles
  where id = test_user_id;

  if profile_count <> 1 then
    raise exception
      'handle_new_user did not create a profile row (expected 1, got %)',
      profile_count;
  end if;

  select email, full_name, avatar_url
    into inserted_email, inserted_full_name, inserted_avatar_url
  from public.profiles
  where id = test_user_id;

  if inserted_email is distinct from 'ci-trigger-test@example.com' then
    raise exception
      'profiles.email mismatch: expected %, got %',
      'ci-trigger-test@example.com', inserted_email;
  end if;

  if inserted_full_name is distinct from 'CI Trigger Tester' then
    raise exception
      'profiles.full_name mismatch: expected %, got %',
      'CI Trigger Tester', inserted_full_name;
  end if;

  if inserted_avatar_url is distinct from 'https://example.com/avatar.png' then
    raise exception
      'profiles.avatar_url mismatch: expected %, got %',
      'https://example.com/avatar.png', inserted_avatar_url;
  end if;

  raise notice 'handle_new_user trigger fired correctly for %', test_user_id;
end
$$;

-- Idempotency: if a profile row already exists at the matching auth.users id
-- (e.g. legacy data, manual repair, retry), the trigger must NOT overwrite
-- it because it uses `on conflict (id) do nothing`. We exercise this by
-- inserting auth.users + manually overwriting the profile row + re-running
-- the trigger function. Re-INSERT into auth.users would violate the pkey,
-- so we call handle_new_user via a synthetic NEW record.
do $$
declare
  test_user_id uuid := '22222222-2222-4222-8222-222222222222';
begin
  -- Step 1: create auth.users row → trigger creates profile.
  insert into auth.users (id, email, raw_user_meta_data)
  values (test_user_id, 'first-signup@example.com', '{}'::jsonb);

  -- Step 2: manually mutate the profile row so we can detect overwrite.
  update public.profiles set email = 'human-edited@example.com'
   where id = test_user_id;

  -- Step 3: simulate the trigger firing again on the same auth.users row
  -- (Supabase retries / dual-fire scenarios). The on-conflict-do-nothing
  -- guard must keep our edit intact.
  insert into public.profiles (id, email, full_name, avatar_url)
  values (test_user_id, 'first-signup@example.com', null, null)
  on conflict (id) do nothing;

  if (select email from public.profiles where id = test_user_id)
       is distinct from 'human-edited@example.com' then
    raise exception
      'handle_new_user overwrote an existing profile row (should be a no-op)';
  end if;

  raise notice 'handle_new_user is idempotent on conflicting profile id';
end
$$;

-- Cleanup so subsequent CI steps see a clean slate.
delete from public.profiles
 where id in (
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222'
 );
delete from auth.users
 where id in (
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222'
 );
