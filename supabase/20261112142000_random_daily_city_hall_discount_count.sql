-- Randomize how many City Hall products receive a daily discount.
-- Probability distribution: 1=35%, 2=25%, 3=18%, 4=12%, 5=7%, 6=3%.
-- Total is 100%; at least one and at most six of CH11-CH17 are selected.
-- AP/Lohar remains excluded. Product selection, percentage, and even minimum
-- remain deterministic for the Jakarta calendar day so all clients see the same offer.

create or replace function public.get_daily_joki_discounts()
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
  daily_count as (
    select d.discount_date,
      case
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 35 then 1
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 60 then 2
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 78 then 3
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 90 then 4
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 97 then 5
        else 6
      end as product_count
    from local_day d
  ),
  scored as (
    select p.product_code, d.discount_date, c.product_count,
      md5(d.discount_date::text || ':' || p.product_code) as seed,
      row_number() over (
        order by md5(d.discount_date::text || ':' || p.product_code), p.product_code
      ) as daily_rank
    from product_codes p
    cross join local_day d
    join daily_count c on c.discount_date = d.discount_date
  )
  select
    s.product_code,
    5 + (get_byte(decode(s.seed, 'hex'), 4) % 8)::integer,
    (array[4,6,8,10])[(get_byte(decode(s.seed, 'hex'), 5) % 4) + 1]::integer,
    s.discount_date
  from scored s
  where s.daily_rank <= s.product_count;
$function$;

revoke all on function public.get_daily_joki_discounts() from public;
grant execute on function public.get_daily_joki_discounts() to anon, authenticated;
