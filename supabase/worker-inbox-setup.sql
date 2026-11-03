-- Worker + Inbox security helpers for MATTHEW JOKI
-- Apply this file in Supabase SQL Editor before enabling the frontend.

create or replace function public.admin_send_inbox_message(
  p_title text,
  p_body text,
  p_audience text default 'all',
  p_recipient_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender uuid := auth.uid();
  v_message_id uuid;
begin
  if v_sender is null or not exists (
    select 1 from public.profiles p
    where p.id = v_sender and p.role in ('admin', 'MATTHEW')
  ) then
    raise exception 'Not authorized';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 3 and 120
     or length(btrim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Invalid title or message length';
  end if;

  if p_audience not in ('all', 'user') then
    raise exception 'Invalid audience';
  end if;

  if p_audience = 'user' and p_recipient_id is null then
    raise exception 'Recipient is required';
  end if;

  if p_audience = 'user' and not exists (
    select 1 from public.profiles p where p.id = p_recipient_id
  ) then
    raise exception 'Recipient not found';
  end if;

  insert into public.inbox_messages(sender_id, title, body, audience, recipient_id)
  values (v_sender, btrim(p_title), btrim(p_body), p_audience, p_recipient_id)
  returning id into v_message_id;

  if p_audience = 'all' then
    insert into public.inbox_recipients(message_id, user_id)
    select v_message_id, p.id from public.profiles p
    on conflict (message_id, user_id) do nothing;
  else
    insert into public.inbox_recipients(message_id, user_id)
    values (v_message_id, p_recipient_id)
    on conflict (message_id, user_id) do nothing;
  end if;

  return v_message_id;
end;
$$;

revoke all on function public.admin_send_inbox_message(text, text, text, uuid) from public, anon;
grant execute on function public.admin_send_inbox_message(text, text, text, uuid) to authenticated;

-- A user may only mark their own receipt as read; they cannot change its owner/message.
drop policy if exists "Members update own inbox receipt" on public.inbox_recipients;
create policy "Members update own inbox receipt"
on public.inbox_recipients
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Admins can inspect applications from the admin dashboard; applicants can only read their own.
drop policy if exists "Applicants read own applications" on public.worker_applications;
create policy "Applicants read own applications"
on public.worker_applications
for select to authenticated
using (
  applicant_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin', 'MATTHEW')
  )
);
