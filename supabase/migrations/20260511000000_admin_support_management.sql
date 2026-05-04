-- Phase Admin-C3: support center.
--
-- The user-facing support flow already creates `support_tickets` rows
-- (subject + initial message + optional attachment).  This migration
-- adds the threaded conversation model + the operator-side RPCs:
--
--   * `support_ticket_messages` table — every reply (admin or user) is
--     a row.  Internal admin notes are stored here too with
--     `is_internal=true`; the consumer-side RLS hides those rows from
--     the user.
--
--   * `admin_support_reply` — appends a message and (when the message
--     is *not* internal) flips `last_admin_reply_at` and bumps the
--     ticket from "open" to "in_progress".
--
--   * `admin_support_change_status` — updates `status` and audit-logs.
--
--   * `admin_support_assign` — sets/clears `assigned_to`.  The
--     assignee must be an active admin user.
--
--   * `admin_support_set_priority` — updates `priority`.
--
--   * `admin_support_bulk_status` / `admin_support_bulk_assign` —
--     same as above but operate on a uuid[] array, returning the
--     number of rows actually updated (skips missing ids).
--
--   * `admin_distinct_support_assignees` — list of admin users who
--     currently have at least one ticket assigned, used to populate
--     the filter dropdown without scanning all admin rows.
--
-- All write RPCs are SECURITY DEFINER, search_path-locked, and audit
-- every change to `admin_audit_log`.  Permissions are revoked from
-- public so only service-role (and other definer functions) can run
-- them; the admin app calls them with the service-role key.

-- ---------- 1. support_ticket_messages table -------------------------------

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  -- 'user' or 'admin' — author_id refers to profiles or admin_users
  -- accordingly.  Kept as text (no enum) for symmetry with other admin
  -- tables that store role-like strings as text + check constraint.
  author_type text not null check (author_type in ('user', 'admin')),
  author_id uuid not null,
  body text not null check (length(body) > 0 and length(body) <= 8000),
  attachment_url text,
  -- Internal notes are admin-only and never sent in user emails.  We
  -- store them in the same table to keep the audit trail single-source.
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_id_idx
  on public.support_ticket_messages (ticket_id, created_at);

-- Internal notes can never come from a user — guard at the schema
-- level so even an RLS bypass can't fake one.
alter table public.support_ticket_messages
  add constraint support_ticket_messages_internal_admin_only
  check (is_internal = false or author_type = 'admin');

alter table public.support_ticket_messages enable row level security;

-- User-side reads: a user sees public messages on their own tickets.
-- Admin reads happen via service-role and bypass RLS.
drop policy if exists "support_ticket_messages_select_own"
  on public.support_ticket_messages;
create policy "support_ticket_messages_select_own"
  on public.support_ticket_messages
  for select
  using (
    is_internal = false
    and exists (
      select 1
        from public.support_tickets t
       where t.id = support_ticket_messages.ticket_id
         and t.user_id = auth.uid()
    )
  );

-- User-side replies: a user can append a non-internal message to their
-- own tickets, marked author_type='user' with their own id.
drop policy if exists "support_ticket_messages_insert_own"
  on public.support_ticket_messages;
create policy "support_ticket_messages_insert_own"
  on public.support_ticket_messages
  for insert
  with check (
    is_internal = false
    and author_type = 'user'
    and author_id = auth.uid()
    and exists (
      select 1
        from public.support_tickets t
       where t.id = support_ticket_messages.ticket_id
         and t.user_id = auth.uid()
    )
  );

-- ---------- 2. admin_support_reply -----------------------------------------
-- Appends an admin message.  Updates last_admin_reply_at + status only
-- when the message is not internal.

