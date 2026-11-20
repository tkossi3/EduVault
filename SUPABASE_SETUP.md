# Configurer Supabase et Google pour EduVault

Ce guide part de zéro : aucun projet Supabase n'existe. Suivez les étapes dans l'ordre. Comptez environ 30 minutes.

**Avant de commencer**, gardez trois onglets ouverts, tous connectés avec le compte `kossivitinek@gmail.com` :

- Supabase : <https://supabase.com/dashboard>
- Google Cloud Console : <https://console.cloud.google.com>
- Vercel : <https://vercel.com/dashboard>

Le site en production est `https://eduvaultcampus.vercel.app`. Si vous changez de domaine, remplacez cette adresse partout dans ce guide.

---

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

## Étape 2 — Créer les tables

1. Dans le menu de gauche du projet, ouvrez **SQL Editor**, puis cliquez sur **New query** (ou sur le bouton **+**).
2. Dans VS Code, ouvrez [`backend/sql/schema.sql`](./backend/sql/schema.sql), faites `Ctrl+A` puis `Ctrl+C`.
3. Collez le contenu dans l'éditeur Supabase et cliquez sur **Run** (ou `Ctrl+Entrée`).
4. Le résultat attendu est **Success. No rows returned**. Des messages « NOTICE … does not exist, skipping » sont normaux.

> N'exécutez `schema.sql` **qu'une seule fois**. Une deuxième exécution échoue avec « policy … already exists ». Ce n'est pas grave : les tables existent déjà, passez à l'étape suivante.

---

## Étape 3 — Charger le catalogue des écoles et filières

1. Dans **SQL Editor**, cliquez à nouveau sur **New query**.
2. Copiez tout le fichier [`backend/sql/seed_catalog_2026.sql`](./backend/sql/seed_catalog_2026.sql) et collez-le.
3. Cliquez sur **Run**. Résultat attendu : **Success**.
4. Vérifiez avec une nouvelle requête :

```sql
select
  (select count(*) from public.institutions) as etablissements,
  (select count(*) from public.programs where is_listed) as filieres_visibles;
```

Résultat attendu : **31 établissements** et **48 filières visibles**.

Ce script :

- renomme les anciens établissements de `schema.sql` avec des noms courts et lisibles, pour éviter les doublons ;
- masque les anciennes filières non vérifiées ;
- ajoute les écoles et filières informatiques recensées au Togo en novembre 2026.

Vous pouvez le relancer sans risque après une modification.

---

## Étape 4 — Créer l'espace de stockage des PDF

1. Dans le menu de gauche, ouvrez **Storage**, puis cliquez sur **New bucket**.
2. **Name of bucket** : `academic-documents`. Respectez exactement ce nom, en minuscules.
3. Laissez **Public bucket** **désactivé**. Les PDF ne seront lisibles que par des liens temporaires créés par le serveur.
4. Facultatif : ouvrez **Additional configuration** et réglez **Restrict file size** sur `20 MB` et **Allowed MIME types** sur `application/pdf`.
5. Cliquez sur **Create**.

---

## Étape 5 — Récupérer l'adresse et les clés du projet

1. Ouvrez **Project Settings** (roue crantée en bas à gauche).
2. Dans **Data API**, copiez **Project URL**. Elle ressemble à `https://abcdefghijklmnop.supabase.co`. La partie `abcdefghijklmnop` est l'**identifiant du projet** (*project ref*). Notez-le, il servira à l'étape 7.
3. Dans **API Keys**, copiez :
   - la **Publishable key**, qui commence par `sb_publishable_…`. Elle est publique et va dans le site.
   - la **Secret key**, qui commence par `sb_secret_…`. Elle sert uniquement au serveur Python (étape 10).

> ⚠️ La **Secret key** (anciennement `service_role`) donne un accès total à la base. Ne la mettez **jamais** dans `frontend/`, dans un commit GitHub (le dépôt est public) ou dans un message. Si elle fuit, régénérez-la dans **API Keys**.

---

## Étape 6 — Brancher le site sur le nouveau projet

1. Ouvrez [`frontend/scripts/config.js`](./frontend/scripts/config.js).
2. Remplacez les deux valeurs par celles de l'étape 5 :

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

## Étape 7 — Créer l'identifiant Google (Google Cloud Console)

### 7.1 Créer un projet Google Cloud

1. Ouvrez <https://console.cloud.google.com>.
2. En haut à gauche, cliquez sur le sélecteur de projet, puis sur **Nouveau projet**.
3. Nom : `EduVault`, puis cliquez sur **Créer**. Une fois le projet créé, sélectionnez-le.

### 7.2 Configurer l'écran de consentement

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

### 7.3 Créer l'identifiant OAuth

1. Menu ☰ → **API et services** → **Identifiants** (ou **Google Auth Platform → Clients**).
2. **+ Créer des identifiants** → **ID client OAuth**.
3. **Type d'application** : **Application Web**. **Nom** : `EduVault Web`.
4. **Origines JavaScript autorisées**, ajoutez :
   - `https://eduvaultcampus.vercel.app`
   - `http://localhost:5173`
5. **URI de redirection autorisés**, ajoutez **exactement** :
   - `https://VOTRE-PROJECT-REF.supabase.co/auth/v1/callback`

   Remplacez `VOTRE-PROJECT-REF` par l'identifiant de l'étape 5. Supabase affiche aussi cette adresse toute prête à l'étape 8 (champ **Callback URL**) : vous pouvez la copier depuis là.
