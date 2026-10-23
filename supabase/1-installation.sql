-- =========================================================
-- Les amis du bal à Papa – Base des inscriptions (Supabase)
-- À coller UNE FOIS dans Supabase : menu « SQL Editor » > « New query » > « Run ».
--
-- Principe de sécurité :
--   • le public (visiteurs du site) peut seulement ENVOYER une inscription ;
--   • seuls les gestionnaires connectés peuvent LIRE, MODIFIER ou SUPPRIMER ;
--   • la liste des gestionnaires se tient dans la table « gestionnaires ».
-- =========================================================

-- ---------- 1. Les inscriptions ----------
create table if not exists public.inscriptions (
  id                 uuid primary key default gen_random_uuid(),
  recue_le           timestamptz not null default now(),
  type               text not null check (type in ('adhesion', 'evenement')),

  nom                text not null check (char_length(nom) between 1 and 100),
  prenom             text not null check (char_length(prenom) between 1 and 100),
  telephone          text not null check (char_length(telephone) between 6 and 30),
  email              text not null check (char_length(email) between 3 and 200),

  -- Adhésion à l'année
  date_naissance     date,
  urgence_nom        text check (char_length(urgence_nom) <= 150),
  urgence_telephone  text check (char_length(urgence_telephone) <= 30),

  -- Inscription à un évènement
  evenement          text check (char_length(evenement) <= 300),
  evenement_date     date,
  nombre_personnes   int  check (nombre_personnes between 1 and 10),
  message            text check (char_length(message) <= 2000),

  droit_image        boolean not null,
  consentement_rgpd  boolean not null check (consentement_rgpd),

  -- Suivi par les gestionnaires
  statut             text not null default 'nouvelle' check (statut in ('nouvelle', 'confirmee', 'annulee')),
  note_gestionnaire  text check (char_length(note_gestionnaire) <= 2000)
);

create index if not exists inscriptions_recue_le_idx on public.inscriptions (recue_le desc);

-- ---------- 2. La liste des gestionnaires ----------
create table if not exists public.gestionnaires (
  email text primary key
);

insert into public.gestionnaires (email)
values
  ('lesamisdubal@gmail.com'),       -- l'association
  ('jimmynewtonson@hotmail.com')    -- administrateur du site (tests)
on conflict do nothing;

-- Vrai si la personne connectée figure dans la liste des gestionnaires
create or replace function public.est_gestionnaire()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gestionnaires g
    where lower(g.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- 3. Règles d'accès ----------
alter table public.inscriptions  enable row level security;
alter table public.gestionnaires enable row level security;   -- aucune règle : personne n'y accède depuis le site

-- Droits de base
revoke all on public.inscriptions  from anon, authenticated;
revoke all on public.gestionnaires from anon, authenticated;
grant insert                   on public.inscriptions to anon, authenticated;
grant select, update, delete   on public.inscriptions to authenticated;
grant execute on function public.est_gestionnaire() to authenticated;

drop policy if exists "Envoi public d'une inscription"     on public.inscriptions;
drop policy if exists "Lecture par les gestionnaires"      on public.inscriptions;
drop policy if exists "Modification par les gestionnaires" on public.inscriptions;
drop policy if exists "Suppression par les gestionnaires"  on public.inscriptions;

-- Le public peut envoyer une inscription « nouvelle », avec le consentement coché
create policy "Envoi public d'une inscription" on public.inscriptions
  for insert to anon, authenticated
  with check (statut = 'nouvelle' and consentement_rgpd and note_gestionnaire is null);

create policy "Lecture par les gestionnaires" on public.inscriptions
  for select to authenticated using (public.est_gestionnaire());

create policy "Modification par les gestionnaires" on public.inscriptions
  for update to authenticated using (public.est_gestionnaire()) with check (public.est_gestionnaire());

create policy "Suppression par les gestionnaires" on public.inscriptions
  for delete to authenticated using (public.est_gestionnaire());

-- ---------- 4. Maintien en activité ----------
-- Un projet gratuit est mis en pause après 7 jours sans activité.
-- Une petite tâche GitHub (.github/workflows/garder-actif.yml) lit cette table tous les 3 jours.
create table if not exists public.activite (
  id int primary key,
  note text
);
insert into public.activite (id, note)
values (1, 'Table technique : évite la mise en pause du projet gratuit. Ne contient aucune donnée personnelle.')
on conflict do nothing;

alter table public.activite enable row level security;
revoke all on public.activite from anon, authenticated;
grant select on public.activite to anon;
drop policy if exists "Lecture publique" on public.activite;
create policy "Lecture publique" on public.activite for select to anon using (true);

-- =========================================================
-- Pour ajouter un autre gestionnaire plus tard :
--   insert into public.gestionnaires (email) values ('adresse@exemple.fr');
-- (il faut aussi créer son compte dans Authentication > Users > Add user.)
-- =========================================================