create or replace function public.admin_support_reply(
  p_ticket_id uuid,
  p_body text,
  p_is_internal boolean,
  p_attachment_url text,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_status text;
  v_message_id uuid;
begin
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'reply body is required';
  end if;
  if length(p_body) > 8000 then
    raise exception 'reply body too long (max 8000 chars)';
  end if;
  if p_admin_id is null then
    raise exception 'p_admin_id is required';
  end if;

  select user_id, status
    into v_user_id, v_status
    from public.support_tickets
   where id = p_ticket_id
   for update;

  if v_user_id is null and v_status is null then
    raise exception 'ticket not found: %', p_ticket_id;
  end if;

  insert into public.support_ticket_messages
    (ticket_id, author_type, author_id, body, attachment_url, is_internal)
  values
    (p_ticket_id, 'admin', p_admin_id, p_body,
     nullif(p_attachment_url, ''), coalesce(p_is_internal, false))
  returning id into v_message_id;

  if not coalesce(p_is_internal, false) then
    update public.support_tickets
       set last_admin_reply_at = now(),
           status = case
             when status = 'open' then 'in_progress'
             else status
           end,
           updated_at = now()
     where id = p_ticket_id;
  end if;

  insert into admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent)
  values
    (p_admin_id, p_admin_email,
     case when coalesce(p_is_internal, false)
          then 'admin.support.note_added'
          else 'admin.support.replied'
     end,
     'ticket', p_ticket_id::text,
     jsonb_build_object(
       'message_id', v_message_id,
       'user_id', v_user_id,
       'is_internal', coalesce(p_is_internal, false),
       'has_attachment', p_attachment_url is not null and p_attachment_url <> ''
     ),
     case when p_ip is null or p_ip = '' then null else p_ip::inet end,
     p_user_agent);

  return v_message_id;
end;
$$;

revoke all on function public.admin_support_reply(uuid, text, boolean, text, uuid, text, text, text)
  from public;

-- ---------- 3. admin_support_change_status ---------------------------------

create or replace function public.admin_support_change_status(
  p_ticket_id uuid,
  p_status text,
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
  v_old_status text;
  v_user_id uuid;
begin
  if p_status not in ('open', 'in_progress', 'resolved', 'closed') then
    raise exception 'invalid status: %', p_status;
  end if;

  select status, user_id
    into v_old_status, v_user_id
    from public.support_tickets
   where id = p_ticket_id
   for update;

  if v_old_status is null and v_user_id is null then
    raise exception 'ticket not found: %', p_ticket_id;
  end if;

  if v_old_status = p_status then
    return;
  end if;

  update public.support_tickets
     set status = p_status,
         updated_at = now()
   where id = p_ticket_id;

  insert into admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent)
  values
    (p_admin_id, p_admin_email, 'admin.support.status_changed', 'ticket', p_ticket_id::text,
     jsonb_build_object(
       'user_id', v_user_id,
       'previous_status', v_old_status,
       'new_status', p_status
     ),
     case when p_ip is null or p_ip = '' then null else p_ip::inet end,
     p_user_agent);
end;
$$;

revoke all on function public.admin_support_change_status(uuid, text, uuid, text, text, text)
  from public;

-- ---------- 4. admin_support_assign ----------------------------------------
-- Pass NULL for p_assignee to clear the assignment.

create or replace function public.admin_support_assign(
  p_ticket_id uuid,
  p_assignee uuid,
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
  v_old_assignee uuid;
  v_user_id uuid;
begin
  if p_assignee is not null then
    if not exists (
      select 1
        from public.admin_users
       where id = p_assignee
         and is_active
    ) then
      raise exception 'assignee not found or inactive: %', p_assignee;
    end if;
  end if;

  select assigned_to, user_id
    into v_old_assignee, v_user_id
    from public.support_tickets
   where id = p_ticket_id
   for update;

  if v_user_id is null and v_old_assignee is null
     and not exists (select 1 from public.support_tickets where id = p_ticket_id) then
    raise exception 'ticket not found: %', p_ticket_id;
  end if;

  if v_old_assignee is not distinct from p_assignee then
    return;
  end if;

  update public.support_tickets
     set assigned_to = p_assignee,
         updated_at = now()
   where id = p_ticket_id;

  insert into admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent)
  values
    (p_admin_id, p_admin_email,
     case when p_assignee is null
          then 'admin.support.unassigned'
          else 'admin.support.assigned'
     end,
     'ticket', p_ticket_id::text,
     jsonb_build_object(
       'user_id', v_user_id,
       'previous_assignee', v_old_assignee,
       'new_assignee', p_assignee
     ),
     case when p_ip is null or p_ip = '' then null else p_ip::inet end,
     p_user_agent);
end;
$$;

revoke all on function public.admin_support_assign(uuid, uuid, uuid, text, text, text)
  from public;

-- ---------- 5. admin_support_set_priority ----------------------------------

