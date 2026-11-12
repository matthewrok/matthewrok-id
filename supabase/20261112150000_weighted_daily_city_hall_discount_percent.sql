-- Weighted daily City Hall discount percentages.
-- 5=20%, 6=18%, 7=16%, 8=14%, 9=12%, 10=9%, 11=7%, 12=4%.
-- Product count remains: 1=38%, 2=27%, 3=19%, 4=13%, 5=2%, 6=1%.
-- Only CH11-CH17 are eligible; Action Point / Lohar is always excluded.
-- Offers remain deterministic for each Asia/Jakarta calendar day.

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
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 38 then 1
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 65 then 2
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 84 then 3
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 97 then 4
        when get_byte(decode(md5(d.discount_date::text || ':daily-count'), 'hex'), 0) % 100 < 99 then 5
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
  ),
  selected as (
    select s.*,
      get_byte(decode(md5(s.discount_date::text || ':' || s.product_code || ':discount-percent'), 'hex'), 0) % 100 as discount_roll
    from scored s
    where s.daily_rank <= s.product_count
  )
  select
    s.product_code,
    case
      when s.discount_roll < 20 then 5
      when s.discount_roll < 38 then 6
      when s.discount_roll < 54 then 7
      when s.discount_roll < 68 then 8
      when s.discount_roll < 80 then 9
      when s.discount_roll < 89 then 10
      when s.discount_roll < 96 then 11
      else 12
    end::integer as discount_percent,
    (array[4,6,8,10])[(get_byte(decode(s.seed, 'hex'), 5) % 4) + 1]::integer,
    s.discount_date
  from selected s;
$function$;

revoke all on function public.get_daily_joki_discounts() from public;
grant execute on function public.get_daily_joki_discounts() to anon, authenticated;
