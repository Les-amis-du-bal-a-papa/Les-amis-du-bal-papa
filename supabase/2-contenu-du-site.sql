-- =========================================================
-- Les amis du bal à Papa – Script n° 2 : contenu du site
-- À coller UNE FOIS dans Supabase (SQL Editor > New query > Run),
-- APRÈS le script n° 1 (1-installation.sql).
--
-- Crée :
--   • la table « evenements » (agenda : bals, stages, réunions) ;
--   • la table « reglages » (annonce, infos pratiques, salles, danses) ;
--   • le dossier d'images « affiches » (stockage des affiches et photos).
-- Tout le monde peut LIRE ces contenus (ce sont les pages du site) ;
-- seuls les gestionnaires peuvent les MODIFIER, depuis la page « Mettre à jour le site ».
-- Le contenu actuel du site est repris automatiquement (une seule fois).
-- Ce script peut être relancé sans risque : il ne remplace rien d'existant.
-- =========================================================

-- ---------- 1. L'agenda ----------
create table if not exists public.evenements (
  id                 uuid primary key default gen_random_uuid(),
  date               date not null,
  titre              text not null check (char_length(titre) between 1 and 200),
  type               text not null default 'the' check (type in ('the', 'stage', 'ag')),
  heure              text check (char_length(heure) <= 120),
  lieu               text check (char_length(lieu) <= 200),
  details            text check (char_length(details) <= 2000),
  image              text check (char_length(image) <= 500),
  image_description  text check (char_length(image_description) <= 500),
  modifie_le         timestamptz not null default now()
);
create index if not exists evenements_date_idx on public.evenements (date);

-- ---------- 2. Les réglages (annonce, infos pratiques, salles, danses) ----------
create table if not exists public.reglages (
  cle         text primary key,
  valeur      jsonb not null,
  modifie_le  timestamptz not null default now()
);

-- ---------- 3. Règles d'accès ----------
alter table public.evenements enable row level security;
alter table public.reglages   enable row level security;

revoke all on public.evenements from anon, authenticated;
revoke all on public.reglages   from anon, authenticated;
grant select                         on public.evenements to anon, authenticated;
grant select                         on public.reglages   to anon, authenticated;
grant insert, update, delete         on public.evenements to authenticated;
grant insert, update, delete         on public.reglages   to authenticated;

drop policy if exists "Lecture publique de l'agenda"           on public.evenements;
drop policy if exists "Agenda : ajout par les gestionnaires"   on public.evenements;
drop policy if exists "Agenda : modification par les gestionnaires" on public.evenements;
drop policy if exists "Agenda : suppression par les gestionnaires"  on public.evenements;
create policy "Lecture publique de l'agenda" on public.evenements for select to anon, authenticated using (true);
create policy "Agenda : ajout par les gestionnaires" on public.evenements for insert to authenticated with check (public.est_gestionnaire());
create policy "Agenda : modification par les gestionnaires" on public.evenements for update to authenticated using (public.est_gestionnaire()) with check (public.est_gestionnaire());
create policy "Agenda : suppression par les gestionnaires" on public.evenements for delete to authenticated using (public.est_gestionnaire());

drop policy if exists "Lecture publique des réglages"            on public.reglages;
drop policy if exists "Réglages : ajout par les gestionnaires"   on public.reglages;
drop policy if exists "Réglages : modification par les gestionnaires" on public.reglages;
drop policy if exists "Réglages : suppression par les gestionnaires"  on public.reglages;
create policy "Lecture publique des réglages" on public.reglages for select to anon, authenticated using (true);
create policy "Réglages : ajout par les gestionnaires" on public.reglages for insert to authenticated with check (public.est_gestionnaire());
create policy "Réglages : modification par les gestionnaires" on public.reglages for update to authenticated using (public.est_gestionnaire()) with check (public.est_gestionnaire());
create policy "Réglages : suppression par les gestionnaires" on public.reglages for delete to authenticated using (public.est_gestionnaire());