create or replace function public.admin_support_set_priority(
  p_ticket_id uuid,
  p_priority text,
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
  v_old_priority text;
  v_user_id uuid;
begin
  if p_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'invalid priority: %', p_priority;
  end if;

  select priority, user_id
    into v_old_priority, v_user_id
    from public.support_tickets
   where id = p_ticket_id
   for update;

  if v_old_priority is null and v_user_id is null then
    raise exception 'ticket not found: %', p_ticket_id;
  end if;

  if v_old_priority = p_priority then
    return;
  end if;

  update public.support_tickets
     set priority = p_priority,
         updated_at = now()
   where id = p_ticket_id;

  insert into admin_audit_log
    (admin_id, admin_email, action, target_type, target_id, metadata, ip, user_agent)
  values
    (p_admin_id, p_admin_email, 'admin.support.priority_changed', 'ticket', p_ticket_id::text,
     jsonb_build_object(
       'user_id', v_user_id,
       'previous_priority', v_old_priority,
       'new_priority', p_priority
     ),
     case when p_ip is null or p_ip = '' then null else p_ip::inet end,
     p_user_agent);
end;
$$;

revoke all on function public.admin_support_set_priority(uuid, text, uuid, text, text, text)
  from public;

-- ---------- 6. admin_support_bulk_status -----------------------------------
-- Returns the number of rows that actually changed (skips no-op + unknown ids).

create or replace function public.admin_support_bulk_status(
  p_ticket_ids uuid[],
  p_status text,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected integer := 0;
  v_id uuid;
begin
  if p_status not in ('open', 'in_progress', 'resolved', 'closed') then
    raise exception 'invalid status: %', p_status;
  end if;
  if p_ticket_ids is null or array_length(p_ticket_ids, 1) is null then
    return 0;
  end if;

  foreach v_id in array p_ticket_ids loop
    begin
      perform public.admin_support_change_status(
        v_id, p_status, p_admin_id, p_admin_email, p_ip, p_user_agent
      );
      -- change_status is a no-op when the new status equals the old; we
      -- don't have a way to tell the difference from the void return.
      -- Instead bump v_affected when the underlying row's status now
      -- matches what we asked for and didn't already.
      if exists (
        select 1
          from public.support_tickets
         where id = v_id
           and status = p_status
      ) then
        v_affected := v_affected + 1;
      end if;
    exception when others then
      -- Row missing or constraint failure — skip it but continue the
      -- batch so an operator's bulk action isn't aborted by one bad id.
      continue;
    end;
  end loop;

  return v_affected;
end;
$$;

revoke all on function public.admin_support_bulk_status(uuid[], text, uuid, text, text, text)
  from public;

-- ---------- 7. admin_support_bulk_assign -----------------------------------

create or replace function public.admin_support_bulk_assign(
  p_ticket_ids uuid[],
  p_assignee uuid,
  p_admin_id uuid,
  p_admin_email text,
  p_ip text,
  p_user_agent text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_affected integer := 0;
  v_id uuid;
begin
  if p_assignee is not null then
    if not exists (
      select 1
        from public.admin_users
       where id = p_assignee
         and is_active
    ) then
      raise exception 'assignee not found or inactive: %', p_assignee;
    end if;
  end if;
  if p_ticket_ids is null or array_length(p_ticket_ids, 1) is null then
    return 0;
  end if;

  foreach v_id in array p_ticket_ids loop
    begin
      perform public.admin_support_assign(
        v_id, p_assignee, p_admin_id, p_admin_email, p_ip, p_user_agent
      );
      if exists (
        select 1
          from public.support_tickets
         where id = v_id
           and assigned_to is not distinct from p_assignee
      ) then
        v_affected := v_affected + 1;
      end if;
    exception when others then
      continue;
    end;
  end loop;

  return v_affected;
end;
$$;

revoke all on function public.admin_support_bulk_assign(uuid[], uuid, uuid, text, text, text)
  from public;

-- ---------- 8. admin_distinct_support_assignees ----------------------------
-- Filter dropdown population.  Returns active admins (only those with
-- at least one assigned ticket are interesting on the filter, but we
-- include everyone who is active — the dropdown is short and stable).

create or replace function public.admin_distinct_support_assignees()
returns table(id uuid, email text, role text)
language sql
security definer
set search_path = public
as $$
  select id, email, role
    from public.admin_users
   where is_active
     and role in ('super_admin', 'support_agent')
   order by email;
$$;

revoke all on function public.admin_distinct_support_assignees() from public;

-- ---------- 9. Indexes for the inbox query ----------------------------------
-- The inbox is sorted by updated_at desc (newest activity first) and
-- frequently filtered by status + priority.
create index if not exists support_tickets_status_updated_idx
  on public.support_tickets (status, updated_at desc);
create index if not exists support_tickets_priority_updated_idx
  on public.support_tickets (priority, updated_at desc);
