-- Remove an unused anonymous voucher SELECT policy.
-- anon has no SELECT table grant and visitors must not access voucher data.
drop policy if exists "Public reads usable vouchers" on public.vouchers;
