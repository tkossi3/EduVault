# Configurer Supabase et Google pour EduVault

Ce guide part de zéro : aucun projet Supabase n'existe. Suivez les étapes dans l'ordre. Comptez environ 30 minutes.

**Avant de commencer**, gardez trois onglets ouverts, tous connectés avec le compte `kossivitinek@gmail.com` :

- Supabase : <https://supabase.com/dashboard>
- Google Cloud Console : <https://console.cloud.google.com>
- Vercel : <https://vercel.com/dashboard>

Le site en production est `https://eduvaultcampus.vercel.app`. Si vous changez de domaine, remplacez cette adresse partout dans ce guide.

---

> ✅ **Déjà fait (20 novembre 2026)** : projet Supabase `eduvault` créé (identifiant `eyvkvqnyzwjeeweledro`, région Irlande). Les étapes 1 à 5 et 8 sont terminées : base, sécurité, stockage des PDF, catalogue, clés dans `config.js`, adresses de retour. La confirmation d'inscription par e-mail est **désactivée** (le service d'e-mail gratuit de Supabase est trop limité). Pour la réactiver : **Authentication → Sign In / Providers → Email → Confirm email**, après avoir configuré un SMTP.
>
> **Il reste à faire** : la connexion Google (étapes 6 et 7) et le rôle de modérateur pour votre compte (fin du guide). Les étapes 1 à 5 restent utiles si vous devez un jour recréer le projet.

## Étape 1 — Créer le projet Supabase

1. Ouvrez <https://supabase.com/dashboard> et cliquez sur **New project**.
2. Remplissez :
   - **Organization** : votre organisation personnelle.
   - **Project name** : `eduvault`
   - **Database password** : cliquez sur **Generate a password**, puis copiez-le dans un gestionnaire de mots de passe. Vous n'en aurez pas besoin dans l'application, mais il est impossible de le revoir plus tard.
   - **Region** : **West EU (Ireland)** ou **Central EU (Frankfurt)**. Ce sont les régions les plus proches du Togo.
3. Cliquez sur **Create new project** et attendez que le statut passe au vert (1 à 2 minutes).

> **Plan gratuit** : un projet sans activité pendant 7 jours est mis en pause. Pour le relancer : ouvrez le projet dans le tableau de bord, puis cliquez sur **Restore project** dans le bandeau jaune en haut de la page. Ne le supprimez pas, la restauration conserve toutes les données.

---

## Étape 2 — Créer la base (tables, sécurité, stockage des PDF)

1. Dans le menu de gauche du projet, ouvrez **SQL Editor**, puis cliquez sur **New query** (ou sur le bouton **+**).
2. Dans VS Code, ouvrez [`supabase/schema.sql`](./supabase/schema.sql), faites `Ctrl+A` puis `Ctrl+C`.
3. Collez le contenu dans l'éditeur Supabase et cliquez sur **Run** (ou `Ctrl+Entrée`).
4. Le résultat attendu est **Success. No rows returned**. Des messages « NOTICE … does not exist, skipping » sont normaux.

Ce script crée en une fois :

- les tables : profils, établissements, filières, matières, documents, notifications, propositions de filière ;
- les **règles de sécurité** : chacun dépose uniquement en son nom, un document déposé est toujours « en attente », seul un modérateur peut l'approuver, et les visiteurs ne voient que les documents approuvés ;
- l'espace de stockage privé des PDF, `academic-documents` (20 Mo maximum par fichier, PDF uniquement) ;
- la création automatique du profil à chaque inscription (e-mail ou Google).

Vous pouvez le relancer sans risque, par exemple après une mise à jour du fichier.

---

## Étape 3 — Charger le catalogue des écoles et filières

1. Dans **SQL Editor**, cliquez à nouveau sur **New query**.
2. Copiez tout le fichier [`supabase/catalog.sql`](./supabase/catalog.sql) et collez-le.
3. Cliquez sur **Run**. Résultat attendu : **Success**.
4. Vérifiez avec une nouvelle requête :

```sql
select
  (select count(*) from public.institutions) as etablissements,
  (select count(*) from public.programs where is_listed) as filieres_visibles,
  (select count(*) from storage.buckets where id = 'academic-documents') as stockage_pdf;
```

Résultat attendu : **31** établissements, **48** filières visibles, **1** espace de stockage.

Ce catalogue peut être relancé sans créer de doublons. Les matières (cours) ne sont pas préremplies : elles sont créées automatiquement quand un étudiant dépose un document pour une nouvelle matière.

---

## Étape 4 — Récupérer l'adresse et la clé publique du projet

1. Ouvrez **Project Settings** (roue crantée en bas à gauche).
2. Dans **Data API**, copiez **Project URL**. Elle ressemble à `https://abcdefghijklmnop.supabase.co`. La partie `abcdefghijklmnop` est l'**identifiant du projet** (*project ref*). Notez-le, il servira à l'étape 6.
3. Dans **API Keys**, copiez la **Publishable key**, qui commence par `sb_publishable_…`. Elle est publique et va dans le site.

