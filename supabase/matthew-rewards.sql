-- Matthew Rewards: server-side earning, expiring point lots, one-time reward codes.
-- Apply only after this PR is reviewed and merged. Do not run on production from this branch.
begin;

create table if not exists public.matthew_reward_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.joki_progress(id) on delete cascade,
  points_earned integer not null check (points_earned > 0),
  remaining_points integer not null check (remaining_points >= 0 and remaining_points <= points_earned),
  multiplier integer not null check (multiplier in (1,2)),
  role_at_earning text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint matthew_reward_lots_order_unique unique(order_id)
);

create table if not exists public.matthew_reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.joki_progress(id) on delete set null,
  redemption_id uuid,
  points_delta integer not null check (points_delta <> 0),
  event_type text not null check (event_type in ('earned','redeemed','expired','adjustment')),
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.matthew_reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  points_spent integer not null check (points_spent >= 500 and points_spent % 500 = 0),
  discount_amount integer not null check (discount_amount = points_spent * 10),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_at timestamptz,
  order_id uuid references public.joki_progress(id) on delete set null,
  constraint matthew_reward_redemptions_use_pair check ((used_at is null and order_id is null) or used_at is not null)
);

alter table public.matthew_reward_transactions
  drop constraint if exists matthew_reward_transactions_redemption_fk;
alter table public.matthew_reward_transactions
  add constraint matthew_reward_transactions_redemption_fk
  foreign key (redemption_id) references public.matthew_reward_redemptions(id) on delete set null;

create index if not exists matthew_reward_lots_user_expiry_idx
  on public.matthew_reward_lots(user_id, expires_at) where remaining_points > 0;
create index if not exists matthew_reward_transactions_user_created_idx
  on public.matthew_reward_transactions(user_id, created_at desc);
create index if not exists matthew_reward_redemptions_user_created_idx
  on public.matthew_reward_redemptions(user_id, created_at desc);

alter table public.matthew_reward_lots enable row level security;
alter table public.matthew_reward_transactions enable row level security;
alter table public.matthew_reward_redemptions enable row level security;
revoke all on public.matthew_reward_lots, public.matthew_reward_transactions, public.matthew_reward_redemptions from anon, authenticated;

create or replace function private.award_matthew_reward_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_role text;
  v_completed integer;
  v_multiplier integer;
  v_points integer;
  v_name text;
begin
  if lower(trim(coalesce(new.status,''))) <> 'selesai'
     or (tg_op = 'UPDATE' and lower(trim(coalesce(old.status,''))) = 'selesai') then
    return new;
  end if;

  if coalesce(new.total_price,0) < 1000
     or nullif(lower(trim(coalesce(new.client_email,''))),'') is null then
    return new;
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(trim(u.email)) = lower(trim(new.client_email))
    and u.email_confirmed_at is not null
  limit 1;

  if v_user_id is null then return new; end if;

  select lower(trim(p.role)) into v_role
  from public.profiles p
  where p.id = v_user_id
    and lower(coalesce(p.account_status,'')) = 'active';

  if v_role is null or v_role = 'admin' then return new; end if;
  if v_role not in ('warga biasa','warga tidak biasa','warga sultan') then return new; end if;

  select count(*)::integer into v_completed
  from public.joki_progress j
  where lower(trim(coalesce(j.client_email,''))) = lower(trim(new.client_email))
    and lower(trim(coalesce(j.status,''))) = 'selesai';

  -- Include this completion when applying the automatic 19-order Sultan threshold.
  v_multiplier := case when v_role = 'warga sultan' or v_completed >= 19 then 2 else 1 end;
  v_points := floor(new.total_price::numeric / 1000)::integer * v_multiplier;
  if v_points <= 0 then return new; end if;

  insert into public.matthew_reward_lots(
    user_id, order_id, points_earned, remaining_points, multiplier,
    role_at_earning, expires_at
  )
  values (
    v_user_id, new.id, v_points, v_points, v_multiplier,
    case when v_completed >= 19 then 'warga sultan' else v_role end,
    now() + interval '12 months'
  )
  on conflict (order_id) do nothing;

  if found then
    insert into public.matthew_reward_transactions(
      user_id, order_id, points_delta, event_type, description
    )
    values (
      v_user_id, new.id, v_points, 'earned',
      'Poin dari pesanan ' || coalesce(new.order_number,new.id::text) ||
      ' · ' || v_multiplier::text || 'x'
    );
  end if;

  return new;
