-- Run this in the Supabase SQL editor of the app's project
-- (https://psanmbsimwxpperizsxe.supabase.co) before the website goes live.
--
-- First, check what's already there:
--
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies
--   where tablename in ('shops') and schemaname = 'public';
--
-- Everything below is written with `drop policy if exists` first, so it's
-- safe to run even if some of these policies already exist.

-- ── shops ──────────────────────────────────────────────────────────────

alter table public.shops enable row level security;

drop policy if exists "Authenticated users can view approved or own shops" on public.shops;
create policy "Authenticated users can view approved or own shops"
  on public.shops
  for select
  to authenticated
  using (status = 'approved' or owner_id = auth.uid());

drop policy if exists "Vendors can insert their own shop" on public.shops;
create policy "Vendors can insert their own shop"
  on public.shops
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Vendors can update their own shop" on public.shops;
create policy "Vendors can update their own shop"
  on public.shops
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ── shop-documents storage bucket ────────────────────────────────────────
-- Public read so customers can see shop photos without logging in;
-- upload restricted to signed-in users only.

insert into storage.buckets (id, name, public)
values ('shop-documents', 'shop-documents', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can upload shop documents" on storage.objects;
create policy "Authenticated users can upload shop documents"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'shop-documents');

drop policy if exists "Anyone can view shop documents" on storage.objects;
create policy "Anyone can view shop documents"
  on storage.objects
  for select
  to public
  using (bucket_id = 'shop-documents');
