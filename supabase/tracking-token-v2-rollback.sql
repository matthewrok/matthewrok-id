-- PRE-RELEASE ROLLBACK ONLY for tracking-token-v2.sql.
-- Do NOT run after the new frontend has created orders using tracking_token.
-- Existing legacy token and order_number values are intentionally left untouched.

begin;

drop function if exists public.create_joki_order_secure(text,text,text,integer,text,text);
drop function if exists public.lookup_joki_progress_secure(text);
drop function if exists public.lookup_joki_review_secure(text);
drop function if exists public.submit_joki_review_secure(text,integer,text,boolean);

drop trigger if exists trg_ensure_joki_tracking_token on public.joki_progress;
drop function if exists public.ensure_joki_tracking_token();

alter table public.joki_progress
  drop column if exists tracking_token;

commit;
