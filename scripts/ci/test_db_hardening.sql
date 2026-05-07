-- =============================================================================
-- scripts/ci/test_db_hardening.sql
--
-- Regression tests for the four behaviours introduced by
-- 20260517000000_db_hardening.sql:
--
--   1. completion_score auto-updates when a section row is inserted.
--   2. resume_views INSERT increments resumes.views_count.
--   3. max_resumes cap is enforced at INSERT time.
--   4. custom_url / slug CHECK constraints reject invalid shapes.
-- =============================================================================

\set ON_ERROR_STOP on

-- ---------- shared fixture --------------------------------------------------
do $$
declare
  v_user_id uuid := '22222222-2222-4222-8222-222222222222';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_user_id, 'hardening@example.test', '{"full_name":"Hardening User"}'::jsonb)
  on conflict (id) do nothing;

  -- handle_new_user is on auth.users → public.profiles. Make sure it ran.
  if not exists (select 1 from public.profiles where id = v_user_id) then
    insert into public.profiles (id, email, full_name, plan, max_resumes)
    values (v_user_id, 'hardening@example.test', 'Hardening User', 'free', 1);
  end if;
end
$$;

-- ---------- 1. completion_score auto-update ---------------------------------
do $$
declare
  v_user_id uuid := '22222222-2222-4222-8222-222222222222';
  v_resume_id uuid;
  v_score int;
begin
  insert into public.resumes (user_id, title, slug, template_id)
  values (v_user_id, 'Hardening Resume', 'hardening-resume', 'template_clean_01')
  returning id into v_resume_id;

  -- Brand new resume with zero sections → score should be 0.
  select completion_score into v_score
    from public.resumes where id = v_resume_id;
  if v_score <> 0 then
    raise exception
      'completion_score expected 0 on empty resume, got %', v_score;
  end if;

  -- Insert personal_info with full_name → score must rise to 10.
  insert into public.personal_info (resume_id, full_name)
  values (v_resume_id, 'Hardening User');

  select completion_score into v_score
    from public.resumes where id = v_resume_id;
  if v_score <> 10 then
    raise exception
      'completion_score expected 10 after personal_info insert, got %', v_score;
  end if;

  -- Add experience row → +20 points (=30).
  insert into public.experience (resume_id, company, job_title)
  values (v_resume_id, 'Acme', 'Engineer');

  select completion_score into v_score
    from public.resumes where id = v_resume_id;
  if v_score <> 30 then
    raise exception
      'completion_score expected 30 after experience insert, got %', v_score;
  end if;

  -- Delete experience → score must drop back to 10.
  delete from public.experience where resume_id = v_resume_id;

  select completion_score into v_score
    from public.resumes where id = v_resume_id;
  if v_score <> 10 then
    raise exception
      'completion_score expected 10 after experience delete, got %', v_score;
  end if;

  raise notice 'PASS: completion_score auto-updates on section changes';
end
$$;

-- ---------- 2. views_count auto-increment -----------------------------------
-- Run the INSERTs as the `anon` role so the test exercises the same
-- RLS path as a real public-facing /r/<slug> view. Without
-- `security definer` on the trigger, the inner UPDATE would silently
-- match 0 rows under the `resumes_update_own` policy and the counter
-- would stay at 0.
do $$
declare
  v_resume_id uuid;
  v_views int;
begin
  select id into v_resume_id from public.resumes
   where slug = 'hardening-resume' limit 1;

  set local role anon;

  insert into public.resume_views (resume_id, viewer_ip)
  values (v_resume_id, '203.0.113.10');
  insert into public.resume_views (resume_id, viewer_ip)
  values (v_resume_id, '203.0.113.11');
  insert into public.resume_views (resume_id, viewer_ip)
  values (v_resume_id, '203.0.113.12');

  reset role;

  select views_count into v_views
    from public.resumes where id = v_resume_id;
  if v_views <> 3 then
    raise exception
      'views_count expected 3 after three anon INSERTs, got %', v_views;
  end if;

  raise notice 'PASS: views_count increments on anonymous resume_views INSERT';
end
$$;

-- ---------- 3. max_resumes cap enforcement ----------------------------------
do $$
declare
  v_user_id uuid := '22222222-2222-4222-8222-222222222222';
  v_caught boolean := false;
begin
  -- Free user already has 1 resume (max_resumes=1). Inserting a second
  -- one must raise the custom exception.
  begin
    insert into public.resumes (user_id, title, slug, template_id)
    values (v_user_id, 'Second Resume', 'second-resume', 'template_clean_01');
  exception
    when others then
      if sqlerrm like 'max_resumes_exceeded%' then
        v_caught := true;
      else
        raise;
      end if;
  end;

  if not v_caught then
    raise exception
      'max_resumes cap was NOT enforced — second INSERT should have failed';
  end if;

  -- Bumping max_resumes to 2 must allow the second insert.
  update public.profiles set max_resumes = 2 where id = v_user_id;
  insert into public.resumes (user_id, title, slug, template_id)
  values (v_user_id, 'Second Resume', 'second-resume', 'template_clean_01');

  raise notice 'PASS: max_resumes cap is enforced at INSERT time';
end
$$;

-- ---------- 4. custom_url + slug CHECK constraints --------------------------
do $$
declare
  v_user_id uuid := '22222222-2222-4222-8222-222222222222';
  v_caught_custom boolean := false;
  v_caught_slug boolean := false;
begin
  -- Reset and let user create one more resume with bad custom_url.
  update public.profiles set max_resumes = 5 where id = v_user_id;

  begin
    insert into public.resumes (user_id, title, slug, template_id, custom_url)
    values (v_user_id, 'Bad URL', 'bad-url', 'template_clean_01', 'NOT VALID!');
  exception
    when check_violation then
      v_caught_custom := true;
  end;

  if not v_caught_custom then
    raise exception 'custom_url CHECK should have rejected "NOT VALID!"';
  end if;

  begin
    insert into public.resumes (user_id, title, slug, template_id)
    values (v_user_id, 'Bad Slug', 'BAD SLUG!!', 'template_clean_01');
  exception
    when check_violation then
      v_caught_slug := true;
  end;

  if not v_caught_slug then
    raise exception 'slug CHECK should have rejected "BAD SLUG!!"';
  end if;

  -- A valid custom_url passes.
  insert into public.resumes (user_id, title, slug, template_id, custom_url)
  values (v_user_id, 'Good URL', 'good-url', 'template_clean_01', 'my-vanity-url');

  raise notice 'PASS: custom_url + slug CHECK constraints reject invalid shapes';
end
$$;
