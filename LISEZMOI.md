# Site – Les amis du bal à Papa

Site statique hébergé sur GitHub Pages, avec une base Supabase qui contient :
- les inscriptions, consultées par les gestionnaires sur `gestion-inscriptions.html` ;
- l'agenda, les affiches, l'annonce, les infos pratiques, les salles et les danses, modifiés par les gestionnaires
  **directement sur le site**, page `gestion-site.html` (aucun passage par GitHub).

## Contenu du dossier

| Élément | Rôle |
|---|---|
| `index.html` | Accueil : les trois vignettes, puis l'association, les salles et les infos pratiques |
| `stages-et-cours.html`, `evenements.html`, `agenda.html`, `adhesion.html` | Une page par onglet du menu |
| `mentions-legales.html` | Mentions légales et données personnelles |
| `admin.html` | Page « Espace gestionnaires » (mode d'emploi, accès aux deux pages ci-dessous) |
| `gestion-inscriptions.html`, `gestion.js` | Page des inscriptions reçues, réservée aux gestionnaires |
| `gestion-site.html`, `gestion-site.js` | Page « Mettre à jour le site » (agenda, affiches, annonce, tarifs, salles, danses), réservée aux gestionnaires |
| `config.js` | Adresse et clé publique de la base (déjà remplies) |
| `supabase/1-installation.sql` | Script n° 1 : base des inscriptions et règles de sécurité (déjà lancé) |
| `supabase/2-contenu-du-site.sql` | Script n° 2 : agenda, réglages du site et dossier des affiches |
| `supabase/email-lien-connexion.html` | Modèle de l'e-mail de connexion des gestionnaires |
| `lib/` | Bibliothèque Supabase (version 2.117.2, licence MIT) |
| `.github/workflows/garder-actif.yml` | Tâche automatique qui évite la mise en pause de la base gratuite |
| `style.css` | Mise en forme |
| `script.js` | Menu, agenda, formulaires, chargement des contenus |
| `data/` | Copie de secours des contenus, utilisée seulement si la base ne répond pas |
| `images/` | Les trois images rondes de l’accueil, et l'affiche du 25 octobre 2026 (les nouvelles affiches vont dans la base) |

## Mise en ligne (une seule fois)

1. Créer le dépôt sur GitHub (public) et y envoyer **tout le contenu du dossier**, y compris le dossier caché `.github`.
   Si un ancien fichier `.pages.yml` est encore sur GitHub, il peut être supprimé : il ne sert plus.
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
3. Menu *SQL Editor* → *New query* : coller tout le fichier `supabase/1-installation.sql`, puis *Run*.
4. Menu *Authentication* :
   - *Users* → *Add user* → *Create new user* : `lesamisdubal@gmail.com` (cocher « Auto confirm user »),
     puis de même `jimmynewtonson@hotmail.com` (administrateur du site, pour les tests) ;
   - *Sign In / Providers* (ou *Settings*) : désactiver « Allow new users to sign up » ;
   - *URL Configuration* : « Site URL » = l'adresse du site, et ajouter dans « Redirect URLs »
     l'adresse de la page `…/gestion-inscriptions.html` **et** celle de `…/gestion-site.html`.
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

**Mise en pause** : un projet gratuit est mis en pause après 7 jours sans activité. Comme chaque visite
du site lit maintenant l'agenda dans la base, cela arrive rarement. En plus, la tâche
`.github/workflows/garder-actif.yml` interroge la base tous les 3 jours (onglet *Actions* du dépôt :
l'autoriser si GitHub le demande). GitHub suspend cette tâche après 60 jours sans modification du dépôt et
prévient par e-mail : il suffit alors de cliquer sur « Enable workflow » dans l'onglet *Actions*.
Si la base est en pause malgré tout : Supabase → le projet → *Resume project*. En attendant, le site
affiche la copie de secours du dossier `data/`.

**Autre gestionnaire avec sa propre adresse** : l'ajouter dans *Authentication → Users*, l'ajouter à
l'organisation Supabase (pour recevoir le lien), puis dans *SQL Editor* :
`insert into public.gestionnaires (email) values ('adresse@exemple.fr');`

## Activer la mise à jour du site depuis le site (une seule fois, 5 minutes)

1. Supabase → *SQL Editor* → *New query* : coller tout le fichier `supabase/2-contenu-du-site.sql`, puis *Run*.
   Il crée l'agenda, les réglages et le dossier des affiches, et y recopie le contenu actuel du site
   (les 23 évènements, l'annonce, les tarifs, les salles et les danses). Il peut être relancé sans risque :
   il n'écrase rien.
2. *Authentication* → *URL Configuration* → « Redirect URLs » : ajouter l'adresse de la page
   `…/gestion-site.html` (par exemple `https://votre-compte.github.io/votre-depot/gestion-site.html`).
3. Envoyer sur GitHub les fichiers modifiés : `gestion-site.html`, `gestion-site.js`, `admin.html`, `gestion.js`,
   `script.js`, `style.css`.
4. Essai : ouvrir `gestion-site.html`, se connecter, ajouter un évènement de test avec une image,
   vérifier sur la page Agenda du site, puis le supprimer.

## Mettre à jour le site (au quotidien)

Tout se fait sur le site : *Espace gestionnaires* (lien en bas des pages) → « Mettre à jour le site ».
Connexion par le lien reçu sur **lesamisdubal@gmail.com** (la même que pour les inscriptions).
Les modifications sont visibles sur le site immédiatement, sans passer par GitHub.

Les affiches envoyées sont réduites automatiquement (1600 pixels au plus) et rangées dans le dossier
*Storage → affiches* de Supabase (1 Go gratuit, soit plusieurs milliers d'affiches). Une affiche est effacée
quand on la remplace ou qu'on supprime son évènement.

Sécurité : l'accès à la boîte Gmail donne l'accès au site et aux inscriptions. Activer la validation en deux étapes de Google.
Seules les adresses de la table `gestionnaires` peuvent modifier quoi que ce soit (règles du script n° 2).

## Tester sur son ordinateur

En ouvrant `index.html` par double-clic, le site s'affiche avec les contenus de secours inscrits dans la page
(la base et les fichiers `data/` ne sont lus qu'en ligne ou via un petit serveur). Pour tout tester :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000
