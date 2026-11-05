-- Maintenance Mode 2.0 — single canonical configuration, server-enforced.
-- This migration is additive. No existing order, review, account, or voucher rows are changed.

begin;

create table if not exists public.site_maintenance_config (
  id boolean primary key default true check (id is true),
  enabled boolean not null default false,
  mode text not null default 'full' check (mode in ('full','orders','system')),
  message text not null default 'Website sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.',
  estimated_end_at timestamptz,
  affected_modules text[] not null default '{}'::text[],
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_maintenance_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null check (action in ('enabled','disabled','updated')),
  previous_state jsonb,
  new_state jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists site_maintenance_audit_created_at_idx
  on public.site_maintenance_audit(created_at desc);

alter table public.site_maintenance_config enable row level security;
alter table public.site_maintenance_audit enable row level security;
revoke all on public.site_maintenance_config from public, anon, authenticated;
revoke all on public.site_maintenance_audit from public, anon, authenticated;

insert into public.site_maintenance_config(id,enabled,mode,message,affected_modules)
values(true,false,'full','Website sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.','{}'::text[])
on conflict(id) do nothing;

create or replace function public.get_public_maintenance_status()
returns table(
  enabled boolean,
  mode text,
  message text,
  estimated_end_at timestamptz,
  affected_modules text[],
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select m.enabled,m.mode,m.message,m.estimated_end_at,m.affected_modules,m.updated_at
  from public.site_maintenance_config m
  where m.id = true
  limit 1;
$function$;

revoke all on function public.get_public_maintenance_status() from public;
grant execute on function public.get_public_maintenance_status() to anon, authenticated;

create or replace function public.admin_set_maintenance(
  p_enabled boolean,
  p_mode text,
  p_message text default '',
  p_estimated_end_at timestamptz default null,
  p_affected_modules text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_account_status text;
  v_previous jsonb;
  v_new jsonb;
  v_modules text[] := coalesce(p_affected_modules,'{}'::text[]);
  v_message text := nullif(btrim(coalesce(p_message,'')),'');
begin
  if v_actor is null then raise exception 'Admin harus login.'; end if;

  select lower(trim(p.role)),lower(trim(p.account_status))
    into v_role,v_account_status
  from public.profiles p where p.id=v_actor;

  if v_role is distinct from 'admin' or v_account_status is distinct from 'active' then
    raise exception 'Hanya admin aktif yang dapat mengubah maintenance mode.';
  end if;

  if p_mode is null or p_mode not in ('full','orders','system') then
    raise exception 'Mode maintenance tidak valid.';
  end if;
  if char_length(coalesce(p_message,''))>500 then
    raise exception 'Pesan maintenance maksimal 500 karakter.';
  end if;
  if array_position(v_modules,null) is not null
     or exists(select 1 from unnest(v_modules) as x where x not in ('orders','worker','macul','inbox')) then
    raise exception 'Daftar modul maintenance tidak valid.';
  end if;
  if p_enabled and p_mode='system' and cardinality(v_modules)=0 then
    raise exception 'Pilih minimal satu modul untuk System Maintenance.';
  end if;
  if p_estimated_end_at is not null and p_estimated_end_at < now() then
    raise exception 'Estimasi selesai tidak boleh berada di masa lalu.';
  end if;

  select jsonb_build_object(
    'enabled',m.enabled,'mode',m.mode,'message',m.message,
    'estimated_end_at',m.estimated_end_at,'affected_modules',m.affected_modules
  ) into v_previous
  from public.site_maintenance_config m where m.id=true;

  insert into public.site_maintenance_config(
    id,enabled,mode,message,estimated_end_at,affected_modules,updated_by,updated_at
  ) values (
    true,coalesce(p_enabled,false),p_mode,
    coalesce(v_message,'Website sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.'),
    p_estimated_end_at,v_modules,v_actor,now()
  )
  on conflict(id) do update set
    enabled=excluded.enabled,
    mode=excluded.mode,
    message=excluded.message,
    estimated_end_at=excluded.estimated_end_at,
    affected_modules=excluded.affected_modules,
    updated_by=excluded.updated_by,
    updated_at=now();

  select jsonb_build_object(
    'enabled',m.enabled,'mode',m.mode,'message',m.message,
    'estimated_end_at',m.estimated_end_at,'affected_modules',m.affected_modules,
    'updated_at',m.updated_at
  ) into v_new
  from public.site_maintenance_config m where m.id=true;

  insert into public.site_maintenance_audit(actor_id,action,previous_state,new_state)
  values(v_actor,case when not coalesce(p_enabled,false) then 'disabled'
    when coalesce((v_previous->>'enabled')::boolean,false)=false then 'enabled'
    else 'updated' end,v_previous,v_new);

  return v_new;
end;
$function$;

revoke all on function public.admin_set_maintenance(boolean,text,text,timestamptz,text[]) from public, anon;
grant execute on function public.admin_set_maintenance(boolean,text,text,timestamptz,text[]) to authenticated;

create or replace function public.admin_get_maintenance_audit()
returns table(id bigint,actor_id uuid,action text,previous_state jsonb,new_state jsonb,created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists(
    select 1 from public.profiles p
    where p.id=v_actor and lower(p.role)='admin' and lower(p.account_status)='active'
  ) then
    raise exception 'Akses admin diperlukan.';
  end if;
  return query
  select a.id,a.actor_id,a.action,a.previous_state,a.new_state,a.created_at
  from public.site_maintenance_audit a
  order by a.created_at desc
  limit 50;
end;
$function$;

revoke all on function public.admin_get_maintenance_audit() from public, anon;
grant execute on function public.admin_get_maintenance_audit() to authenticated;

create or replace function public.create_joki_order(
  p_client_name text,
  p_client_email text,
  p_product_code text,
  p_quantity integer,
  p_voucher_code text,
  p_kingdom_number text
)
returns table(
  order_number text,
  client_name text,
  client_email text,
  service_name text,
  quantity integer,
  unit_price integer,
  total_price integer,
  status text,
  voucher_code text,
  discount_amount integer,
  subtotal_price integer,
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
  v_auth_email text;
  v_user_id uuid := auth.uid();
  v_role text;
  v_account_status text;
begin
  if v_user_id is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
    raise exception 'Pemesanan hanya tersedia untuk akun yang sudah login.';
  end if;

  select lower(trim(p.role)), lower(trim(p.account_status))
    into v_role, v_account_status
  from public.profiles p
  where p.id = v_user_id;

  if v_role not in ('member','sultan','matthew','pelanggan')
     or v_account_status is distinct from 'active' then
    raise exception 'Akun ini tidak memiliki izin untuk membuat pesanan.';
  end if;

  select lower(trim(u.email)) into v_auth_email
  from auth.users u
  where u.id = v_user_id;

  if v_auth_email is null or v_auth_email='' then
    raise exception 'Email akun tidak tersedia.';
  end if;

  if nullif(trim(coalesce(p_client_email,'')),'') is not null
     and lower(trim(p_client_email))<>v_auth_email then
    raise exception 'Email pesanan harus sama dengan email akun yang sedang login.';
  end if;

  if char_length(trim(coalesce(p_client_name,'')))<2
     or char_length(trim(coalesce(p_client_name,'')))>80 then
    raise exception 'Nama client harus 2-80 karakter.';
  end if;

  if v_kingdom !~ '^[0-9]{1,12}$' then
    raise exception 'Nomor Kingdom wajib diisi dengan angka 1 sampai 12 digit.';
  end if;

  if p_quantity is null or p_quantity<4 or p_quantity>12 then
    raise exception 'Jumlah karakter harus antara 4 sampai 12.';
  end if;

  if p_product_code='CH11' then v_service:='City Hall 11'; v_price:=17000;
  elsif p_product_code='CH13' then v_service:='City Hall 13/13'; v_price:=45000;
  elsif p_product_code='CH17' then v_service:='City Hall 17/17'; v_price:=115000;
  else raise exception 'Produk tidak tersedia.';
  end if;

  if exists (
    select 1 from public.site_maintenance_config m
    where m.id = true and m.enabled
      and (
        m.mode = 'full'
        or m.mode = 'orders'
        or (m.mode = 'system' and 'orders' = any(m.affected_modules))
      )
  ) then
    raise exception 'Pemesanan sedang dinonaktifkan sementara oleh admin.';
  end if;

  v_qty:=p_quantity;
  v_subtotal:=v_price*v_qty;
  v_total:=v_subtotal;

  if v_code is not null then
    select * into v_voucher
    from public.vouchers
    where code=v_code and is_active=true
    for update;

    if not found then raise exception 'Kode voucher tidak ditemukan atau sedang nonaktif.'; end if;
    if v_voucher.starts_at is not null and v_voucher.starts_at>now() then raise exception 'Voucher belum mulai berlaku.'; end if;
    if v_voucher.expires_at is not null and v_voucher.expires_at<=now() then raise exception 'Voucher sudah kedaluwarsa.'; end if;
    if v_voucher.max_uses is not null and v_voucher.used_count>=v_voucher.max_uses then raise exception 'Kuota penggunaan voucher sudah habis.'; end if;

    if v_voucher.discount_type='percent' then
      v_discount:=floor(v_subtotal*least(v_voucher.discount_value,100)/100);
    elsif v_voucher.discount_type='fixed' then
      v_discount:=least(v_subtotal,floor(v_voucher.discount_value));
    else
      raise exception 'Jenis diskon voucher tidak valid.';
    end if;

    v_total:=greatest(0,v_subtotal-v_discount);
    update public.vouchers set used_count=used_count+1 where id=v_voucher.id;
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

  return query select v_order,trim(p_client_name),v_auth_email,v_service,v_qty,v_price,
    v_total,v_status,v_code,v_discount,v_subtotal,v_kingdom;
end;
$function$;

revoke all on function public.create_joki_order(text,text,text,integer,text,text) from public, anon;
grant execute on function public.create_joki_order(text,text,text,integer,text,text) to authenticated;


commit;
