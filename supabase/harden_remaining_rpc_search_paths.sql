-- Harden remaining SECURITY DEFINER RPC search paths.
-- Function bodies already use schema-qualified table/function references.
-- Restrict implicit object resolution to pg_catalog only.

begin;

alter function public.get_public_joki_reviews()
  set search_path = '';

alter function public.get_my_reviewed_order_ids()
  set search_path = '';

alter function public.submit_member_joki_review(uuid, integer, text, boolean)
  set search_path = '';

commit;
