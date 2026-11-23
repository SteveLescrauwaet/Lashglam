-- LASHGLAM PWA v1.19 - fiches clientes et notes techniques par prestation
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Cette migration conserve toutes les ventes, clientes et lignes existantes.

alter table public.sale_lines
  add column if not exists prestation_note text not null default '';

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
    insert into public.sale_lines(
      user_id,sale_id,catalog_item_id,name_snapshot,type_snapshot,unit_price,quantity,prestation_note
    ) values(
      v_owner,
      v_sale_id,
      nullif(x->>'catalog_item_id','')::uuid,
      x->>'name_snapshot',
      x->>'type_snapshot',
      coalesce((x->>'unit_price')::numeric,0),
      greatest(1,coalesce((x->>'quantity')::integer,1)),
      case
        when x->>'type_snapshot'='prestation' then left(coalesce(x->>'prestation_note',''),2000)
        else ''
      end
    );
  end loop;

  return v_sale_id;
end;
$$;

create or replace function public.app_update_sale_line_note(
  p_pin text,
  p_line_id uuid,
  p_note text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_owner uuid;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();

  update public.sale_lines
    set prestation_note=left(coalesce(p_note,''),2000)
    where id=p_line_id
      and user_id=v_owner
      and type_snapshot='prestation';

  return found;
end;
$$;

grant execute on function public.app_save_sale(text,uuid,timestamptz,text,text,jsonb) to anon, authenticated;
grant execute on function public.app_update_sale_line_note(text,uuid,text) to anon, authenticated;
