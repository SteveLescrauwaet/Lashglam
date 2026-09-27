-- LASHGLAM PWA v1.16 - accès uniquement par code PIN, sans identifiant ni mot de passe
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Le code défini ici est 2502.
-- Les accès aux données passent ensuite par des fonctions sécurisées côté Supabase.

create extension if not exists pgcrypto;
set search_path = public, extensions;

create table if not exists public.lashglam_app_config (
  id smallint primary key default 1 check (id = 1),
  owner_id uuid not null references auth.users(id) on delete restrict,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Détecte automatiquement le compte qui possède déjà les données de l'application.
do $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.user_settings order by created_at asc limit 1;
  if v_owner is null then select user_id into v_owner from public.clients order by created_at asc limit 1; end if;
  if v_owner is null then select user_id into v_owner from public.catalog_items order by created_at asc limit 1; end if;
  if v_owner is null then select user_id into v_owner from public.sales order by created_at asc limit 1; end if;

  if v_owner is null then
    raise exception 'Aucun propriétaire de données trouvé. Lance d’abord l’ancienne version connectée au moins une fois.';
  end if;

  insert into public.lashglam_app_config(id, owner_id, pin_hash, updated_at)
  values (1, v_owner, crypt('2502', gen_salt('bf')), now())
  on conflict (id) do update
  set owner_id = excluded.owner_id,
      pin_hash = excluded.pin_hash,
      updated_at = now();
end $$;

revoke all on public.lashglam_app_config from anon, authenticated;

create or replace function public.lashglam_pin_ok(p_pin text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.lashglam_app_config c
    where c.id = 1
      and c.pin_hash = crypt(coalesce(p_pin,''), c.pin_hash)
  );
$$;

create or replace function public.lashglam_assert_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.lashglam_pin_ok(p_pin) then
    perform pg_sleep(0.35);
    raise exception 'Code d''accès incorrect';
  end if;
end;
$$;

create or replace function public.lashglam_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select owner_id from public.lashglam_app_config where id = 1;
$$;

-- Charge toutes les données nécessaires à l'application en une seule fois.
create or replace function public.app_load_all(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
  v_result jsonb;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();

  select jsonb_build_object(
    'owner_id', v_owner,
    'catalog', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.type, c.sort_order, c.created_at)
      from public.catalog_items c where c.user_id = v_owner
    ), '[]'::jsonb),
    'clients', coalesce((
      select jsonb_agg(to_jsonb(cl) order by cl.client_number)
      from public.clients cl where cl.user_id = v_owner
    ), '[]'::jsonb),
    'sales', coalesce((
      select jsonb_agg(
        to_jsonb(s) || jsonb_build_object(
          'sale_lines', coalesce((
            select jsonb_agg(to_jsonb(sl) order by sl.created_at)
            from public.sale_lines sl
            where sl.sale_id = s.id and sl.user_id = v_owner
          ), '[]'::jsonb)
        ) order by s.sale_date desc, s.created_at desc
      )
      from public.sales s where s.user_id = v_owner
    ), '[]'::jsonb),
    'settings', coalesce((
      select to_jsonb(us) from public.user_settings us where us.user_id = v_owner
    ), jsonb_build_object('user_id',v_owner,'defaults_seeded',false,'loyalty_discount_percent',10))
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.app_seed_defaults(p_pin text, p_items jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
  x jsonb;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();

  if not exists (select 1 from public.catalog_items where user_id = v_owner) then
    for x in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
      insert into public.catalog_items(user_id,name,type,price,duration_minutes,image_url,sort_order,is_solo)
      values (
        v_owner,
        x->>'name',
        x->>'type',
        coalesce((x->>'price')::numeric,0),
        coalesce((x->>'duration_minutes')::integer,0),
        nullif(x->>'image_url',''),
        coalesce((x->>'sort_order')::integer,0),
        coalesce((x->>'is_solo')::boolean,false)
      );
    end loop;
  end if;

  insert into public.user_settings(user_id,defaults_seeded,loyalty_discount_percent)
  values(v_owner,true,10)
  on conflict(user_id) do update set defaults_seeded=true;
  return true;
end;
$$;

create or replace function public.app_save_sale(
  p_pin text,
  p_client_id uuid,
  p_sale_date timestamptz,
  p_payment_method text,
  p_note text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
  v_sale_id uuid;
  x jsonb;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();

  if p_payment_method not in ('espece','carte_perso','carte_pro') then
    raise exception 'Mode de paiement invalide';
  end if;
  if not exists(select 1 from public.clients where id=p_client_id and user_id=v_owner) then
    raise exception 'Client introuvable';
  end if;

  insert into public.sales(user_id,client_id,sale_date,payment_method,note)
  values(v_owner,p_client_id,p_sale_date,p_payment_method,coalesce(p_note,''))
  returning id into v_sale_id;

  for x in select * from jsonb_array_elements(coalesce(p_lines,'[]'::jsonb)) loop
    insert into public.sale_lines(user_id,sale_id,catalog_item_id,name_snapshot,type_snapshot,unit_price,quantity)
    values(
      v_owner,
      v_sale_id,
      nullif(x->>'catalog_item_id','')::uuid,
      x->>'name_snapshot',
      x->>'type_snapshot',
      coalesce((x->>'unit_price')::numeric,0),
      greatest(1,coalesce((x->>'quantity')::integer,1))
    );
  end loop;

  return v_sale_id;
end;
$$;

create or replace function public.app_delete_sale(p_pin text, p_sale_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_owner uuid;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();
  delete from public.sales where id=p_sale_id and user_id=v_owner;
  return found;
end;
$$;

create or replace function public.app_delete_sale_line(p_pin text, p_sale_id uuid, p_line_id uuid, p_new_note text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_owner uuid;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();
  delete from public.sale_lines where id=p_line_id and sale_id=p_sale_id and user_id=v_owner;
  if not found then return false; end if;
  update public.sales set note=coalesce(p_new_note,'') where id=p_sale_id and user_id=v_owner;
  return true;
end;
$$;

create or replace function public.app_set_loyalty(p_pin text, p_rate numeric)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_owner uuid;
begin
  perform public.lashglam_assert_pin(p_pin);
  if p_rate < 0 or p_rate > 100 then raise exception 'Pourcentage invalide'; end if;
  v_owner := public.lashglam_owner_id();
  insert into public.user_settings(user_id,defaults_seeded,loyalty_discount_percent)
  values(v_owner,true,p_rate)
  on conflict(user_id) do update set loyalty_discount_percent=excluded.loyalty_discount_percent;
  return true;
end;
$$;

create or replace function public.app_save_client(p_pin text, p_client_id uuid, p_client jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
  v_row public.clients%rowtype;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();

  if p_client_id is null then
    insert into public.clients(user_id,client_number,first_name,last_name,email,phone)
    values(v_owner,0,p_client->>'first_name',p_client->>'last_name',nullif(p_client->>'email',''),nullif(p_client->>'phone',''))
    returning * into v_row;
  else
    update public.clients
      set first_name=p_client->>'first_name',
          last_name=p_client->>'last_name',
          email=nullif(p_client->>'email',''),
          phone=nullif(p_client->>'phone','')
      where id=p_client_id and user_id=v_owner
      returning * into v_row;
  end if;

  if v_row.id is null then raise exception 'Client introuvable'; end if;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.app_save_catalog(p_pin text, p_item_id uuid, p_item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
  v_row public.catalog_items%rowtype;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();

  if p_item_id is null then
    insert into public.catalog_items(user_id,name,type,price,duration_minutes,image_url,sort_order,is_solo)
    values(
      v_owner,
      p_item->>'name',
      p_item->>'type',
      coalesce((p_item->>'price')::numeric,0),
      coalesce((p_item->>'duration_minutes')::integer,0),
      nullif(p_item->>'image_url',''),
      coalesce((p_item->>'sort_order')::integer,0),
      coalesce((p_item->>'is_solo')::boolean,false)
    ) returning * into v_row;
  else
    update public.catalog_items
      set name=p_item->>'name',
          type=p_item->>'type',
          price=coalesce((p_item->>'price')::numeric,0),
          duration_minutes=coalesce((p_item->>'duration_minutes')::integer,0),
          image_url=nullif(p_item->>'image_url',''),
          sort_order=coalesce((p_item->>'sort_order')::integer,0),
          is_solo=coalesce((p_item->>'is_solo')::boolean,false)
      where id=p_item_id and user_id=v_owner
      returning * into v_row;
  end if;

  if v_row.id is null then raise exception 'Élément introuvable'; end if;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.app_delete_catalog(p_pin text, p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_owner uuid;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();
  delete from public.catalog_items where id=p_item_id and user_id=v_owner;
  return found;
end;
$$;

create or replace function public.app_move_catalog(p_pin text, p_item_a uuid, p_order_a integer, p_item_b uuid, p_order_b integer)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_owner uuid;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();
  update public.catalog_items set sort_order=p_order_a where id=p_item_a and user_id=v_owner;
  update public.catalog_items set sort_order=p_order_b where id=p_item_b and user_id=v_owner;
  return true;
end;
$$;

-- Les fonctions sont accessibles avec la publishable key, mais refusent toute opération sans le bon code.
grant execute on function public.app_load_all(text) to anon, authenticated;
grant execute on function public.app_seed_defaults(text,jsonb) to anon, authenticated;
grant execute on function public.app_save_sale(text,uuid,timestamptz,text,text,jsonb) to anon, authenticated;
grant execute on function public.app_delete_sale(text,uuid) to anon, authenticated;
grant execute on function public.app_delete_sale_line(text,uuid,uuid,text) to anon, authenticated;
grant execute on function public.app_set_loyalty(text,numeric) to anon, authenticated;
grant execute on function public.app_save_client(text,uuid,jsonb) to anon, authenticated;
grant execute on function public.app_save_catalog(text,uuid,jsonb) to anon, authenticated;
grant execute on function public.app_delete_catalog(text,uuid) to anon, authenticated;
grant execute on function public.app_move_catalog(text,uuid,integer,uuid,integer) to anon, authenticated;

-- Ne pas exposer les fonctions internes de validation.
revoke all on function public.lashglam_pin_ok(text) from anon, authenticated;
revoke all on function public.lashglam_assert_pin(text) from anon, authenticated;
revoke all on function public.lashglam_owner_id() from anon, authenticated;
