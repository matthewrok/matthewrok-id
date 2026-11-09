-- Matthew Referral System: one-time 499-point rewards for both sides after the first completed order.
-- Apply only after review and merge. This migration is intentionally separate from the existing Rewards ledger.

begin;

-- Allow referral reward lots to share a qualifying order without weakening order-lot idempotency.
alter table public.matthew_reward_lots alter column order_id drop not null;
alter table public.matthew_reward_lots
  add column if not exists source_type text not null default 'order',
  add column if not exists source_id uuid;

update public.matthew_reward_lots
set source_id = order_id
where source_type = 'order' and source_id is null;

alter table public.matthew_reward_lots
  drop constraint if exists matthew_reward_lots_order_unique;

create unique index if not exists matthew_reward_lots_order_id_unique
  on public.matthew_reward_lots(order_id) where order_id is not null;
create unique index if not exists matthew_reward_lots_source_unique
  on public.matthew_reward_lots(user_id, source_type, source_id)
  where source_id is not null;
create index if not exists matthew_reward_lots_user_source_expiry_idx
  on public.matthew_reward_lots(user_id, expires_at, created_at)
  where remaining_points > 0;

create table if not exists public.matthew_referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.matthew_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending','successful')),
  first_order_id uuid references public.joki_progress(id) on delete set null,
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  constraint matthew_referrals_no_self check (referrer_id <> referred_id),
  constraint matthew_referrals_qualification_pair check (
    (status = 'pending' and first_order_id is null and qualified_at is null)
    or (status = 'successful' and first_order_id is not null and qualified_at is not null)
  )
);

create index if not exists matthew_referrals_referrer_status_created_idx
  on public.matthew_referrals(referrer_id, status, created_at desc);
create index if not exists matthew_referrals_first_order_id_idx
  on public.matthew_referrals(first_order_id);

alter table public.matthew_referral_codes enable row level security;
alter table public.matthew_referrals enable row level security;
revoke all on public.matthew_referral_codes, public.matthew_referrals from public, anon, authenticated;

-- Existing eligible members receive a personal code immediately.
insert into public.matthew_referral_codes(user_id, code)
select p.id, 'MJ' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
from public.profiles p
where lower(trim(coalesce(p.role,''))) in ('warga biasa','warga tidak biasa','warga sultan')
  and lower(trim(coalesce(p.account_status,''))) = 'active'
on conflict (user_id) do nothing;

create or replace function public.validate_referral_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.matthew_referral_codes c
    join public.profiles p on p.id = c.user_id
    where upper(c.code) = upper(trim(coalesce(p_code,'')))
      and lower(trim(coalesce(p.role,''))) in ('warga biasa','warga tidak biasa','warga sultan')
      and lower(trim(coalesce(p.account_status,''))) = 'active'
  );
$function$;

revoke all on function public.validate_referral_code(text) from public;
grant execute on function public.validate_referral_code(text) to anon, authenticated;

-- Runs after the existing verified-email profile trigger (zz sorts after on_auth_*).
create or replace function private.process_verified_user_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role text;
  v_status text;
  v_code text;
  v_referrer_id uuid;
begin
  if new.email_confirmed_at is null then return new; end if;

  select lower(trim(p.role)), lower(trim(p.account_status))
    into v_role, v_status
  from public.profiles p
  where p.id = new.id;

  if v_role is null or v_status is distinct from 'active'
     or coalesce(v_role,'') not in ('warga biasa','warga tidak biasa','warga sultan') then
    return new;
  end if;

  insert into public.matthew_referral_codes(user_id, code)
  values (new.id, 'MJ' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)))
  on conflict (user_id) do nothing;

  v_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code','')));
  if v_code = '' then return new; end if;

  select c.user_id into v_referrer_id
  from public.matthew_referral_codes c
  join public.profiles p on p.id = c.user_id
  where upper(c.code) = v_code
    and lower(trim(coalesce(p.role,''))) in ('warga biasa','warga tidak biasa','warga sultan')
    and lower(trim(coalesce(p.account_status,''))) = 'active'
  limit 1;

  if v_referrer_id is null or v_referrer_id = new.id then return new; end if;

  insert into public.matthew_referrals(referrer_id, referred_id, referral_code)
  values (v_referrer_id, new.id, v_code)
  on conflict (referred_id) do nothing;

  return new;
end;
$function$;

revoke all on function private.process_verified_user_referral() from public, anon, authenticated;
drop trigger if exists zz_process_verified_user_referral_insert on auth.users;
drop trigger if exists zz_process_verified_user_referral_confirm on auth.users;

