-- Harden the SECURITY DEFINER trigger function that sends new-order
-- notifications to the private Telegram Edge Function.
create or replace function public.notify_telegram_new_joki_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  webhook_secret text;
begin
  select ds.decrypted_secret
    into webhook_secret
  from vault.decrypted_secrets as ds
  where ds.name = 'JOKI_WEBHOOK_SECRET'
  limit 1;

  if webhook_secret is null or webhook_secret = '' then
    raise warning 'JOKI_WEBHOOK_SECRET is not configured in Vault';
    return new;
  end if;

  perform net.http_post(
    url := 'https://aqiwrgnxwtphhwikqtmn.supabase.co/functions/v1/telegram-order-notify',
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := pg_catalog.jsonb_build_object('record', pg_catalog.to_jsonb(new))
  );

  return new;
end;
$function$;

revoke all on function public.notify_telegram_new_joki_order() from public, anon, authenticated;
