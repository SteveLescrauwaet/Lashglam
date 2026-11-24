-- LASHGLAM PWA v1.20 - suppression / fusion des doublons clients
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Ne supprime aucune vente : si le doublon possède des ventes, elles sont d'abord transférées vers la fiche choisie.

create or replace function public.app_merge_delete_client(
  p_pin text,
  p_delete_client_id uuid,
  p_keep_client_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
  v_delete public.clients%rowtype;
  v_keep public.clients%rowtype;
  v_sale_count integer := 0;
begin
  perform public.lashglam_assert_pin(p_pin);
  v_owner := public.lashglam_owner_id();

  select * into v_delete
  from public.clients
  where id = p_delete_client_id and user_id = v_owner;

  if v_delete.id is null then
    raise exception 'Client à supprimer introuvable';
  end if;

  select count(*) into v_sale_count
  from public.sales
  where user_id = v_owner and client_id = p_delete_client_id;

  if v_sale_count > 0 then
    if p_keep_client_id is null then
      raise exception 'Cette fiche possède % vente(s). Sélectionne le client à conserver.', v_sale_count;
    end if;
    if p_keep_client_id = p_delete_client_id then
      raise exception 'Le client à conserver doit être différent du doublon';
    end if;

    select * into v_keep
    from public.clients
    where id = p_keep_client_id and user_id = v_owner;

    if v_keep.id is null then
      raise exception 'Client à conserver introuvable';
    end if;

    update public.sales
      set client_id = p_keep_client_id
      where user_id = v_owner and client_id = p_delete_client_id;
  elsif p_keep_client_id is not null then
    select * into v_keep
    from public.clients
    where id = p_keep_client_id and user_id = v_owner;
    if v_keep.id is null then
      raise exception 'Client à conserver introuvable';
    end if;
  end if;

  delete from public.clients
  where id = p_delete_client_id and user_id = v_owner;

  if not found then
    raise exception 'Suppression du client impossible';
  end if;

  return jsonb_build_object(
    'deleted_client_id', p_delete_client_id,
    'kept_client_id', p_keep_client_id,
    'moved_sales', v_sale_count
  );
end;
$$;

grant execute on function public.app_merge_delete_client(text,uuid,uuid) to anon, authenticated;
