create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  store_name text not null default '',
  expense_date date not null default current_date,
  expense_time text,
  subtotal numeric(12, 2),
  tax numeric(12, 2),
  discount numeric(12, 2),
  total_amount numeric(12, 2) not null check (total_amount > 0),
  category text not null default 'Others',
  payment_method text not null default '',
  notes text not null default '',
  source text not null default 'manual' check (source in ('manual', 'receipt_scan')),
  currency text not null default 'PHP',
  receipt_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, expense_date desc, created_at desc);

alter table public.expenses enable row level security;

drop policy if exists "Users can view their own expenses" on public.expenses;
create policy "Users can view their own expenses"
  on public.expenses for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own expenses" on public.expenses;
create policy "Users can insert their own expenses"
  on public.expenses for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own expenses" on public.expenses;
create policy "Users can update their own expenses"
  on public.expenses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own expenses" on public.expenses;
create policy "Users can delete their own expenses"
  on public.expenses for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipt-images', 'receipt-images', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own receipt images" on storage.objects;
create policy "Users can view their own receipt images"
  on storage.objects for select to authenticated
  using (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload their own receipt images" on storage.objects;
create policy "Users can upload their own receipt images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own receipt images" on storage.objects;
create policy "Users can update their own receipt images"
  on storage.objects for update to authenticated
  using (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own receipt images" on storage.objects;
create policy "Users can delete their own receipt images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'receipt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
