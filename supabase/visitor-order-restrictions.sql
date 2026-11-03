/* Visitor order/voucher restriction — applied to Supabase project aqiwrgnxwtphhwikqtmn.
   Visitors using the anon key cannot read vouchers or create orders.
   Authenticated members can continue using the 5-argument RPC.
*/

-- Remove anonymous access to voucher rows.
REVOKE SELECT ON TABLE public.vouchers FROM anon;

-- The 5-argument order RPC validates authentication inside the function.
-- Its full CREATE OR REPLACE definition is maintained in the Supabase project.
REVOKE ALL ON FUNCTION public.create_joki_order(text,text,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_joki_order(text,text,text,integer,text) TO authenticated;

-- Retire anonymous access to the legacy no-voucher overload as well.
REVOKE ALL ON FUNCTION public.create_joki_order(text,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_joki_order(text,text,text,integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