> Le site n'a **pas** besoin de la **Secret key** (`sb_secret_…`, anciennement `service_role`). Ne la copiez nulle part : elle donne un accès total à la base, et le dépôt GitHub est public.

---

## Étape 5 — Brancher le site sur le projet

1. Ouvrez [`frontend/scripts/config.js`](./frontend/scripts/config.js).
2. Remplacez les deux valeurs par celles de l'étape 4 :

```javascript
SUPABASE_URL: "https://VOTRE-PROJECT-REF.supabase.co",
SUPABASE_ANON_KEY: "sb_publishable_VOTRE_CLE"
```

3. Enregistrez, puis publiez :

```bash
git add frontend/scripts/config.js
git commit -m "config: nouveau projet Supabase"
git push origin main
```

Vercel redéploie automatiquement si le dépôt GitHub est connecté au projet `eduvaultcampus`. Sinon, lancez `vercel --prod` depuis la racine du dépôt.

---

## Étape 6 — Créer l'identifiant Google (Google Cloud Console)

### 6.1 Créer un projet Google Cloud

1. Ouvrez <https://console.cloud.google.com>.
2. En haut à gauche, cliquez sur le sélecteur de projet, puis sur **Nouveau projet**.
3. Nom : `EduVault`, puis cliquez sur **Créer**. Une fois le projet créé, sélectionnez-le.

### 6.2 Configurer l'écran de consentement

C'est l'écran « Continuer vers EduVault » que voit l'utilisateur.

1. Menu ☰ → **API et services** → **Écran de consentement OAuth** (parfois appelé **Google Auth Platform**). Cliquez sur **Commencer**.
2. **Informations sur l'application** :
   - Nom de l'application : `EduVault`
   - Adresse e-mail d'assistance : `kossivitinek@gmail.com`
3. **Audience** : choisissez **Externe**.
4. **Coordonnées** : `kossivitinek@gmail.com`. Acceptez les conditions, puis cliquez sur **Créer**.
5. Dans **Branding** (ou **Personnalisation de la marque**), ajoutez dans **Domaines autorisés** :
   - `vercel.app`
   - `supabase.co`
6. Dans **Accès aux données** (*Data access*), cliquez sur **Ajouter ou supprimer des champs d'application** et cochez `.../auth/userinfo.email`, `.../auth/userinfo.profile` et `openid`. Enregistrez.
7. Dans **Audience**, cliquez sur **Publier l'application** pour passer en **Production**. Sans cette étape, seuls les comptes ajoutés comme « utilisateurs de test » peuvent se connecter. Avec ces trois champs d'application de base, Google ne demande pas de vérification.

### 6.3 Créer l'identifiant OAuth

1. Menu ☰ → **API et services** → **Identifiants** (ou **Google Auth Platform → Clients**).
2. **+ Créer des identifiants** → **ID client OAuth**.
3. **Type d'application** : **Application Web**. **Nom** : `EduVault Web`.
4. **Origines JavaScript autorisées**, ajoutez :
   - `https://eduvaultcampus.vercel.app`
   - `http://localhost:5173`
5. **URI de redirection autorisés**, ajoutez **exactement** :
   - `https://VOTRE-PROJECT-REF.supabase.co/auth/v1/callback`

   Remplacez `VOTRE-PROJECT-REF` par l'identifiant de l'étape 4. Supabase affiche aussi cette adresse toute prête à l'étape 7 (champ **Callback URL**) : vous pouvez la copier depuis là.
6. Cliquez sur **Créer**. Copiez l'**ID client** (il se termine par `.apps.googleusercontent.com`) et le **Code secret du client** (il commence par `GOCSPX-`).

> Ces deux valeurs vont **uniquement dans Supabase** (étape 7), jamais dans le code du site.

---

## Étape 7 — Activer Google dans Supabase

1. Dans Supabase : **Authentication** → **Sign In / Providers** (ou **Providers**) → **Google**.
2. Activez **Enable Sign in with Google**.
3. **Client IDs** : collez l'ID client Google.
4. **Client Secret (for OAuth)** : collez le code secret `GOCSPX-…`.
5. Vérifiez que la **Callback URL** affichée est identique à celle saisie dans Google à l'étape 6.3.
6. Cliquez sur **Save**.

---

## Étape 8 — Autoriser les adresses de retour

Sans cette étape, Google et les e-mails de confirmation renvoient vers `localhost:3000`.

1. **Authentication** → **URL Configuration**.
2. **Site URL** : `https://eduvaultcampus.vercel.app`. Cliquez sur **Save**.
3. **Redirect URLs** → **Add URL**, ajoutez une par une :
   - `https://eduvaultcampus.vercel.app/**`
   - `http://localhost:5173/**`
   - `http://localhost:4173/**`
4. Cliquez sur **Save**.

**Confirmation par e-mail** (**Authentication** → **Sign In / Providers** → **Email**) : l'option **Confirm email** est activée par défaut. Le service d'e-mail intégré de Supabase n'envoie que quelques e-mails par heure. Pour vos tests, vous pouvez désactiver **Confirm email**. Pour l'ouverture au public, réactivez-la et configurez un SMTP (**Authentication** → **Emails** → **SMTP Settings**, par exemple avec Resend ou Brevo).

