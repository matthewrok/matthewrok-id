-- Expand the Matthew Joki product catalog and keep order/wishlist pricing in sync.
-- Apply only after this migration is reviewed and merged.
begin;

do $migration$
declare
  v_definition text;
  v_old text := $old$elsif p_product_code='CH13' then v_service:='City Hall 13/13'; v_price:=45000;
  elsif p_product_code='CH17' then v_service:='City Hall 17/17'; v_price:=115000;$old$;
  v_new text := $new$
  elsif p_product_code='CH12' then v_service:='City Hall 12'; v_price:=29000;
  elsif p_product_code='CH13' then v_service:='City Hall 13'; v_price:=45000;
  elsif p_product_code='CH14' then v_service:='City Hall 14'; v_price:=55000;
  elsif p_product_code='CH15' then v_service:='City Hall 15'; v_price:=75000;
  elsif p_product_code='CH16' then v_service:='City Hall 16'; v_price:=85000;
  elsif p_product_code='CH17' then v_service:='City Hall 17'; v_price:=120000;
$new$;
begin
  v_definition := pg_get_functiondef('public.create_joki_order(text,text,text,integer,text,text)'::regprocedure);
  if position(v_old in v_definition)=0 then
    raise exception 'Blok harga CH17 pada public.create_joki_order tidak cocok; hentikan migrasi.';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;

alter table public.member_package_wishlist
  drop constraint if exists member_package_wishlist_product_code_check;
alter table public.member_package_wishlist
  add constraint member_package_wishlist_product_code_check
  check (product_code in ('CH11','CH12','CH13','CH14','CH15','CH16','CH17'));

do $migration$
declare
  v_definition text;
  v_old text := $old$v_code not in ('CH11','CH13','CH17')$old$;
  v_new text := $new$v_code not in ('CH11','CH12','CH13','CH14','CH15','CH16','CH17')$new$;
begin
  v_definition := pg_get_functiondef('private.add_my_package_to_wishlist(text)'::regprocedure);
  if position(v_old in v_definition)=0 then
    raise exception 'Validasi kode produk wishlist tidak cocok; hentikan migrasi.';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;

commit;
