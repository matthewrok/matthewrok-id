-- Notify the private MATTHEW Telegram admin bot when a real order changes.
-- Applied to production Supabase as migration notify_telegram_on_joki_order_updates.
create or replace function public.notify_telegram_joki_order_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare webhook_secret text;
begin
  if new.order_number is null or new.order_number = '' then return new; end if;
  if old.status is not distinct from new.status
     and old.progress_percent is not distinct from new.progress_percent
     and old.progress_note is not distinct from new.progress_note then
    return new;
  end if;
  select ds.decrypted_secret into webhook_secret
  from vault.decrypted_secrets as ds where ds.name = 'JOKI_WEBHOOK_SECRET' limit 1;
  if webhook_secret is null or webhook_secret = '' then
    raise warning 'JOKI_WEBHOOK_SECRET is not configured in Vault';
    return new;
  end if;
  perform net.http_post(
    url := 'https://aqiwrgnxwtphhwikqtmn.supabase.co/functions/v1/telegram-order-notify',
    headers := pg_catalog.jsonb_build_object('Content-Type','application/json','x-webhook-secret',webhook_secret),
    body := pg_catalog.jsonb_build_object(
      'action','order_updated',
      'record',pg_catalog.to_jsonb(new),
      'old_record',pg_catalog.to_jsonb(old)
    )
  );
  return new;
end;
$$;
drop trigger if exists trg_notify_telegram_joki_order_update on public.joki_progress;
create trigger trg_notify_telegram_joki_order_update
after update on public.joki_progress
for each row execute function public.notify_telegram_joki_order_update();
revoke all on function public.notify_telegram_joki_order_update() from public, anon, authenticated;