---

## Étape 9 — Vérifier que tout fonctionne

1. Ouvrez `https://eduvaultcampus.vercel.app/pages/register` et créez un compte avec un e-mail réel. Si **Confirm email** est actif, cliquez sur le lien reçu par e-mail.
2. Dans Supabase → **Authentication** → **Users**, le compte doit apparaître.
3. Dans **Table Editor** → `profiles`, une ligne doit avoir été créée automatiquement pour ce compte.
4. Ouvrez `https://eduvaultcampus.vercel.app/pages/login` et cliquez sur **Continuer avec Google**. Vous devez revenir sur la page **Profil**, connecté.
5. Ouvrez **Déposer un document**, choisissez une école, une filière, un semestre, tapez une matière et envoyez un petit PDF. Le message « Document envoyé ! Il sera visible… après validation » doit s'afficher.
6. Dans **Profil**, le document apparaît avec l'état **En attente**. Il n'est pas encore visible dans la bibliothèque.
7. Validez-le (section suivante), puis rechargez la bibliothèque : il apparaît, et le lecteur l'ouvre.

| Message d'erreur | Cause | Solution |
|---|---|---|
| `Unsupported provider: provider is not enabled` | Google n'est pas activé | Étape 7 |
| `redirect_uri_mismatch` (page Google) | L'URI de redirection Google n'est pas exacte | Étape 6.3, point 5 |
| Retour sur `localhost:3000` | Site URL non configurée | Étape 8 |
| `Accès bloqué : … n'a pas terminé la procédure de validation` | Application Google encore en mode Test | Étape 6.2, point 7 |
| `Email rate limit exceeded` | Trop d'e-mails envoyés par le service intégré | Désactivez **Confirm email** ou configurez un SMTP (étape 8) |
| `Invalid API key` | Mauvaise clé dans `config.js` | Étape 5 (utilisez la clé **Publishable**) |
| « Le service de dépôt n'est pas disponible » | Supabase non configuré dans `config.js`, ou étapes 2-3 non faites | Étapes 2, 3 et 5 |
| « Action non autorisée pour ce compte » au dépôt | `schema.sql` pas exécuté (règles de sécurité absentes) | Étape 2 |

---

## Validation des documents : qui valide, et comment ?

### Le principe

1. Un étudiant connecté dépose un PDF : le fichier part dans le stockage Supabase, et la fiche du document dans la table `documents`, avec l'état **en attente** (`pending`).
2. Tant qu'il est en attente, seuls son auteur et le modérateur le voient.
3. Le modérateur, c'est vous. Vous le passez à **approuvé** (`approved`), et il devient visible pour tout le monde. Vous pouvez aussi le **refuser** (`rejected`).

Il n'y a aucun serveur à héberger : les règles de sécurité installées par `schema.sql` empêchent un étudiant de valider son propre document.

### Méthode simple : Table Editor

1. Supabase → **Table Editor** → table `documents`.
2. Repérez les lignes dont `status` vaut `pending`. Le titre est dans la colonne `title`.
3. Pour regarder le PDF avant de valider : **Storage** → `academic-documents` → dossier de l'auteur → cliquez sur le fichier, puis sur **Get URL**. Le nom du fichier correspond à la colonne `storage_path`.
4. Double-cliquez sur la case `status` de la ligne, choisissez `approved` (ou `rejected`), puis cliquez sur **Save**.

### Méthode SQL : SQL Editor

```sql
-- Voir les documents en attente
select id, title, category, created_at
from public.documents
where status = 'pending'
order by created_at;

-- Approuver un document (remplacez l'identifiant)
update public.documents set status = 'approved' where id = 'COLLER-ICI-L-ID';

-- Refuser un document
update public.documents set status = 'rejected' where id = 'COLLER-ICI-L-ID';

-- Tout approuver d'un coup (à utiliser avec prudence)
update public.documents set status = 'approved' where status = 'pending';
```

### Donner le rôle de modérateur à votre compte

Ce rôle permet, depuis le site, de lire les documents en attente et de valider les propositions de filières (page **Universités**). Créez d'abord votre compte sur le site (étape 9), puis exécutez dans **SQL Editor** :

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"catalog_role": "moderator"}'::jsonb
where email = 'kossivitinek@gmail.com';
```

Déconnectez-vous puis reconnectez-vous sur le site pour que le rôle soit pris en compte. Ce rôle est stocké dans `app_metadata`, que l'utilisateur ne peut pas modifier lui-même.

---

## Récapitulatif

| Où | Quoi |
|---|---|
| Supabase · SQL Editor | `supabase/schema.sql`, puis `supabase/catalog.sql` |
| Supabase · Providers → Google | Client ID et secret Google |
| Supabase · URL Configuration | Site URL et Redirect URLs |
| Google Cloud | Écran de consentement publié, client « Application Web », URI de callback Supabase |
| `frontend/scripts/config.js` | Project URL et **Publishable** key, puis `git push` |
| Supabase · Table Editor → `documents` | Validation des dépôts (`pending` → `approved`) |
