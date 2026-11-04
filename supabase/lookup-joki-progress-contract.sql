-- MATTHEW JOKI: align public progress lookup with the fields rendered by joki-matthew.js.
-- REVIEWED CANDIDATE ONLY. Do not run until coordinated with the tracking-token security migration.
-- This function still accepts the legacy token stored in joki_progress.token; it does not
-- solve the low-entropy token issue. Keep the returned fields limited to client-facing data.

begin;

drop function if exists public.lookup_joki_progress(text);

create function public.lookup_joki_progress(p_token text)
returns table (
  order_number text,
  client_name text,
  service_name text,
  quantity integer,
  total_price integer,
  status text,
  progress_percent integer,
  progress_note text,
  updated_at timestamptz
)
language sql
security definer
set search_path = ''
as $function$
  select
    j.order_number,
    j.client_name,
    j.service_name,
    j.quantity,
    j.total_price,
    j.status,
    j.progress_percent,
    j.progress_note,
    j.updated_at
  from public.joki_progress as j
  where upper(j.token) = upper(trim(coalesce(p_token, '')))
  limit 1;
$function$;

revoke all on function public.lookup_joki_progress(text) from public;
grant execute on function public.lookup_joki_progress(text) to anon, authenticated;

commit;
