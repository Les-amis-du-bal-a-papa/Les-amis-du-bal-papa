# Site – Les Amis du Bal à Papa

Site statique hébergé sur GitHub Pages, avec un espace administrateur Pages CMS.

## Contenu du dossier

| Élément | Rôle |
|---|---|
| `index.html` | Le site (page unique) |
| `admin.html` | Page « Espace gestionnaires » (mode d'emploi + lien vers l'administration) |
| `style.css` | Mise en forme |
| `script.js` | Menu, agenda, formulaire, chargement des contenus |
| `data/` | Contenus modifiables depuis l'administration (agenda, activités, galerie, annonce, tarifs, salles) |
| `images/logo.png` | Logo |
| `images/galerie/` | Photos ajoutées depuis l'administration |
| `.pages.yml` | Réglages de l'espace administrateur (fichier caché : ne pas supprimer) |

## Mise en ligne (une seule fois)

1. Créer le dépôt sur GitHub (public) et y envoyer **tout le contenu du dossier**, y compris `.pages.yml`.
   Astuce : le fichier `.pages.yml` est « caché » sur Mac et Linux. Sur GitHub, « Upload files » l'accepte
   si vous glissez le dossier entier.
2. *Settings → Pages* : Source « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Remplacer `XXXXX` dans `index.html` par l'identifiant Formspree.

## Activer l'espace administrateur (une seule fois)

À faire par la personne qui possède le compte GitHub du site :

1. Aller sur https://app.pagescms.org et se connecter avec GitHub.
2. Installer l'application GitHub « Pages CMS » sur le compte ou l'organisation qui possède le dépôt.
3. Ouvrir le dépôt : les rubriques Agenda, Nos activités, Galerie et Annonce, tarifs & salles apparaissent.
4. Dans les réglages du dépôt sur Pages CMS (collaborateurs), **inviter l'adresse lesamisdubal@gmail.com**.

## Connexion des gestionnaires (au quotidien)

Les gestionnaires n'ont pas besoin de compte GitHub :

1. Aller sur https://app.pagescms.org (ou via le lien « Espace gestionnaires » en bas du site).
2. Choisir la connexion par e-mail et saisir **lesamisdubal@gmail.com**.
3. Ouvrir la boîte lesamisdubal@gmail.com et cliquer sur le lien reçu.

Connectés ainsi, ils peuvent modifier l'agenda, les activités, la galerie, l'annonce, les tarifs et les salles.
Seul le compte GitHub peut changer les réglages de l'administration (`.pages.yml`) ou inviter d'autres adresses.

Sécurité : l'accès à la boîte Gmail donne l'accès au site. Activer la validation en deux étapes de Google.

## Tester sur son ordinateur

Les contenus du dossier `data/` ne se chargent pas si l'on ouvre `index.html` par double-clic
(restriction de sécurité des navigateurs). Lancer un petit serveur dans le dossier :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000
