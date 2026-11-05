-- MATTHEW JOKI — secure tracking token v2 (cutover phase)
-- Apply only AFTER:
-- 1) tracking-token-v2.sql is applied,
-- 2) the updated frontend using *_secure RPCs is published,
-- 3) the admin has privately delivered new tracking tokens to existing clients.
-- This intentionally disables legacy token endpoints. It does not delete legacy columns.

begin;

revoke all on function public.lookup_joki_progress(text) from public, anon, authenticated;
revoke all on function public.lookup_joki_review(text) from public, anon, authenticated;
revoke all on function public.submit_joki_review(text, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.create_joki_order(text, text, text, integer, text, text) from public, anon, authenticated;

commit;
