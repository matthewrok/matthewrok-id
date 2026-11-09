-- Matthew Automatic Notifications
-- Order status changes are delivered to the matching active member Inbox.
-- Unredeemed claimed vouchers receive one reminder within 24 hours of expiry.
-- Inbox remains the durable notification history and read/unread source.

create schema if not exists private;

create table if not exists private.member_voucher_reminder_deliveries (
  voucher_id uuid not null references public.vouchers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null default 'expiry_24h'
    check (reminder_type = 'expiry_24h'),
  delivered_at timestamptz not null default now(),
  primary key (voucher_id, user_id, reminder_type)
);

alter table private.member_voucher_reminder_deliveries enable row level security;
revoke all on private.member_voucher_reminder_deliveries from public, anon, authenticated;

create index if not exists voucher_claims_unredeemed_user_idx
  on public.voucher_claims (user_id, voucher_id)
  where redeemed_at is null;

create index if not exists vouchers_expiry_reminder_idx
  on public.vouchers (expires_at)
  where is_active = true and expires_at is not null;

create or replace function private.notify_member_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_sender_id uuid;
  v_recipient_id uuid;
  v_message_id uuid;
  v_order_label text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if nullif(lower(trim(coalesce(new.client_email, ''))), '') is null then
    return new;
  end if;

  select p.id into v_sender_id
  from public.profiles p
  where p.role = 'admin' and p.account_status = 'active'
  order by p.created_at asc
  limit 1;

  if v_sender_id is null then
    raise warning 'Matthew notification skipped: no active admin sender profile exists';
    return new;
  end if;

  select p.id into v_recipient_id
  from public.profiles p
  where lower(trim(coalesce(p.email, ''))) = lower(trim(new.client_email))
    and p.account_status = 'active'
    and p.role <> 'admin'
  order by p.created_at asc
  limit 1;

  if v_recipient_id is null then
    return new;
  end if;

  v_order_label := coalesce(nullif(trim(new.order_number), ''), nullif(trim(new.token), ''), new.id::text);

  insert into public.inbox_messages(sender_id, title, body, audience, recipient_id)
  values (
    v_sender_id,
    'Status Pesanan Diperbarui',
    'Pesanan ' || v_order_label || ' sekarang berstatus: ' || new.status ||
      '. Buka halaman Lacak Pesanan untuk melihat detail dan progres terbaru.',
    'user',
    v_recipient_id
  )
  returning id into v_message_id;

  insert into public.inbox_recipients(message_id, user_id)
  values (v_message_id, v_recipient_id)
  on conflict (message_id, user_id) do nothing;

  return new;
end;
$function$;

revoke all on function private.notify_member_order_status_change() from public, anon, authenticated;

drop trigger if exists trg_notify_member_order_status_change on public.joki_progress;
create trigger trg_notify_member_order_status_change
after update of status on public.joki_progress
for each row
when (old.status is distinct from new.status)
execute function private.notify_member_order_status_change();

create or replace function private.send_member_voucher_expiry_reminders()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_sender_id uuid;
  v_claim record;
  v_message_id uuid;
  v_sent integer := 0;
begin
  select p.id into v_sender_id
  from public.profiles p
  where p.role = 'admin' and p.account_status = 'active'
  order by p.created_at asc
  limit 1;

  if v_sender_id is null then
    return jsonb_build_object('sent', 0, 'reason', 'no_active_admin_sender');
  end if;

  for v_claim in
    select
      c.voucher_id,
      c.user_id,
      v.code,
      v.expires_at,
      p.full_name
    from public.voucher_claims c
    join public.vouchers v on v.id = c.voucher_id
    join public.profiles p on p.id = c.user_id
    where c.redeemed_at is null
      and v.is_active = true
      and v.expires_at > now()
      and v.expires_at <= now() + interval '24 hours'
      and p.account_status = 'active'
      and p.role <> 'admin'
  loop
    insert into private.member_voucher_reminder_deliveries(voucher_id, user_id, reminder_type)
    values (v_claim.voucher_id, v_claim.user_id, 'expiry_24h')
    on conflict (voucher_id, user_id, reminder_type) do nothing;

    if not found then
      continue;
    end if;

    insert into public.inbox_messages(sender_id, title, body, audience, recipient_id)
    values (
      v_sender_id,
      'Pengingat Voucher Hampir Kedaluwarsa',
      'Hai ' || coalesce(nullif(trim(v_claim.full_name), ''), 'Warga') ||
        ', voucher ' || v_claim.code || ' akan kedaluwarsa pada ' ||
        to_char(v_claim.expires_at at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') ||
        ' WIB. Gunakan sebelum masa berlaku berakhir.',
      'user',
      v_claim.user_id
    )
    returning id into v_message_id;

    insert into public.inbox_recipients(message_id, user_id)
    values (v_message_id, v_claim.user_id)
    on conflict (message_id, user_id) do nothing;

    v_sent := v_sent + 1;
  end loop;

  return jsonb_build_object('sent', v_sent, 'checked_at', now());
end;
$function$;

revoke all on function private.send_member_voucher_expiry_reminders() from public, anon, authenticated;

do $schedule$
begin
  if exists (select 1 from cron.job where jobname = 'matthew-member-voucher-expiry-reminders') then
    perform cron.unschedule('matthew-member-voucher-expiry-reminders');
  end if;

  perform cron.schedule(
    'matthew-member-voucher-expiry-reminders',
    '15 * * * *',
    'select private.send_member_voucher_expiry_reminders();'
  );
end;
$schedule$;
