-- Daily City Hall discount eligibility: 2 products per Jakarta day, 5%-12%,
-- with an independently randomized even minimum of 4, 6, 8, or 10 characters.
-- Action Point / Lohar is intentionally excluded from the promotion.

drop function if exists public.get_daily_joki_discounts();

create function public.get_daily_joki_discounts()
returns table (
  product_code text,
  discount_percent integer,
  minimum_characters integer,
  discount_date date
)
language sql
stable
set search_path = ''
as $function$
  with product_codes(product_code) as (
    values ('CH11'::text), ('CH12'::text), ('CH13'::text), ('CH14'::text),
           ('CH15'::text), ('CH16'::text), ('CH17'::text)
  ),
  local_day as (
    select (now() at time zone 'Asia/Jakarta')::date as discount_date
  ),
  scored as (
    select p.product_code, d.discount_date,
      md5(d.discount_date::text || ':' || p.product_code) as seed,
      row_number() over (
        order by md5(d.discount_date::text || ':' || p.product_code), p.product_code
      ) as daily_rank
    from product_codes p cross join local_day d
  )
  select
    s.product_code,
    5 + (get_byte(decode(s.seed, 'hex'), 4) % 8)::integer,
    (array[4,6,8,10])[(get_byte(decode(s.seed, 'hex'), 5) % 4) + 1]::integer,
    s.discount_date
  from scored s
  where s.daily_rank <= 2;
$function$;

revoke all on function public.get_daily_joki_discounts() from public;
grant execute on function public.get_daily_joki_discounts() to anon, authenticated;

-- Keep server-side order totals authoritative and enforce the same minimum.
do $migration$
declare
  v_definition text;
  v_old_select text := E'  select d.discount_percent into v_daily_discount\n  from public.get_daily_joki_discounts() d';
  v_new_select text := E'  select d.discount_percent, d.minimum_characters\n    into v_daily_discount, v_daily_minimum\n  from public.get_daily_joki_discounts() d';
  v_old_condition text := 'if v_daily_discount is not null then';
  v_new_condition text := 'if p_product_code <> ''AP-LOHAR'' and v_daily_discount is not null and v_daily_minimum is not null and p_quantity >= v_daily_minimum then';
begin
  select pg_get_functiondef(
    'public.create_joki_order(text,text,text,integer,text,text)'::regprocedure
  ) into v_definition;

  if strpos(v_definition, 'v_daily_minimum integer;') = 0 then
    v_definition := replace(
      v_definition,
      '  v_daily_discount integer;',
      '  v_daily_discount integer;' || E'\n' || '  v_daily_minimum integer;'
    );
  end if;

  if strpos(v_definition, v_new_select) = 0 then
    if strpos(v_definition, v_old_select) = 0 then
      raise exception 'Daily discount query was not found; refusing to patch order pricing.';
    end if;
    v_definition := replace(v_definition, v_old_select, v_new_select);
  end if;

  if strpos(v_definition, v_new_condition) = 0 then
    if strpos(v_definition, v_old_condition) = 0 then
      raise exception 'Daily discount condition was not found; refusing to patch order pricing.';
    end if;
    v_definition := replace(v_definition, v_old_condition, v_new_condition);
  end if;

  execute v_definition;
end;
$migration$;
