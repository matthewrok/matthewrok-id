-- CH12 order variants: persist the selected fulfillment type in the service name.
-- KOSONGAN is Rp29.000/char; ISIAN with 10-15M+ resources is Rp35.000/char.
begin;

do $migration$
declare
  v_definition text;
  v_old text := $old$elsif p_product_code='CH12' then v_service:='City Hall 12'; v_price:=29000;$old$;
  v_new text := $new$elsif p_product_code='CH12' then v_service:='City Hall 12'; v_price:=29000;
  elsif p_product_code='CH12-KOSONGAN' then v_service:='City Hall 12 - KOSONGAN (Tanpa Resource)'; v_price:=29000;
  elsif p_product_code='CH12-ISIAN' then v_service:='City Hall 12 - ISIAN (Resource 10-15M+)'; v_price:=35000;$new$;
begin
  v_definition := pg_get_functiondef('public.create_joki_order(text,text,text,integer,text,text)'::regprocedure);
  if position(v_old in v_definition)=0 then
    raise exception 'Blok harga CH12 pada public.create_joki_order tidak cocok; hentikan migrasi.';
  end if;
  execute replace(v_definition,v_old,v_new);
end
$migration$;

commit;
