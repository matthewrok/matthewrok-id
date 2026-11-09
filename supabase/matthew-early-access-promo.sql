-- Matthew Early Access Promo: tier-based early claim windows for voucher campaigns.
-- Campaign access is enforced by SECURITY DEFINER RPCs and claim records, not frontend visibility.

begin;

alter table public.vouchers
  drop constraint if exists vouchers_campaign_type_check;
alter table public.vouchers
  add constraint vouchers_campaign_type_check
  check (campaign_type in ('standard', 'weekly', 'early_access'));

create table if not exists public.early_access_campaigns (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null unique references public.vouchers(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  warga_sultan_opens_at timestamptz not null,
  warga_tidak_biasa_opens_at timestamptz not null,
  warga_biasa_opens_at timestamptz not null,
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint early_access_campaign_schedule_check check (
    warga_sultan_opens_at <= warga_tidak_biasa_opens_at
    and warga_tidak_biasa_opens_at <= warga_biasa_opens_at
    and warga_biasa_opens_at < expires_at
  )
);

create index if not exists early_access_campaigns_active_schedule_idx
  on public.early_access_campaigns (is_active, warga_sultan_opens_at, expires_at);

alter table public.early_access_campaigns enable row level security;
revoke all on public.early_access_campaigns from public, anon, authenticated;

create or replace function public.get_my_early_access_campaigns()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_result jsonb;
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous','false') = 'true' then
    raise exception 'Login diperlukan untuk melihat Early Access Promo.';
  end if;

  select lower(p.role) into v_role
  from public.profiles p
  where p.id = v_user_id and p.account_status = 'active';

  if v_role not in ('warga biasa','warga tidak biasa','warga sultan') then
    raise exception 'Akun ini tidak memiliki akses membership.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'description', c.description,
    'discount_type', v.discount_type,
    'discount_value', v.discount_value,
    'expires_at', c.expires_at,
    'available_at', case v_role
      when 'warga sultan' then c.warga_sultan_opens_at
      when 'warga tidak biasa' then c.warga_tidak_biasa_opens_at
      else c.warga_biasa_opens_at
    end,
    'is_unlocked', now() >= case v_role
      when 'warga sultan' then c.warga_sultan_opens_at
      when 'warga tidak biasa' then c.warga_tidak_biasa_opens_at
      else c.warga_biasa_opens_at
    end,
    'claim', case when cl.id is null then null else jsonb_build_object(
      'claimed_at', cl.claimed_at,
      'redeemed_at', cl.redeemed_at,
      'code', v.code
    ) end
  ) order by c.warga_sultan_opens_at asc), '[]'::jsonb)
  into v_result
  from public.early_access_campaigns c
  join public.vouchers v on v.id = c.voucher_id
  left join public.voucher_claims cl on cl.voucher_id = v.id and cl.user_id = v_user_id
  where c.is_active = true
    and c.expires_at > now()
    and v.is_active = true;

  return v_result;
end;
$function$;

revoke all on function public.get_my_early_access_campaigns() from public, anon;
grant execute on function public.get_my_early_access_campaigns() to authenticated;

