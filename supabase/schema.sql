-- Beauty CA PWA - schéma Supabase
-- À exécuter une fois dans Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  defaults_seeded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('prestation', 'produit')),
  price numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  image_url text,
  sort_order integer not null default 0,
  is_solo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_date timestamptz not null default now(),
  payment_method text not null check (payment_method in ('espece', 'carte_perso', 'carte_pro')),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sale_id uuid not null,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  name_snapshot text not null,
  type_snapshot text not null check (type_snapshot in ('prestation', 'produit')),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  constraint sale_lines_sale_owner_fk
    foreign key (sale_id, user_id)
    references public.sales(id, user_id)
    on delete cascade
);

create index if not exists catalog_items_user_type_order_idx
  on public.catalog_items(user_id, type, sort_order);
create index if not exists sales_user_date_idx
  on public.sales(user_id, sale_date desc);
create index if not exists sale_lines_sale_idx
  on public.sale_lines(sale_id);

-- Mise à jour automatique du champ updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_catalog_items_updated_at on public.catalog_items;
create trigger set_catalog_items_updated_at
before update on public.catalog_items
for each row execute function public.set_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

-- RLS : chaque compte ne voit et ne modifie que ses propres données.
alter table public.user_settings enable row level security;
alter table public.catalog_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_lines enable row level security;

drop policy if exists "settings_select_own" on public.user_settings;
create policy "settings_select_own" on public.user_settings
for select to authenticated using (user_id = auth.uid());

drop policy if exists "settings_insert_own" on public.user_settings;
create policy "settings_insert_own" on public.user_settings
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "settings_update_own" on public.user_settings;
create policy "settings_update_own" on public.user_settings
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "catalog_select_own" on public.catalog_items;
create policy "catalog_select_own" on public.catalog_items
for select to authenticated using (user_id = auth.uid());

drop policy if exists "catalog_insert_own" on public.catalog_items;
create policy "catalog_insert_own" on public.catalog_items
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "catalog_update_own" on public.catalog_items;
create policy "catalog_update_own" on public.catalog_items
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "catalog_delete_own" on public.catalog_items;
create policy "catalog_delete_own" on public.catalog_items
for delete to authenticated using (user_id = auth.uid());

drop policy if exists "sales_select_own" on public.sales;
create policy "sales_select_own" on public.sales
for select to authenticated using (user_id = auth.uid());

drop policy if exists "sales_insert_own" on public.sales;
create policy "sales_insert_own" on public.sales
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "sales_update_own" on public.sales;
create policy "sales_update_own" on public.sales
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sales_delete_own" on public.sales;
create policy "sales_delete_own" on public.sales
for delete to authenticated using (user_id = auth.uid());

drop policy if exists "sale_lines_select_own" on public.sale_lines;
create policy "sale_lines_select_own" on public.sale_lines
for select to authenticated using (user_id = auth.uid());

drop policy if exists "sale_lines_insert_own" on public.sale_lines;
create policy "sale_lines_insert_own" on public.sale_lines
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "sale_lines_update_own" on public.sale_lines;
create policy "sale_lines_update_own" on public.sale_lines
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sale_lines_delete_own" on public.sale_lines;
create policy "sale_lines_delete_own" on public.sale_lines
for delete to authenticated using (user_id = auth.uid());

-- Stockage des images choisies depuis le PC.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-images',
  'catalog-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catalog_images_insert_own_folder" on storage.objects;
create policy "catalog_images_insert_own_folder" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'catalog-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "catalog_images_update_own_folder" on storage.objects;
create policy "catalog_images_update_own_folder" on storage.objects
for update to authenticated
using (
  bucket_id = 'catalog-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'catalog-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "catalog_images_delete_own_folder" on storage.objects;
create policy "catalog_images_delete_own_folder" on storage.objects
for delete to authenticated
using (
  bucket_id = 'catalog-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- v1.8 - fichier clients + rattachement des nouvelles ventes
-- ============================================================
-- Aucun backfill : les ventes existantes restent sans client.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_number integer not null check (client_number > 0),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_number),
  unique (id, user_id)
);

create or replace function public.assign_client_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_number is null or new.client_number <= 0 then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
    select coalesce(max(c.client_number), 0) + 1
      into new.client_number
      from public.clients c
      where c.user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_client_number_before_insert on public.clients;
create trigger assign_client_number_before_insert
before insert on public.clients
for each row execute function public.assign_client_number();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.sales add column if not exists client_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_client_owner_fk'
      and conrelid = 'public.sales'::regclass
  ) then
    alter table public.sales
      add constraint sales_client_owner_fk
      foreign key (client_id, user_id)
      references public.clients(id, user_id)
      on delete restrict;
  end if;
end $$;

create index if not exists clients_user_number_idx on public.clients(user_id, client_number);
create index if not exists clients_user_name_idx on public.clients(user_id, last_name, first_name);
create index if not exists sales_user_client_date_idx on public.sales(user_id, client_id, sale_date desc);

alter table public.clients enable row level security;

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients
for select to authenticated using (user_id = auth.uid());

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own" on public.clients
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own" on public.clients
for delete to authenticated using (user_id = auth.uid());
