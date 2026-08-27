-- Run this in the Supabase SQL editor of the project used by the BreakQ app.
-- Creates the table + storage bucket the "Become a partner" form on the
-- website writes to, with RLS locked down to insert-only for anonymous users.

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  mobile text not null,
  business_address text not null,
  years_experience integer not null,
  gstin text,
  photo_path text not null,
  business_proof_path text,
  status text not null default 'new'
);

alter table public.partner_applications enable row level security;

-- The public website form can only insert — never read, update, or delete.
create policy "Anon can submit partner applications"
  on public.partner_applications
  for insert
  to anon
  with check (true);

-- Private bucket: uploaded photos / business proof are not publicly listable.
-- The website only needs to upload; staff/back-office access should go
-- through the Supabase dashboard or a signed URL (service role).
insert into storage.buckets (id, name, public)
values ('partner-applications', 'partner-applications', false)
on conflict (id) do nothing;

create policy "Anon can upload partner application files"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'partner-applications');