create or replace function public.claim_early_access_promo(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_campaign public.early_access_campaigns%rowtype;
  v_voucher public.vouchers%rowtype;
  v_opens_at timestamptz;
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous','false') = 'true' then
    raise exception 'Login diperlukan untuk mengklaim promo.';
  end if;

  select lower(p.role) into v_role
  from public.profiles p
  where p.id = v_user_id and p.account_status = 'active';

  if v_role not in ('warga biasa','warga tidak biasa','warga sultan') then
    raise exception 'Akun ini tidak memiliki akses membership.';
  end if;

  select * into v_campaign
  from public.early_access_campaigns c
  where c.id = p_campaign_id and c.is_active = true
    and c.expires_at > now()
  for update;

  if not found then
    raise exception 'Promo tidak tersedia atau sudah berakhir.';
  end if;

  v_opens_at := case v_role
    when 'warga sultan' then v_campaign.warga_sultan_opens_at
    when 'warga tidak biasa' then v_campaign.warga_tidak_biasa_opens_at
    else v_campaign.warga_biasa_opens_at
  end;

  if now() < v_opens_at then
    raise exception 'Akses promo untuk tingkatan kamu belum dibuka.';
  end if;

  select * into v_voucher
  from public.vouchers v
  where v.id = v_campaign.voucher_id and v.is_active = true
    and (v.expires_at is null or v.expires_at > now())
    and (v.max_uses is null or v.used_count < v.max_uses)
    and v_role = any(v.audience_roles)
  for update;

  if not found then
    raise exception 'Kuota promo habis atau promo tidak lagi tersedia.';
  end if;

  insert into public.voucher_claims(voucher_id,user_id)
  values(v_voucher.id,v_user_id)
  on conflict(voucher_id,user_id) do nothing;

  if not found then
    raise exception 'Promo ini sudah pernah kamu klaim.';
  end if;

  return jsonb_build_object(
    'campaign_id',v_campaign.id,
    'code',v_voucher.code,
    'discount_type',v_voucher.discount_type,
    'discount_value',v_voucher.discount_value,
    'expires_at',v_campaign.expires_at
  );
end;
$function$;

revoke all on function public.claim_early_access_promo(uuid) from public, anon;
grant execute on function public.claim_early_access_promo(uuid) to authenticated;

create or replace function public.admin_create_early_access_campaign(
  p_title text,
  p_description text,
  p_code text,
  p_discount_type text,
  p_discount_value numeric,
  p_max_uses integer,
  p_sultan_opens_at timestamptz,
  p_tidak_biasa_opens_at timestamptz,
  p_biasa_opens_at timestamptz,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin_id uuid := auth.uid();
  v_voucher_id uuid;
  v_campaign_id uuid;
begin
  if not exists(select 1 from public.profiles p where p.id=v_admin_id and p.role='admin' and p.account_status='active') then
    raise exception 'Akses hanya untuk ADMIN aktif.';
  end if;
  if char_length(btrim(coalesce(p_title,''))) not between 3 and 120 then raise exception 'Judul promo harus 3-120 karakter.'; end if;
  if p_discount_type not in ('percent','fixed') or p_discount_value <= 0 then raise exception 'Konfigurasi diskon tidak valid.'; end if;
  if p_max_uses is not null and p_max_uses < 1 then raise exception 'Kuota harus minimal 1.'; end if;
  if p_sultan_opens_at is null or p_tidak_biasa_opens_at < p_sultan_opens_at or p_biasa_opens_at < p_tidak_biasa_opens_at or p_expires_at <= p_biasa_opens_at then
    raise exception 'Urutan jadwal promo tidak valid.';
  end if;

  insert into public.vouchers(code,description,discount_type,discount_value,max_uses,starts_at,expires_at,is_active,created_by,audience_roles,campaign_type,claim_required)
  values(
    upper(trim(p_code)),nullif(trim(coalesce(p_description,'')),''),p_discount_type,p_discount_value,p_max_uses,
    p_sultan_opens_at,p_expires_at,true,v_admin_id,
    array['warga biasa','warga tidak biasa','warga sultan']::text[],'early_access',true
  ) returning id into v_voucher_id;

  insert into public.early_access_campaigns(
    voucher_id,title,description,warga_sultan_opens_at,warga_tidak_biasa_opens_at,warga_biasa_opens_at,expires_at,created_by
  ) values(
    v_voucher_id,trim(p_title),coalesce(p_description,''),p_sultan_opens_at,p_tidak_biasa_opens_at,p_biasa_opens_at,p_expires_at,v_admin_id
  ) returning id into v_campaign_id;

  return v_campaign_id;
end;
$function$;

revoke all on function public.admin_create_early_access_campaign(text,text,text,text,numeric,integer,timestamptz,timestamptz,timestamptz,timestamptz) from public, anon;
grant execute on function public.admin_create_early_access_campaign(text,text,text,text,numeric,integer,timestamptz,timestamptz,timestamptz,timestamptz) to authenticated;

create or replace function public.admin_set_early_access_campaign_status(p_campaign_id uuid,p_is_active boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.account_status='active') then
    raise exception 'Akses hanya untuk ADMIN aktif.';
  end if;
  update public.early_access_campaigns set is_active=p_is_active where id=p_campaign_id;
  if not found then raise exception 'Kampanye tidak ditemukan.'; end if;
  update public.vouchers v set is_active=p_is_active
  from public.early_access_campaigns c where c.id=p_campaign_id and v.id=c.voucher_id;
  return true;
end;
$function$;

revoke all on function public.admin_set_early_access_campaign_status(uuid,boolean) from public, anon;
grant execute on function public.admin_set_early_access_campaign_status(uuid,boolean) to authenticated;

create or replace function public.admin_list_early_access_campaigns()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_result jsonb;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.account_status='active') then
    raise exception 'Akses hanya untuk ADMIN aktif.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'title',c.title,'description',c.description,'code',v.code,
    'discount_type',v.discount_type,'discount_value',v.discount_value,
    'used_count',v.used_count,'max_uses',v.max_uses,'is_active',c.is_active,
    'sultan_opens_at',c.warga_sultan_opens_at,
    'tidak_biasa_opens_at',c.warga_tidak_biasa_opens_at,
    'biasa_opens_at',c.warga_biasa_opens_at,'expires_at',c.expires_at
  ) order by c.created_at desc),'[]'::jsonb)
  into v_result
  from public.early_access_campaigns c join public.vouchers v on v.id=c.voucher_id;
  return v_result;
end;
$function$;

revoke all on function public.admin_list_early_access_campaigns() from public, anon;
grant execute on function public.admin_list_early_access_campaigns() to authenticated;

-- Apply claim ownership enforcement to both weekly and early-access voucher campaigns.
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
  if nullif(upper(trim(coalesce(new.voucher_code,''))),'') is null then return new; end if;
  select * into v_voucher from public.vouchers v
  where v.code=upper(trim(new.voucher_code))
    and v.claim_required=true
    and v.campaign_type in ('weekly','early_access')
  for update;
  if not found then return new; end if;
  if v_user_id is null then raise exception 'Voucher khusus member hanya dapat digunakan oleh akun yang mengklaimnya.'; end if;
  perform 1 from public.voucher_claims c
  where c.voucher_id=v_voucher.id and c.user_id=v_user_id and c.redeemed_at is null
  for update;
  if not found then raise exception 'Klaim voucher belum tersedia, sudah digunakan, atau kedaluwarsa.'; end if;
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
  if nullif(upper(trim(coalesce(new.voucher_code,''))),'') is null then return new; end if;
  select v.id into v_voucher_id from public.vouchers v
  where v.code=upper(trim(new.voucher_code))
    and v.claim_required=true
    and v.campaign_type in ('weekly','early_access');
  if v_voucher_id is not null then
    update public.voucher_claims c set redeemed_at=now(),order_id=new.id
    where c.voucher_id=v_voucher_id and c.user_id=v_user_id and c.redeemed_at is null;
    if not found then raise exception 'Klaim voucher tidak dapat diselesaikan.'; end if;
  end if;
  return new;
end;
$function$;

revoke all on function private.enforce_weekly_voucher_claim() from public, anon, authenticated;
revoke all on function private.redeem_weekly_voucher_claim() from public, anon, authenticated;

commit;
