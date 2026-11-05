-- Trusted server-to-server maintenance control for the Telegram admin webhook.
-- Execute privilege is restricted to service_role; the Edge Function separately
-- verifies the Telegram chat and sender against TELEGRAM_CHAT_ID.

create or replace function public.service_set_maintenance(
  p_actor_id uuid,
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
  v_role text;
  v_status text;
  v_previous jsonb;
  v_new jsonb;
  v_modules text[] := coalesce(p_affected_modules,'{}'::text[]);
  v_message text := nullif(btrim(coalesce(p_message,'')),'');
begin
  select lower(trim(p.role)),lower(trim(p.account_status))
    into v_role,v_status
  from public.profiles p where p.id=p_actor_id;

  if v_role is distinct from 'admin' or v_status is distinct from 'active' then
    raise exception 'Telegram maintenance actor is not an active admin.';
  end if;
  if p_mode is null or p_mode not in ('full','orders','system') then
    raise exception 'Invalid maintenance mode.';
  end if;
  if char_length(coalesce(p_message,''))>500 then
    raise exception 'Maintenance message exceeds 500 characters.';
  end if;
  if array_position(v_modules,null) is not null
     or exists(select 1 from unnest(v_modules) as x where x not in ('orders','worker','macul','inbox')) then
    raise exception 'Invalid maintenance module list.';
  end if;
  if p_enabled and p_mode='system' and cardinality(v_modules)=0 then
    raise exception 'System maintenance requires at least one module.';
  end if;
  if p_estimated_end_at is not null and p_estimated_end_at<now() then
    raise exception 'Maintenance estimate cannot be in the past.';
  end if;

  select jsonb_build_object(
    'enabled',m.enabled,'mode',m.mode,'message',m.message,
    'estimated_end_at',m.estimated_end_at,'affected_modules',m.affected_modules
  ) into v_previous from public.site_maintenance_config m where m.id=true;

  insert into public.site_maintenance_config(
    id,enabled,mode,message,estimated_end_at,affected_modules,updated_by,updated_at
  ) values (
    true,coalesce(p_enabled,false),p_mode,
    coalesce(v_message,'Website sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.'),
    p_estimated_end_at,v_modules,p_actor_id,now()
  )
  on conflict(id) do update set
    enabled=excluded.enabled,mode=excluded.mode,message=excluded.message,
    estimated_end_at=excluded.estimated_end_at,affected_modules=excluded.affected_modules,
    updated_by=excluded.updated_by,updated_at=now();

  select jsonb_build_object(
    'enabled',m.enabled,'mode',m.mode,'message',m.message,
    'estimated_end_at',m.estimated_end_at,'affected_modules',m.affected_modules,
    'updated_at',m.updated_at
  ) into v_new from public.site_maintenance_config m where m.id=true;

  insert into public.site_maintenance_audit(actor_id,action,previous_state,new_state)
  values(p_actor_id,case when not coalesce(p_enabled,false) then 'disabled'
    when coalesce((v_previous->>'enabled')::boolean,false)=false then 'enabled'
    else 'updated' end,v_previous,v_new);

  return v_new;
end;
$function$;

revoke all on function public.service_set_maintenance(uuid,boolean,text,text,timestamptz,text[]) from public, anon, authenticated;
grant execute on function public.service_set_maintenance(uuid,boolean,text,text,timestamptz,text[]) to service_role;
