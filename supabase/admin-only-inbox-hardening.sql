-- Restrict official Inbox sending and receipt administration to role=admin only.
-- The Edge Function independently verifies the caller before invoking the service-role RPC.
drop policy if exists "Admins create inbox messages" on public.inbox_messages;
create policy "Admins create inbox messages"
on public.inbox_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

drop policy if exists "Members read addressed inbox messages" on public.inbox_messages;
create policy "Members read addressed inbox messages"
on public.inbox_messages for select to authenticated
using (
  exists (
    select 1 from public.inbox_recipients r
    where r.message_id = inbox_messages.id
      and r.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins manage inbox receipts" on public.inbox_recipients;
create policy "Admins manage inbox receipts"
on public.inbox_recipients for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
);

create or replace function public.service_send_inbox_message(
  p_sender_id uuid,
  p_title text,
  p_body text,
  p_audience text default 'all',
  p_recipient_id uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $function$
declare
  v_message_id uuid;
begin
  if p_sender_id is null or not exists (
    select 1 from public.profiles p
    where p.id = p_sender_id and p.role = 'admin'
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
  values (p_sender_id, btrim(p_title), btrim(p_body), p_audience, p_recipient_id)
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
$function$;

revoke all on function public.service_send_inbox_message(uuid,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.service_send_inbox_message(uuid,text,text,text,uuid) to service_role;
