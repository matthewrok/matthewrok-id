-- Add Action Point / Lohar to the existing authenticated order pipeline.
-- p_quantity stores the number of thousands of AP (K units); Kingdom is intentionally NULL.
-- Existing City Hall validation, pricing, voucher/reward handling, order trigger and tracking token remain intact.

begin;

do $migration$
declare
  v_definition text;
  v_old_kingdom text := $old$
  if v_kingdom !~ '^[0-9]{1,12}$' then
    raise exception 'Nomor Kingdom wajib diisi dengan angka 1 sampai 12 digit.';
  end if;
$old$;
  v_new_kingdom text := $new$
  if p_product_code = 'AP-LOHAR' then
    v_kingdom := null;
  elsif v_kingdom !~ '^[0-9]{1,12}$' then
    raise exception 'Nomor Kingdom wajib diisi dengan angka 1 sampai 12 digit.';
  end if;
$new$;
  v_old_quantity text := $old$
  if p_quantity is null or p_quantity<4 or p_quantity>12 then
    raise exception 'Jumlah karakter harus antara 4 sampai 12.';
  end if;
$old$;
  v_new_quantity text := $new$
  if p_product_code = 'AP-LOHAR' then
    if p_quantity is null or p_quantity < 1 or p_quantity > 1000000 then
      raise exception 'Jumlah Action Point harus antara 1K sampai 1.000.000K.';
    end if;
  elsif p_quantity is null or p_quantity < 4 or p_quantity > 12 then
    raise exception 'Jumlah karakter harus antara 4 sampai 12.';
  end if;
$new$;
  v_old_product text := $old$  else raise exception 'Produk tidak tersedia.'; end if;$old$;
  v_new_product text := $new$  elsif p_product_code = 'AP-LOHAR' then v_service := 'Joki Action Point / Lohar'; v_price := 1000;
  else raise exception 'Produk tidak tersedia.'; end if;$new$;
begin
  select pg_get_functiondef('public.create_joki_order(text,text,text,integer,text,text)'::regprocedure)
    into v_definition;

  if position(v_old_kingdom in v_definition) = 0 then
    raise exception 'Validasi Kingdom tidak cocok dengan definisi produksi; migrasi dibatalkan.';
  end if;
  if position(v_old_quantity in v_definition) = 0 then
    raise exception 'Validasi jumlah karakter tidak cocok dengan definisi produksi; migrasi dibatalkan.';
  end if;
  if position(v_old_product in v_definition) = 0 then
    raise exception 'Daftar produk tidak cocok dengan definisi produksi; migrasi dibatalkan.';
  end if;

  v_definition := replace(v_definition, v_old_kingdom, v_new_kingdom);
  v_definition := replace(v_definition, v_old_quantity, v_new_quantity);
  v_definition := replace(v_definition, v_old_product, v_new_product);
  execute v_definition;
end
$migration$;

commit;
