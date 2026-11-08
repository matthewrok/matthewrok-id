-- MATTHEW JOKI — automatic Warga membership roles.
-- Apply this migration to Supabase only after reviewing the PR and taking a database backup.
-- Completed orders are counted by verified account email and status = 'Selesai'.
-- WARGA BIASA: 0-6, WARGA TIDAK BIASA: 7-18, WARGA SULTAN: 19+.
-- ADMIN is preserved and never changed by the membership trigger.

begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

-- Normalize legacy roles before enforcing the new allowlist.
-- Historical completed-order counts are recalculated below.
update public.profiles
set role = 'warga biasa'
where role is distinct from 'admin';
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array[
    'admin'::text,
    'warga biasa'::text,
    'warga tidak biasa'::text,
    'warga sultan'::text
  ]));
alter table public.profiles
  alter column role set default 'warga biasa';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'warga biasa'
  );
  return new;
end;
$function$;

create or replace function public.sync_warga_membership_role(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_completed_orders integer;
  v_role text;
begin
  if p_email is null or btrim(p_email) = '' then
    return;
  end if;

  select count(*)::integer
    into v_completed_orders
  from public.joki_progress j
  where lower(btrim(coalesce(j.client_email, ''))) = lower(btrim(p_email))
    and lower(btrim(coalesce(j.status, ''))) = 'selesai';

  v_role := case
    when v_completed_orders >= 19 then 'warga sultan'
    when v_completed_orders >= 7 then 'warga tidak biasa'
    else 'warga biasa'
  end;

  update public.profiles p
  set role = v_role
  from auth.users u
  where u.id = p.id
    and lower(btrim(coalesce(u.email, ''))) = lower(btrim(p_email))
    and p.role <> 'admin'
    and p.role is distinct from v_role;
end;
$function$;

revoke all on function public.sync_warga_membership_role(text) from public, anon, authenticated;

create or replace function public.sync_warga_membership_role_from_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.sync_warga_membership_role(old.client_email);
    return old;
  end if;

  if tg_op = 'UPDATE'
     and lower(btrim(coalesce(old.client_email, ''))) <> lower(btrim(coalesce(new.client_email, ''))) then
    perform public.sync_warga_membership_role(old.client_email);
  end if;

  perform public.sync_warga_membership_role(new.client_email);
  return new;
end;
$function$;

revoke all on function public.sync_warga_membership_role_from_order() from public, anon, authenticated;

drop trigger if exists trg_sync_warga_membership_role_insert_delete on public.joki_progress;
create trigger trg_sync_warga_membership_role_insert_delete
after insert or delete on public.joki_progress
for each row
execute function public.sync_warga_membership_role_from_order();

drop trigger if exists trg_sync_warga_membership_role_update on public.joki_progress;
create trigger trg_sync_warga_membership_role_update
after update of status, client_email on public.joki_progress
for each row
execute function public.sync_warga_membership_role_from_order();

-- Backfill all existing accounts using their historical completed orders.
do $block$
declare
  v_profile record;
begin
  for v_profile in
    select u.email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role <> 'admin'
  loop
    perform public.sync_warga_membership_role(v_profile.email);
  end loop;
end;
$block$;

-- Remove manual role promotion. Role changes now come only from completed-order counts.
drop function if exists public.admin_set_member_role(uuid, text);

-- Worker application status/type remains separate from account role.
-- Approval and termination must never overwrite a member's automatic Warga role.
create or replace function public.process_worker_application_decision(
  p_application_id uuid,
  p_decision text,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_app public.worker_applications%rowtype;
  v_message_id uuid;
  v_title text;
  v_body text;
begin
  if p_decision not in ('approved', 'rejected', 'terminated') then
    raise exception 'Invalid decision';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_actor_id
      and p.role = 'admin'
      and lower(coalesce(p.account_status, '')) = 'active'
  ) then
    raise exception 'Decision actor is not an active admin';
  end if;

  select * into v_app
  from public.worker_applications
  where id = p_application_id
  for update;

  if not found then raise exception 'Application not found'; end if;
  if v_app.applicant_id is null then raise exception 'Applicant must have a member account'; end if;

  if p_decision = 'approved' then
    if v_app.status <> 'pending' then raise exception 'Only pending applications can be approved'; end if;
    v_title := 'Pendaftaran Worker Disetujui';
    v_body := 'Selamat! Pendaftaran Worker Anda telah disetujui. Jenis tugas dan status kerja dicatat terpisah dari Role akun. Role Warga Anda tetap ditentukan otomatis berdasarkan jumlah pesanan yang selesai.';
  elsif p_decision = 'rejected' then
    if v_app.status <> 'pending' then raise exception 'Only pending applications can be rejected'; end if;
    v_title := 'Informasi Hasil Pendaftaran Worker';
    v_body := 'Terima kasih atas minat Anda untuk bergabung bersama MATTHEW. Setelah mempertimbangkan pendaftaran, saat ini kami belum dapat melanjutkan proses penerimaan. Terima kasih telah memahami.';
  else
    if v_app.status <> 'approved' then raise exception 'Only active approved workers can be terminated'; end if;
    v_title := 'Pemberitahuan Pemberhentian Worker';
    v_body := 'Status pendaftaran Worker Anda telah dihentikan. Perubahan ini tidak mengubah Role Warga pada akun Anda.';
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
$function$;

revoke all on function public.process_worker_application_decision(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.process_worker_application_decision(uuid, text, uuid) to service_role;

-- Retire the former MATTHEW operator privilege; only ADMIN manages worker decisions and profiles.
create or replace function private.is_matthew_operator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and lower(coalesce(p.account_status, '')) = 'active'
  );
$function$;
revoke all on function private.is_matthew_operator() from public, anon;
grant execute on function private.is_matthew_operator() to authenticated;

-- Update the role allowlists inside the two deployed order RPCs without changing their other safeguards.
do $block$
declare
  v_signature text;
  v_oid regprocedure;
  v_definition text;
  v_updated text;
begin
  foreach v_signature in array array[
    'public.create_joki_order(text,text,text,integer,text,text)',
    'public.create_joki_order_secure(text,text,text,integer,text,text)'
  ]
  loop
    v_oid := to_regprocedure(v_signature);
    if v_oid is not null then
      v_definition := pg_get_functiondef(v_oid);
      v_updated := regexp_replace(
        v_definition,
        E'v_role not in \\([^)]*\\)',
        'v_role not in (''warga biasa'', ''warga tidak biasa'', ''warga sultan'')',
        'g'
      );
      if v_updated = v_definition then
        raise exception 'Could not safely update role allowlist in %', v_signature;
      end if;
      execute v_updated;
    end if;
  end loop;
end;
$block$;

commit;
