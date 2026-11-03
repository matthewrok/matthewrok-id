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


-- Called only by the authenticated Telegram webhook through the service role.
-- Status change and Inbox delivery happen in one database transaction.
create or replace function public.process_worker_application_decision(
  p_application_id uuid,
  p_decision text,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app public.worker_applications%rowtype;
  v_message_id uuid;
  v_title text;
  v_body text;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_actor_id and p.role in ('admin', 'MATTHEW')
  ) then
    raise exception 'Decision actor is not an authorized admin';
  end if;

  select * into v_app
  from public.worker_applications
  where id = p_application_id
  for update;

  if not found then raise exception 'Application not found'; end if;
  if v_app.status <> 'pending' then raise exception 'Application already processed'; end if;
  if v_app.applicant_id is null then raise exception 'Applicant must have a member account'; end if;

  if p_decision = 'approved' then
    v_title := 'Pendaftaran Worker Disetujui';
    v_body := 'Selamat! Anda telah bergabung menjadi bagian dari MATTHEW. Selanjutnya, data dan proses bergabung Anda akan kami tindak lanjuti. Terus semangat, jaga komunikasi, dan berikan kontribusi terbaik. Kami berharap ini menjadi awal kerja sama yang positif dan berkembang bersama.';
  else
    v_title := 'Informasi Hasil Pendaftaran Worker';
    v_body := 'Terima kasih telah meluangkan waktu dan menunjukkan minat untuk bergabung bersama MATTHEW. Setelah mempertimbangkan pendaftaran Anda, saat ini kami belum dapat melanjutkan proses penerimaan. Keputusan ini tidak mengurangi apresiasi kami atas usaha dan ketertarikan Anda. Semoga kesempatan yang lebih sesuai segera datang, dan terima kasih telah memahami.';
  end if;

  update public.worker_applications
  set status = p_decision,
      decision_note = v_body,
      decided_at = now()
  where id = p_application_id;

  insert into public.inbox_messages(sender_id, title, body, audience, recipient_id)
  values (p_actor_id, v_title, v_body, 'user', v_app.applicant_id)
  returning id into v_message_id;

  insert into public.inbox_recipients(message_id, user_id)
  values (v_message_id, v_app.applicant_id)
  on conflict (message_id, user_id) do nothing;

  return v_message_id;
end;
$$;

revoke all on function public.process_worker_application_decision(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.process_worker_application_decision(uuid, text, uuid) to service_role;


-- Allow the MATTHEW operator role to resolve member names when addressing Inbox messages.
drop policy if exists "MATTHEW can view profiles for inbox" on public.profiles;
create policy "MATTHEW can view profiles for inbox"
on public.profiles
for select to authenticated
using (
  exists (
    select 1 from public.profiles operator_profile
    where operator_profile.id = (select auth.uid())
      and operator_profile.role in ('admin', 'MATTHEW')
  )
);