-- ---------- 4. Le dossier des affiches et photos ----------
-- Images publiques (affichées sur le site), 5 Mo au plus, JPG / PNG / WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('affiches', 'affiches', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Affiches : liste pour les gestionnaires"       on storage.objects;
drop policy if exists "Affiches : envoi par les gestionnaires"        on storage.objects;
drop policy if exists "Affiches : modification par les gestionnaires" on storage.objects;
drop policy if exists "Affiches : suppression par les gestionnaires"  on storage.objects;
create policy "Affiches : liste pour les gestionnaires" on storage.objects for select to authenticated
  using (bucket_id = 'affiches' and public.est_gestionnaire());
create policy "Affiches : envoi par les gestionnaires" on storage.objects for insert to authenticated
  with check (bucket_id = 'affiches' and public.est_gestionnaire());
create policy "Affiches : modification par les gestionnaires" on storage.objects for update to authenticated
  using (bucket_id = 'affiches' and public.est_gestionnaire()) with check (bucket_id = 'affiches' and public.est_gestionnaire());
create policy "Affiches : suppression par les gestionnaires" on storage.objects for delete to authenticated
  using (bucket_id = 'affiches' and public.est_gestionnaire());

-- ---------- 5. Reprise du contenu actuel (seulement si les tables sont vides) ----------
insert into public.evenements (date, titre, type, heure, lieu, details, image, image_description)
select v.* from (values
    ('2026-10-25'::date, 'Bal avec le duo Jacky et Sandrine Guilloux', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Cœur de Mérande, Chambéry', 'Entrée 10 €. Buvette dès 14 h 20, vente de pâtisseries à partir de 16 h.', '/images/evenements/2026-10-25-duo-guilloux.jpg', 'Affiche du bal du dimanche 25 octobre avec le duo Jacky et Sandrine Guilloux, accordéon et chant, à la salle Mérande à Chambéry'),
    ('2027-01-10'::date, 'Bal avec Dolcevita Joe et Enzo', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Cœur de Mérande, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h.', null, null),
    ('2027-01-24'::date, 'Bal avec Éric Collomb (les Z’érics)', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Scarabée, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h.', null, null),
    ('2027-02-14'::date, 'Bal avec Gillou Francony', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Scarabée, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h.', null, null),
    ('2027-03-14'::date, 'Bal avec Éric Collomb (les Z’érics)', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'La Bisseraine, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h.', null, null),
    ('2027-03-21'::date, 'Bal avec Jean-Robert Chapellet', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Cœur de Mérande, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h.', null, null),
    ('2027-04-25'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'La Bisseraine, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-05-02'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'La Bisseraine, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-05-09'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Cœur de Mérande, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-06-06'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Cœur de Mérande, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-06-20'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'La Bisseraine, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-07-04'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Cœur de Mérande, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-07-18'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Scarabée, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-08-01'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'La Bisseraine, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-08-29'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Scarabée, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-09-05'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Scarabée, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-09-26'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'La Bisseraine, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-10-03'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Scarabée, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-10-24'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Cœur de Mérande, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-11-07'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Scarabée, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-11-14'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'La Bisseraine, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-12-05'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Salle à confirmer, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null),
    ('2027-12-19'::date, 'Bal à Papa', 'the', '15 h – 18 h (billetterie dès 14 h 20)', 'Le Cœur de Mérande, Chambéry', 'Entrée 10 €, libre pour les adhérents. Buvette dès 14 h 20, pâtisseries à partir de 16 h. Orchestre annoncé dans l’agenda trimestriel.', null, null)
) as v(date, titre, type, heure, lieu, details, image, image_description)
where not exists (select 1 from public.evenements);

insert into public.reglages (cle, valeur)
values ('infos', '{"annonce": {"afficher": false, "texte": "Prochain bal : dimanche 25 octobre au Cœur de Mérande avec le duo Jacky et Sandrine Guilloux."}, "styles": ["Rock", "Tango", "Valse", "Cha-cha", "Fox-trot", "Paso doble", "Bachata", "Danse en ligne"], "pratique": {"horaires": "15 h – 18 h", "billetterie": "Ouverture à 14 h 20", "entree": "10 €", "adhesion": "45 € pour l''année – entrée libre à tous les bals", "buvette": "Dès 14 h 20 – vente de pâtisseries à partir de 16 h", "parking": "Gratuit dans les trois salles"}, "salles": [{"nom": "Le Cœur de Mérande", "infos": "Parking gratuit"}, {"nom": "Le Scarabée", "infos": "Parking gratuit"}, {"nom": "La Bisseraine", "infos": "Parking gratuit"}]}'::jsonb)
on conflict (cle) do nothing;
