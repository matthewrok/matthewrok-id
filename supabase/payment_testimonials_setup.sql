-- Payment testimonials gallery
-- Apply only after reviewing this migration and merging the related PR.
begin;

create table if not exists public.payment_testimonials (
  id uuid primary key default gen_random_uuid(),
  image_path text not null unique,
  caption text,
  transaction_date date,
  display_order integer not null default 0,
  published boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint payment_testimonials_caption_length check (caption is null or char_length(caption) <= 140),
  constraint payment_testimonials_image_path_not_empty check (char_length(trim(image_path)) > 0)
);

create index if not exists payment_testimonials_public_order_idx
  on public.payment_testimonials (published, display_order, created_at desc);

alter table public.payment_testimonials enable row level security;

drop policy if exists "Public can view published payment testimonials" on public.payment_testimonials;
create policy "Public can view published payment testimonials"
  on public.payment_testimonials for select
  to anon, authenticated
  using (
    published = true
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

drop policy if exists "Admins can insert payment testimonials" on public.payment_testimonials;
create policy "Admins can insert payment testimonials"
  on public.payment_testimonials for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
        and p.account_status = 'active'
    )
    and created_by = (select auth.uid())
  );

drop policy if exists "Admins can update payment testimonials" on public.payment_testimonials;
create policy "Admins can update payment testimonials"
  on public.payment_testimonials for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
        and p.account_status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

drop policy if exists "Admins can delete payment testimonials" on public.payment_testimonials;
create policy "Admins can delete payment testimonials"
  on public.payment_testimonials for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

grant select on public.payment_testimonials to anon, authenticated;
grant insert, update, delete on public.payment_testimonials to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-testimonials', 'payment-testimonials', true, 8388608, array['image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload payment testimonial images" on storage.objects;
create policy "Admins can upload payment testimonial images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-testimonials'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

drop policy if exists "Admins can delete payment testimonial images" on storage.objects;
create policy "Admins can delete payment testimonial images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'payment-testimonials'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

commit;