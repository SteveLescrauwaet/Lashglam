-- Beauty CA PWA v1.8 - ajout du fichier clients et de la fidélité
-- À exécuter UNE FOIS dans Supabase > SQL Editor pour mettre à jour une base existante.
-- Les anciennes ventes restent volontairement sans client : aucun client n'est créé à partir de septembre.

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

-- Numérotation automatique par compte : CL0001, CL0002, ...
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

-- updated_at (la fonction existe déjà sur la base v1.7, mais on la recrée pour rendre la migration autonome).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.sales add column if not exists client_id uuid;

-- Empêche de rattacher une vente à un client appartenant à un autre compte.
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

create index if not exists clients_user_number_idx
  on public.clients(user_id, client_number);
create index if not exists clients_user_name_idx
  on public.clients(user_id, last_name, first_name);
create index if not exists sales_user_client_date_idx
  on public.sales(user_id, client_id, sale_date desc);

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
