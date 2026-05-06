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
-- (e.g. legacy data, manual repair, a Supabase signup retry that fires the
-- trigger twice), the trigger must NOT overwrite the existing profile row
-- because it uses `on conflict (id) do nothing`.
--
-- We need to fire the *actual* trigger function with a NEW row whose id
-- already has a profile row attached. Re-INSERTing the same auth.users id
-- would violate the pkey, so we briefly drop the profiles -> auth.users FK,
-- delete the auth.users row (without cascading the profile away), then
-- INSERT a fresh auth.users row at the same id. That second INSERT fires
-- `on_auth_user_created` -> `handle_new_user()` against an existing
-- profile row, exercising the on-conflict path end-to-end.
do $$
declare
  test_user_id uuid := '22222222-2222-4222-8222-222222222222';
  observed_email text;
begin
  -- Step 1: real signup -> trigger creates profile via security-definer path.
  insert into auth.users (id, email, raw_user_meta_data)
  values (test_user_id, 'first-signup@example.com', '{}'::jsonb);

  -- Step 2: human/operator edits the profile row.
  update public.profiles set email = 'human-edited@example.com'
   where id = test_user_id;

  -- Step 3: detach FK so we can swap the auth.users row without
  -- cascade-deleting the profile row we just edited.
  alter table public.profiles drop constraint profiles_id_fkey;

  delete from auth.users where id = test_user_id;

  -- Re-INSERT the auth.users row -> fires `on_auth_user_created` ->
  -- `handle_new_user()` -> attempts to INSERT into profiles. The trigger's
  -- own `on conflict (id) do nothing` should preserve the human edit.
  insert into auth.users (id, email, raw_user_meta_data)
  values (test_user_id, 'second-signup@example.com', '{}'::jsonb);

  -- Restore FK with the same shape declared in the migration.
  alter table public.profiles
    add constraint profiles_id_fkey
    foreign key (id) references auth.users(id) on delete cascade;

  select email into observed_email
  from public.profiles where id = test_user_id;

  if observed_email is distinct from 'human-edited@example.com' then
    raise exception
      'handle_new_user overwrote an existing profile row (got %, expected %)',
      observed_email, 'human-edited@example.com';
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