6. Cliquez sur **Créer**. Copiez l'**ID client** (il se termine par `.apps.googleusercontent.com`) et le **Code secret du client** (il commence par `GOCSPX-`).

> Ces deux valeurs vont **uniquement dans Supabase** (étape 8), jamais dans le code du site.

---

## Étape 8 — Activer Google dans Supabase

1. Dans Supabase : **Authentication** → **Sign In / Providers** (ou **Providers**) → **Google**.
2. Activez **Enable Sign in with Google**.
3. **Client IDs** : collez l'ID client Google.
4. **Client Secret (for OAuth)** : collez le code secret `GOCSPX-…`.
5. Vérifiez que la **Callback URL** affichée est identique à celle saisie dans Google à l'étape 7.3.
6. Cliquez sur **Save**.

---

## Étape 9 — Autoriser les adresses de retour

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

## Étape 10 — Vérifier que tout fonctionne

1. Ouvrez `https://eduvaultcampus.vercel.app/pages/register` et créez un compte avec un e-mail réel. Si **Confirm email** est actif, cliquez sur le lien reçu par e-mail.
2. Dans Supabase → **Authentication** → **Users**, le compte doit apparaître.
3. Dans **Table Editor** → `profiles`, une ligne doit avoir été créée automatiquement pour ce compte.
4. Ouvrez `https://eduvaultcampus.vercel.app/pages/login` et cliquez sur **Continuer avec Google**. Vous devez revenir sur la page **Profil**, connecté.

| Message d'erreur | Cause | Solution |
|---|---|---|
| `Unsupported provider: provider is not enabled` | Google n'est pas activé | Étape 8 |
| `redirect_uri_mismatch` (page Google) | L'URI de redirection Google n'est pas exacte | Étape 7.3, point 5 |
| Retour sur `localhost:3000` | Site URL non configurée | Étape 9 |
| `Accès bloqué : … n'a pas terminé la procédure de validation` | Application Google encore en mode Test | Étape 7.2, point 7 |
| `Email rate limit exceeded` | Trop d'e-mails envoyés par le service intégré | Désactivez **Confirm email** ou configurez un SMTP (étape 9) |
| `Invalid API key` | Mauvaise clé dans `config.js` | Étape 6 (utilisez la clé **Publishable**) |

---

## Validation des documents : qui valide, et comment ?

### Le principe

Chaque document déposé passe par un état **en attente** (`pending`). Il n'apparaît pour tout le monde qu'une fois passé à **approuvé** (`approved`). Le modérateur, c'est vous : le propriétaire du projet Supabase.

### ⚠️ État actuel du site

Pour que les dépôts soient partagés entre utilisateurs, le serveur Python (`backend/`, FastAPI) doit être hébergé. **Vercel n'héberge que le site, pas ce serveur.** Tant qu'il n'est pas déployé :

- la connexion, l'inscription et Google fonctionnent : elles passent directement par Supabase ;
- un document déposé reste **dans le navigateur de la personne qui l'a déposé**. Il n'est ni envoyé dans Supabase ni visible par les autres. Il n'y a donc encore rien à valider.

Pour activer le partage, il faut déployer `backend/` sur un hébergeur Python (Render, Railway, Fly.io…). Renseignez ces variables dans les paramètres privés de l'hébergeur, jamais dans GitHub :

```env
SUPABASE_URL=https://VOTRE-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
CORS_ORIGINS=["https://eduvaultcampus.vercel.app","http://localhost:5173"]
```

Ensuite, dans Vercel → projet `eduvaultcampus` → **Settings** → **Environment Variables**, ajoutez `VITE_API_BASE_URL` = `https://adresse-de-votre-api/api`, puis redéployez.

### Valider un document (une fois le serveur déployé)

Dans Supabase → **SQL Editor** :

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
```

Vous pouvez aussi passer par **Table Editor** → `documents` : double-cliquez sur la case `status` d'une ligne et choisissez `approved`.

### Donner le rôle de modérateur à votre compte

Ce rôle permet de valider depuis le site les propositions d'ajout ou de renommage de filières. Créez d'abord votre compte sur le site (étape 10), puis exécutez dans **SQL Editor** :

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"catalog_role": "moderator"}'::jsonb
where email = 'kossivitinek@gmail.com';
```

Déconnectez-vous puis reconnectez-vous sur le site pour que le rôle soit pris en compte. Ce rôle est stocké dans `app_metadata`, que l'utilisateur ne peut pas modifier lui-même. Ne le placez jamais dans `user_metadata`.

---

## Récapitulatif

| Où | Quoi |
|---|---|
| Supabase · SQL Editor | `schema.sql` (une fois), puis `seed_catalog_2026.sql` |
| Supabase · Storage | Bucket privé `academic-documents` |
| Supabase · Providers → Google | Client ID et secret Google |
| Supabase · URL Configuration | Site URL et Redirect URLs |
| Google Cloud | Écran de consentement publié, client « Application Web », URI de callback Supabase |
| `frontend/scripts/config.js` | Project URL et **Publishable** key, puis `git push` |
| Hébergeur Python (plus tard) | Secret key, pour le partage et la validation des documents |