end;
$function$;

revoke all on function private.award_matthew_reward_points() from public, anon, authenticated;
drop trigger if exists trg_award_matthew_reward_points on public.joki_progress;
create trigger trg_award_matthew_reward_points
after insert or update of status on public.joki_progress
for each row execute function private.award_matthew_reward_points();

create or replace function public.get_my_matthew_rewards()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_balance integer;
  v_earned integer;
  v_redeemed integer;
  v_history jsonb;
  v_codes jsonb;
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous','false') = 'true' then
    raise exception 'Login diperlukan untuk melihat Matthew Rewards.';
  end if;

  select lower(trim(p.role)) into v_role
  from public.profiles p
  where p.id = v_user_id and lower(coalesce(p.account_status,'')) = 'active';

  if v_role is null or v_role = 'admin' then
    raise exception 'Matthew Rewards hanya tersedia untuk akun Warga aktif.';
  end if;

  select coalesce(sum(remaining_points),0)::integer
  into v_balance
  from public.matthew_reward_lots
  where user_id = v_user_id and expires_at > now();

  select coalesce(sum(points_delta) filter (where event_type='earned'),0)::integer,
         coalesce(abs(sum(points_delta) filter (where event_type='redeemed')),0)::integer
  into v_earned,v_redeemed
  from public.matthew_reward_transactions
  where user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at desc),'[]'::jsonb)
  into v_history
  from (
    select id,points_delta,event_type,description,created_at
    from public.matthew_reward_transactions
    where user_id = v_user_id
    order by created_at desc limit 30
  ) h;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc),'[]'::jsonb)
  into v_codes
  from (
    select code,points_spent,discount_amount,created_at,expires_at,used_at
    from public.matthew_reward_redemptions
    where user_id = v_user_id
    order by created_at desc limit 10
  ) c;

  return jsonb_build_object(
    'role',v_role,'balance',v_balance,'total_earned',v_earned,
    'total_redeemed',v_redeemed,'history',v_history,'redemptions',v_codes,
    'points_per_1000',case when v_role='warga sultan' then 2 else 1 end,
    'redemption_rule','500 poin = Rp5.000'
  );
end;
$function$;

revoke all on function public.get_my_matthew_rewards() from public, anon;
grant execute on function public.get_my_matthew_rewards() to authenticated;

create or replace function public.redeem_matthew_points(p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_balance integer;
  v_lot record;
  v_take integer;
  v_remaining integer;
  v_redemption_id uuid;
  v_code text;
  v_discount integer;
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous','false') = 'true' then
    raise exception 'Login diperlukan untuk menukarkan poin.';
  end if;
  if p_points is null or p_points < 500 or p_points % 500 <> 0 then
    raise exception 'Penukaran minimal 500 poin dan harus kelipatan 500 poin.';
  end if;

  select lower(trim(p.role)) into v_role
  from public.profiles p
  where p.id = v_user_id and lower(coalesce(p.account_status,'')) = 'active'
  for update;
  if v_role is null or v_role = 'admin' then
    raise exception 'Akun ini tidak dapat menukarkan Matthew Rewards.';
  end if;

  select coalesce(sum(remaining_points),0)::integer into v_balance
  from public.matthew_reward_lots
  where user_id = v_user_id and expires_at > now();
  if v_balance < p_points then
    raise exception 'Poin tidak mencukupi. Saldo tersedia: ' || v_balance::text || ' poin.';
  end if;

  v_discount := p_points * 10;
  v_code := 'MR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));

  insert into public.matthew_reward_redemptions(
    user_id,code,points_spent,discount_amount,expires_at
  )
  values(v_user_id,v_code,p_points,v_discount,now()+interval '30 days')
  returning id into v_redemption_id;

  v_remaining := p_points;
  for v_lot in
    select id,remaining_points
    from public.matthew_reward_lots
    where user_id=v_user_id and expires_at>now() and remaining_points>0
    order by expires_at asc,created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_remaining,v_lot.remaining_points);
    update public.matthew_reward_lots
    set remaining_points=remaining_points-v_take
    where id=v_lot.id;
    v_remaining := v_remaining-v_take;
  end loop;

  if v_remaining <> 0 then raise exception 'Saldo poin berubah. Silakan ulangi penukaran.'; end if;

  insert into public.matthew_reward_transactions(
    user_id,redemption_id,points_delta,event_type,description
  )
  values(
    v_user_id,v_redemption_id,-p_points,'redeemed',
    'Penukaran '||p_points::text||' poin menjadi diskon Rp'||v_discount::text
  );

  return jsonb_build_object(
    'code',v_code,'points_spent',p_points,'discount_amount',v_discount,
    'expires_at',now()+interval '30 days'
  );
