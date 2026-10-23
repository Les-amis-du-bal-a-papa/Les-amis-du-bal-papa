# Site – Les amis du bal à Papa

Site statique hébergé sur GitHub Pages, avec :
- un espace administrateur Pages CMS pour modifier l'agenda et les infos ;
- une base Supabase qui enregistre les inscriptions, consultées par les gestionnaires sur `gestion-inscriptions.html`.

## Contenu du dossier

| Élément | Rôle |
|---|---|
| `index.html` | Accueil : les trois vignettes, puis l'association, les salles et les infos pratiques |
| `stages-et-cours.html`, `evenements.html`, `agenda.html`, `adhesion.html` | Une page par onglet du menu |
| `mentions-legales.html` | Mentions légales et données personnelles |
| `admin.html` | Page « Espace gestionnaires » (mode d'emploi, accès aux inscriptions et à l'administration) |
| `gestion-inscriptions.html`, `gestion.js` | Page des inscriptions reçues, réservée aux gestionnaires |
| `config.js` | Adresse et clé publique de la base des inscriptions (à remplir) |
| `supabase/installation.sql` | Script qui crée la base des inscriptions et ses règles de sécurité |
| `lib/` | Bibliothèque Supabase (version 2.117.2, licence MIT) |
| `.github/workflows/garder-actif.yml` | Tâche automatique qui évite la mise en pause de la base gratuite |
| `style.css` | Mise en forme |
| `script.js` | Menu, agenda, formulaires, chargement des contenus |
| `data/` | Contenus modifiables depuis l'administration (agenda, annonce, tarifs, salles, danses) |
| `images/` | Les trois images rondes de l’accueil ; `images/evenements/` reçoit les affiches et photos ajoutées depuis l’administration |
| `.pages.yml` | Réglages de l'espace administrateur (fichier caché : ne pas supprimer) |

## Mise en ligne (une seule fois)

1. Créer le dépôt sur GitHub (public) et y envoyer **tout le contenu du dossier**, y compris `.pages.yml`.
   Astuce : le fichier `.pages.yml` est « caché » sur Mac et Linux. Sur GitHub, « Upload files » l'accepte
   si vous glissez le dossier entier.
2. *Settings → Pages* : Source « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Activer la base des inscriptions (ci-dessous).

## Activer la base des inscriptions (une seule fois, 15 minutes)

Les formulaires d'adhésion et d'inscription à un évènement enregistrent les réponses dans une base Supabase.
Seuls les gestionnaires connectés peuvent les lire.

1. Compte Supabase : **déjà créé avec jimmynewtonson@hotmail.com**.
   Sans réglage e-mail supplémentaire, Supabase n'envoie les liens de connexion qu'aux adresses
   **membres de l'organisation**. Il faut donc y ajouter l'adresse de l'association :
   - Supabase → *Organization settings* → *Team* → *Invite* : `lesamisdubal@gmail.com`,
     rôle **Read-only** (lecture seule : suffit pour recevoir les liens, ne permet rien d'autre) ;
   - ouvrir la boîte lesamisdubal@gmail.com et accepter l'invitation.
2. *New project* : nom « amis-du-bal », un mot de passe de base de données (à noter et garder),
   région **West EU (Paris)**, offre **Free**.
3. Menu *SQL Editor* → *New query* : coller tout le fichier `supabase/installation.sql`, puis *Run*.
4. Menu *Authentication* :
   - *Users* → *Add user* → *Create new user* : `lesamisdubal@gmail.com` (cocher « Auto confirm user »),
     puis de même `jimmynewtonson@hotmail.com` (administrateur du site, pour les tests) ;
   - *Sign In / Providers* (ou *Settings*) : désactiver « Allow new users to sign up » ;
   - *URL Configuration* : « Site URL » = l'adresse du site, et ajouter dans « Redirect URLs »
     l'adresse de la page `…/gestion-inscriptions.html`.
5. Remplir `config.js` (deux valeurs) :
   - **Adresse du projet** : déjà inscrite (`https://lqlegfzmmpnbgjyibzjs.supabase.co`). Elle se trouve dans
     *Integrations* → *Data API* → « API URL », **sans** la fin `/rest/v1/`.
   - **Clé publique** : roue dentée *Project Settings* (en bas du menu de gauche) → *API Keys* →
     copier la clé **Publishable** (elle commence par `sb_publishable_`), ou, dans l'onglet des anciennes clés
     (*Legacy API keys*), la clé **anon** (elle commence par `eyJ`). La coller à la place de
     `COLLER_ICI_LA_CLE_PUBLISHABLE` (déjà fait).
   - Ne jamais y mettre la clé **Secret** ni **service_role** : elle donnerait tous les droits sur la base.
   - Laisser « Enable Data API » activé (*Integrations* → *Data API*).
6. Envoyer `config.js` sur GitHub. Faire un essai : une inscription depuis le site, puis l'ouvrir sur
   `gestion-inscriptions.html`.

**E-mail de connexion aux couleurs de l'association** : *Authentication* → *Emails* → *Templates* →
« Magic link or OTP ». Objet : `Votre accès à l'espace gestionnaires – Les amis du bal à Papa`.
Corps : coller tout le contenu de `supabase/email-lien-connexion.html`, puis *Save*.

**Mise en pause** : un projet gratuit est mis en pause après 7 jours sans activité. La tâche
`.github/workflows/garder-actif.yml` interroge la base tous les 3 jours pour l'éviter
(onglet *Actions* du dépôt : l'autoriser si GitHub le demande). GitHub suspend ces tâches après
60 jours sans aucune modification du dépôt : une mise à jour de l'agenda suffit à les relancer.
Si la base est en pause malgré tout : Supabase → le projet → *Resume project*.

**Autre gestionnaire avec sa propre adresse** : l'ajouter dans *Authentication → Users*, l'ajouter à
l'organisation Supabase (pour recevoir le lien), puis dans *SQL Editor* :
`insert into public.gestionnaires (email) values ('adresse@exemple.fr');`

## Activer l'espace administrateur (une seule fois)

À faire par la personne qui possède le compte GitHub du site :

1. Aller sur https://app.pagescms.org et se connecter avec GitHub.
2. Installer l'application GitHub « Pages CMS » sur le compte ou l'organisation qui possède le dépôt.
3. Ouvrir le dépôt : les rubriques Agenda et Annonce, tarifs & salles apparaissent.
4. Dans les réglages du dépôt sur Pages CMS (collaborateurs), **inviter l'adresse lesamisdubal@gmail.com**.

## Connexion des gestionnaires (au quotidien)

Les gestionnaires n'ont pas besoin de compte GitHub :

1. Aller sur https://app.pagescms.org (ou via le lien « Espace gestionnaires » en bas du site).
2. Choisir la connexion par e-mail et saisir **lesamisdubal@gmail.com**.
3. Ouvrir la boîte lesamisdubal@gmail.com et cliquer sur le lien reçu.

Connectés ainsi, ils peuvent modifier l'agenda, l'annonce, les tarifs, les salles et la liste des danses.
Seul le compte GitHub peut changer les réglages de l'administration (`.pages.yml`) ou inviter d'autres adresses.

Sécurité : l'accès à la boîte Gmail donne l'accès au site et aux inscriptions. Activer la validation en deux étapes de Google.

## Tester sur son ordinateur

En ouvrant `index.html` par double-clic, le site s'affiche avec les contenus de secours inscrits dans la page
(les fichiers `data/` ne sont lus qu'en ligne ou via un petit serveur). Pour tout tester :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000
