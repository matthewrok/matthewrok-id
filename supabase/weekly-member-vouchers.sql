-- Weekly member vouchers for Warga Tidak Biasa and Warga Sultan.
-- Apply this SQL to Supabase before publishing the frontend changes. Weekly generation runs Monday 00:00 Asia/Jakarta.

create extension if not exists pg_cron with schema pg_catalog;
create schema if not exists private;

alter table public.vouchers
  add column if not exists audience_roles text[],
  add column if not exists campaign_type text not null default 'standard',
  add column if not exists claim_required boolean not null default false;

alter table public.vouchers
  drop constraint if exists vouchers_campaign_type_check;
alter table public.vouchers
  add constraint vouchers_campaign_type_check
  check (campaign_type in ('standard', 'weekly'));

alter table public.vouchers
  drop constraint if exists vouchers_audience_roles_check;
alter table public.vouchers
  add constraint vouchers_audience_roles_check
  check (
    audience_roles is null
    or audience_roles <@ array['warga biasa','warga tidak biasa','warga sultan']::text[]
  );

create index if not exists vouchers_weekly_active_idx
  on public.vouchers (campaign_type, starts_at, expires_at)
  where is_active = true;

create table if not exists public.voucher_claims (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  order_id uuid references public.joki_progress(id) on delete set null,
  constraint voucher_claims_voucher_user_unique unique (voucher_id, user_id),
  constraint voucher_claims_redemption_pair_check
    check ((redeemed_at is null and order_id is null) or redeemed_at is not null)
);

alter table public.voucher_claims enable row level security;
revoke all on public.voucher_claims from anon, authenticated;
grant select on public.voucher_claims to authenticated;

drop policy if exists "Members read own voucher claims" on public.voucher_claims;
create policy "Members read own voucher claims"
  on public.voucher_claims for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_current_user_admin()));

drop policy if exists "Members and admins read vouchers" on public.vouchers;
create policy "Members and admins read vouchers"
  on public.vouchers for select to authenticated
  using (
    (select public.is_current_user_admin())
    or (
      is_active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at > now())
      and (max_uses is null or used_count < max_uses)
      and (
        audience_roles is null
        or exists (
          select 1 from public.profiles p
          where p.id = (select auth.uid())
            and lower(p.role) = any (audience_roles)
            and p.account_status = 'active'
        )
        or exists (
          select 1 from public.voucher_claims c
          where c.voucher_id = vouchers.id
            and c.user_id = (select auth.uid())
        )
      )
    )
  );