create trigger zz_process_verified_user_referral_insert
after insert on auth.users
for each row
when (new.email_confirmed_at is not null)
execute function private.process_verified_user_referral();

create trigger zz_process_verified_user_referral_confirm
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function private.process_verified_user_referral();

create or replace function public.get_my_referral_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_status text;
  v_code text;
  v_total integer;
  v_successful integer;
  v_pending integer;
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous','false') = 'true' then
    raise exception 'Login diperlukan untuk melihat referral.';
  end if;

  select lower(trim(p.role)), lower(trim(p.account_status))
    into v_role, v_status
  from public.profiles p
  where p.id = v_user_id;

  if v_status is distinct from 'active'
     or v_role not in ('warga biasa','warga tidak biasa','warga sultan') then
    raise exception 'Referral hanya tersedia untuk akun Warga aktif.';
  end if;

  insert into public.matthew_referral_codes(user_id, code)
  values (v_user_id, 'MJ' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)))
  on conflict (user_id) do nothing;

  select c.code into v_code
  from public.matthew_referral_codes c
  where c.user_id = v_user_id;

  select count(*)::integer,
         count(*) filter (where r.status = 'successful')::integer,
         count(*) filter (where r.status = 'pending')::integer
    into v_total, v_successful, v_pending
  from public.matthew_referrals r
  where r.referrer_id = v_user_id;

  return jsonb_build_object(
    'code', v_code,
    'link', 'https://matthewrok.my.id/register/?ref=' || v_code,
    'total_referrals', v_total,
    'successful_referrals', v_successful,
    'pending_referrals', v_pending,
    'points_per_person', 499,
    'qualification', 'Transaksi pertama teman harus berstatus Selesai.'
  );
end;
$function$;

revoke all on function public.get_my_referral_summary() from public, anon;
grant execute on function public.get_my_referral_summary() to authenticated;

create or replace function private.award_matthew_referral_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_referred_id uuid;
  v_referral public.matthew_referrals%rowtype;
  v_member record;
  v_lot_id uuid;
begin
  if lower(trim(coalesce(new.status,''))) <> 'selesai'
     or (tg_op = 'UPDATE' and lower(trim(coalesce(old.status,''))) = 'selesai') then
    return new;
  end if;

  select u.id into v_referred_id
  from auth.users u
  where lower(trim(u.email)) = lower(trim(coalesce(new.client_email,'')))
    and u.email_confirmed_at is not null
  limit 1;

  if v_referred_id is null then return new; end if;

  select r.* into v_referral
  from public.matthew_referrals r
  where r.referred_id = v_referred_id and r.status = 'pending'
  for update;

  if not found then return new; end if;

  -- Both accounts receive the same fixed amount, independent of membership tier.
  for v_member in
    select p.id, lower(trim(p.role)) as role
    from public.profiles p
    where p.id in (v_referral.referrer_id, v_referral.referred_id)
      and lower(trim(coalesce(p.account_status,''))) = 'active'
      and lower(trim(coalesce(p.role,''))) in ('warga biasa','warga tidak biasa','warga sultan')
  loop
    insert into public.matthew_reward_lots(
      user_id, order_id, points_earned, remaining_points, multiplier,
      role_at_earning, expires_at, source_type, source_id
    )
    values (
      v_member.id, null, 499, 499, 1,
      v_member.role, now() + interval '12 months', 'referral', v_referral.id
    )
    on conflict (user_id, source_type, source_id) where source_id is not null
    do nothing
    returning id into v_lot_id;

    if v_lot_id is not null then
      insert into public.matthew_reward_transactions(
        user_id, points_delta, event_type, description
      )
      values (
        v_member.id, 499, 'earned',
        case when v_member.id = v_referral.referrer_id
          then 'Bonus referral: teman berhasil menyelesaikan transaksi pertama (+499 poin).'
          else 'Bonus selamat datang referral: transaksi pertama selesai (+499 poin).'
        end
      );
    end if;
    v_lot_id := null;
  end loop;

  update public.matthew_referrals
  set status = 'successful', first_order_id = new.id, qualified_at = now()
  where id = v_referral.id and status = 'pending';

  return new;
end;
$function$;

revoke all on function private.award_matthew_referral_points() from public, anon, authenticated;
drop trigger if exists trg_award_matthew_referral_points on public.joki_progress;
create trigger trg_award_matthew_referral_points
after insert or update of status on public.joki_progress
for each row execute function private.award_matthew_referral_points();

commit;