end;
$function$;

revoke all on function public.redeem_matthew_points(integer) from public, anon;
grant execute on function public.redeem_matthew_points(integer) to authenticated;

-- Reward codes are personal, one-time fixed discounts. Preserve the existing public-voucher path.
create or replace function public.create_joki_order(
  p_client_name text,
  p_client_email text,
  p_product_code text,
  p_quantity integer,
  p_voucher_code text,
  p_kingdom_number text
)
returns table(
  order_number text, client_name text, client_email text, service_name text,
  quantity integer, unit_price integer, total_price integer, status text,
  voucher_code text, discount_amount integer, subtotal_price integer,
  kingdom_number text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_service text;
  v_price integer;
  v_qty integer;
  v_order text;
  v_status text := 'Menunggu';
  v_code text := nullif(upper(trim(coalesce(p_voucher_code,''))), '');
  v_kingdom text := trim(coalesce(p_kingdom_number,''));
  v_discount integer := 0;
  v_subtotal integer;
  v_total integer;
  v_voucher public.vouchers%rowtype;
  v_reward public.matthew_reward_redemptions%rowtype;
  v_auth_email text;
  v_user_id uuid := auth.uid();
  v_role text;
  v_account_status text;
begin
  if v_user_id is null or coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then
    raise exception 'Pemesanan hanya tersedia untuk akun yang sudah login.';
  end if;
  select lower(trim(p.role)),lower(trim(p.account_status)) into v_role,v_account_status
  from public.profiles p where p.id=v_user_id;
  if v_role not in ('warga biasa','warga tidak biasa','warga sultan') or v_account_status is distinct from 'active' then
    raise exception 'Akun ini tidak memiliki izin untuk membuat pesanan.';
  end if;
  select lower(trim(u.email)) into v_auth_email from auth.users u where u.id=v_user_id and u.email_confirmed_at is not null;
  if v_auth_email is null or v_auth_email='' then raise exception 'Email akun harus diverifikasi sebelum membuat pesanan.'; end if;
  if nullif(trim(coalesce(p_client_email,'')),'') is not null and lower(trim(p_client_email))<>v_auth_email then
    raise exception 'Email pesanan harus sama dengan email akun yang sedang login.';
  end if;
  if char_length(trim(coalesce(p_client_name,'')))<2 or char_length(trim(coalesce(p_client_name,'')))>80 then
    raise exception 'Nama client harus 2-80 karakter.';
  end if;
  if v_kingdom !~ '^[0-9]{1,12}$' then
    raise exception 'Nomor Kingdom wajib diisi dengan angka 1 sampai 12 digit.';
  end if;
  if p_quantity is null or p_quantity<4 or p_quantity>12 then
    raise exception 'Jumlah karakter harus antara 4 sampai 12.';
  end if;
  v_qty:=p_quantity;
  if p_product_code='CH11' then v_service:='City Hall 11'; v_price:=17000;
  elsif p_product_code='CH13' then v_service:='City Hall 13/13'; v_price:=45000;
  elsif p_product_code='CH17' then v_service:='City Hall 17/17'; v_price:=115000;
  else raise exception 'Produk tidak tersedia.'; end if;

  v_subtotal:=v_price*v_qty;
  v_total:=v_subtotal;

  if v_code is not null then
    select * into v_reward
    from public.matthew_reward_redemptions r
    where r.code=v_code and r.user_id=v_user_id
      and r.used_at is null and r.expires_at>now()
    for update;

    if found then
      if v_reward.discount_amount > v_subtotal then
        raise exception 'Subtotal pesanan harus minimal sebesar diskon reward Rp' || v_reward.discount_amount::text || '.';
      end if;
      v_discount:=v_reward.discount_amount;
      v_total:=v_subtotal-v_discount;
    else
      if exists(select 1 from public.matthew_reward_redemptions r where r.code=v_code) then
        raise exception 'Kode reward bukan milik akun ini, sudah digunakan, atau kedaluwarsa.';
      end if;
      select * into v_voucher from public.vouchers where code=v_code and is_active=true for update;
      if not found then raise exception 'Kode voucher tidak ditemukan atau sedang nonaktif.'; end if;
      if v_voucher.starts_at is not null and v_voucher.starts_at>now() then raise exception 'Voucher belum mulai berlaku.'; end if;
      if v_voucher.expires_at is not null and v_voucher.expires_at<=now() then raise exception 'Voucher sudah kedaluwarsa.'; end if;
      if v_voucher.max_uses is not null and v_voucher.used_count>=v_voucher.max_uses then raise exception 'Kuota penggunaan voucher sudah habis.'; end if;
      if v_voucher.audience_roles is not null and not (v_role=any(v_voucher.audience_roles)) then
        raise exception 'Voucher tidak tersedia untuk tingkatan akun kamu.';
      end if;
      if v_voucher.discount_type='percent' then v_discount:=floor(v_subtotal*least(v_voucher.discount_value,100)/100);
      elsif v_voucher.discount_type='fixed' then v_discount:=least(v_subtotal,floor(v_voucher.discount_value));
      else raise exception 'Jenis diskon voucher tidak valid.'; end if;
      v_total:=greatest(0,v_subtotal-v_discount);
      update public.vouchers set used_count=used_count+1 where id=v_voucher.id;
    end if;
  end if;

  v_order:='MJ-'||to_char(now() at time zone 'Asia/Jakarta','YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.joki_progress(
    token,order_number,client_name,client_email,service_name,quantity,unit_price,total_price,
    status,progress_percent,progress_note,voucher_code,discount_amount,subtotal_price,kingdom_number
  ) values (
    v_order,v_order,trim(p_client_name),v_auth_email,v_service,v_qty,v_price,v_total,v_status,0,
    'Pesanan berhasil dibuat otomatis. Menunggu konfirmasi pembayaran dan administrasi dari Matthew.',
    v_code,v_discount,v_subtotal,v_kingdom
  );

  if v_reward.id is not null then
    update public.matthew_reward_redemptions
    set used_at=now(),order_id=(select j.id from public.joki_progress j where j.order_number=v_order)
    where id=v_reward.id and user_id=v_user_id and used_at is null;
    if not found then raise exception 'Kode reward gagal ditandai sebagai digunakan.'; end if;
  end if;

  return query select v_order,trim(p_client_name),v_auth_email,v_service,v_qty,v_price,
    v_total,v_status,v_code,v_discount,v_subtotal,v_kingdom;
end;
$function$;

revoke all on function public.create_joki_order(text,text,text,integer,text,text) from public, anon;
grant execute on function public.create_joki_order(text,text,text,integer,text,text) to authenticated;

create or replace function public.admin_get_matthew_rewards()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
  v_transactions jsonb;
begin
  if not exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.role='admin' and lower(coalesce(p.account_status,''))='active'
  ) then raise exception 'Akses hanya untuk ADMIN aktif.'; end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.balance desc),'[]'::jsonb)
  into v_result
  from (
    select p.id,p.full_name,u.email,lower(p.role) as role,
      coalesce(sum(l.remaining_points) filter(where l.expires_at>now()),0)::integer as balance,
      coalesce(sum(l.points_earned),0)::integer as total_earned,
      max(l.created_at) as last_earned_at
    from public.profiles p
    join auth.users u on u.id=p.id
    left join public.matthew_reward_lots l on l.user_id=p.id
    where lower(p.role) in ('warga biasa','warga tidak biasa','warga sultan')
      and lower(coalesce(p.account_status,''))='active'
    group by p.id,p.full_name,u.email,p.role
  ) x;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb)
  into v_transactions
  from (
    select x.id,x.user_id,p.full_name,u.email,x.points_delta,x.event_type,x.description,x.created_at
    from public.matthew_reward_transactions x
    join public.profiles p on p.id=x.user_id
    join auth.users u on u.id=x.user_id
    order by x.created_at desc limit 50
  ) t;

  return jsonb_build_object('members',v_result,'transactions',v_transactions);
end;
$function$;

revoke all on function public.admin_get_matthew_rewards() from public, anon;
grant execute on function public.admin_get_matthew_rewards() to authenticated;

commit;
