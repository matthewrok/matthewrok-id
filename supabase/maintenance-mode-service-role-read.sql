-- The worker Edge Function and Telegram admin webhook read the canonical
-- maintenance config with service_role. Keep this table private from API users.
grant select on table public.site_maintenance_config to service_role;