create or replace function public.claim_weekly_voucher(p_voucher_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_voucher public.vouchers%rowtype;
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'Login diperlukan untuk mengklaim voucher.';
  end if;

  select lower(p.role) into v_role
  from public.profiles p
  where p.id = v_user_id and p.account_status = 'active';

  if v_role is null then
    raise exception 'Akun tidak aktif atau profil tidak ditemukan.';
  end if;

  select * into v_voucher
  from public.vouchers v
  where v.id = p_voucher_id
    and v.campaign_type = 'weekly'
    and v.claim_required = true
    and v.is_active = true
    and (v.starts_at is null or v.starts_at <= now())
    and (v.expires_at is null or v.expires_at > now())
    and (v.max_uses is null or v.used_count < v.max_uses)
    and v.audience_roles is not null
    and v_role = any(v.audience_roles)
  for update;

  if not found then
    raise exception 'Voucher tidak tersedia untuk tingkatan akun kamu atau sudah kedaluwarsa.';
  end if;

  insert into public.voucher_claims(voucher_id, user_id)
  values (v_voucher.id, v_user_id)
  on conflict (voucher_id, user_id) do nothing;

  if not found then
    raise exception 'Voucher mingguan ini sudah pernah kamu klaim.';
  end if;

  return jsonb_build_object(
    'voucher_id', v_voucher.id,
    'code', v_voucher.code,
    'discount_type', v_voucher.discount_type,
    'discount_value', v_voucher.discount_value,
    'expires_at', v_voucher.expires_at,
    'description', v_voucher.description
  );
end;
$function$;

revoke all on function public.claim_weekly_voucher(uuid) from public, anon;
grant execute on function public.claim_weekly_voucher(uuid) to authenticated;

create or replace function private.enforce_weekly_voucher_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_voucher public.vouchers%rowtype;
  v_user_id uuid := auth.uid();
begin
  if nullif(upper(trim(coalesce(new.voucher_code, ''))), '') is null then
    return new;
  end if;

  select * into v_voucher
  from public.vouchers v
  where v.code = upper(trim(new.voucher_code))
    and v.claim_required = true
    and v.campaign_type = 'weekly'
  for update;

  if not found then
    return new;
  end if;

  if v_user_id is null then
    raise exception 'Voucher mingguan hanya dapat digunakan oleh akun yang mengklaimnya.';
  end if;

  perform 1
  from public.voucher_claims c
  where c.voucher_id = v_voucher.id
    and c.user_id = v_user_id
    and c.redeemed_at is null
  for update;

  if not found then
    raise exception 'Klaim voucher belum tersedia, sudah digunakan, atau sudah kedaluwarsa.';
  end if;

  return new;
end;
$function$;

create or replace function private.redeem_weekly_voucher_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_voucher_id uuid;
  v_user_id uuid := auth.uid();
begin
  if nullif(upper(trim(coalesce(new.voucher_code, ''))), '') is null then
    return new;
  end if;

  select v.id into v_voucher_id
  from public.vouchers v
  where v.code = upper(trim(new.voucher_code))
    and v.claim_required = true
    and v.campaign_type = 'weekly';

  if v_voucher_id is not null then
    update public.voucher_claims c
    set redeemed_at = now(), order_id = new.id
    where c.voucher_id = v_voucher_id
      and c.user_id = v_user_id
      and c.redeemed_at is null;

    if not found then
      raise exception 'Klaim voucher tidak dapat diselesaikan.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_weekly_voucher_claim_before_order on public.joki_progress;
create trigger enforce_weekly_voucher_claim_before_order
  before insert on public.joki_progress
  for each row
  execute function private.enforce_weekly_voucher_claim();

drop trigger if exists redeem_weekly_voucher_claim_after_order on public.joki_progress;
create trigger redeem_weekly_voucher_claim_after_order
  after insert on public.joki_progress
  for each row
  execute function private.redeem_weekly_voucher_claim();

revoke all on function private.enforce_weekly_voucher_claim() from public, anon, authenticated;
revoke all on function private.redeem_weekly_voucher_claim() from public, anon, authenticated;

create or replace function private.generate_weekly_member_vouchers()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin_id uuid;
  v_date_code text := to_char(now() at time zone 'Asia/Jakarta', 'YYMMDD');
  v_voucher_id uuid;
  v_created integer := 0;
  v_roles text[] := array['warga tidak biasa', 'warga sultan'];
  v_role text;
  v_discount numeric;
  v_code text;
  v_profile record;
  v_message_id uuid;
begin
  select p.id into v_admin_id
  from public.profiles p
  where p.role = 'admin'
  order by p.created_at asc
  limit 1;

  foreach v_role in array v_roles loop
    v_discount := case when v_role = 'warga tidak biasa' then 3 else 5 end;
    v_code := case when v_role = 'warga tidak biasa' then 'MATTHEW-WNI-' else 'MATTHEW-SLT-' end || v_date_code;

    v_voucher_id := null;
    insert into public.vouchers(
      code, description, discount_type, discount_value, max_uses,
      used_count, starts_at, expires_at, is_active, created_by,
      audience_roles, campaign_type, claim_required
    )
    values (
      v_code,
      'Voucher mingguan ' || v_discount::text || '% untuk ' || initcap(v_role),
      'percent', v_discount, null, 0, now(), now() + interval '7 days',
      true, v_admin_id, array[v_role], 'weekly', true
    )
    on conflict (code) do nothing
    returning id into v_voucher_id;

    if v_voucher_id is null then
      continue;
    end if;

    v_created := v_created + 1;
    for v_profile in
      select p.id, p.full_name
      from public.profiles p
      where lower(p.role) = v_role
        and p.account_status = 'active'
    loop
      insert into public.inbox_messages(sender_id, title, body, audience, recipient_id)
      values (
        v_admin_id,
        'Voucher Mingguan MATTHEW Sudah Tersedia!',
        'Kabar baik, ' || coalesce(nullif(v_profile.full_name, ''), 'Warga') ||
        '! Voucher mingguan ' || v_discount::text ||
        '% khusus ' || initcap(v_role) ||
        ' sudah tersedia. Buka halaman Member Benefits untuk mengklaimnya. Voucher berlaku selama 7 hari sejak diterbitkan dan hanya dapat digunakan satu kali.',
        'user',
        v_profile.id
      )
      returning id into v_message_id;

      insert into public.inbox_recipients(message_id, user_id)
      values (v_message_id, v_profile.id)
      on conflict (message_id, user_id) do nothing;
    end loop;
  end loop;

  return jsonb_build_object('created_vouchers', v_created, 'generated_at', now());
end;
$function$;

revoke all on function private.generate_weekly_member_vouchers() from public, anon, authenticated;

do $schedule$
begin
  if exists (select 1 from cron.job where jobname = 'matthew-weekly-member-vouchers') then
    perform cron.unschedule('matthew-weekly-member-vouchers');
  end if;
  perform cron.schedule(
    'matthew-weekly-member-vouchers',
    '0 17 * * 0',
    'select private.generate_weekly_member_vouchers();'
  );
end;
$schedule$;
