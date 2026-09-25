-- Beauty CA PWA v1.9 - pourcentage de remise fidélité configurable
-- À exécuter UNE FOIS dans Supabase > SQL Editor sur une base déjà utilisée.
-- La valeur actuelle reste 10 % par défaut et pourra ensuite être changée dans l'onglet Clients.

alter table public.user_settings
  add column if not exists loyalty_discount_percent numeric(5,2) not null default 10;

-- Ajoute la contrainte 0 à 100 % si elle n'existe pas encore.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_settings_loyalty_discount_percent_check'
      and conrelid = 'public.user_settings'::regclass
  ) then
    alter table public.user_settings
      add constraint user_settings_loyalty_discount_percent_check
      check (loyalty_discount_percent >= 0 and loyalty_discount_percent <= 100);
  end if;
end $$;
