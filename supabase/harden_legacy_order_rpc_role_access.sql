-- Enforce the same role/status order policy on the legacy RPC while the
-- old published frontend is still in its compatibility window.
-- Signature and return contract are unchanged.

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
