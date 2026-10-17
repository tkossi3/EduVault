# 🗄️ Guide de Configuration de la Base de Données sur Supabase (EduVault 2026)

Ce guide détaille pas à pas comment initialiser, configurer et sécuriser votre projet **Supabase** pour **EduVault**.

---

## 📋 Étape 1 : Créer un projet Supabase

1. Rendez-vous sur [supabase.com](https://supabase.com) et connectez-vous.
2. Cliquez sur **"New Project"**.
3. Renseignez les informations :
   - **Name** : `EduVault`
   - **Database Password** : Définissez un mot de passe fort et conservez-le précieusement.
   - **Region** : Choisissez la région la plus proche (ex. *EU Central - Frankfurt* ou *West Europe*).
4. Cliquez sur **"Create new project"** et patientez 1 à 2 minutes pendant l'initialisation.

---

## ⚡ Étape 2 : Créer les tables et le catalogue (script SQL)

Le script complet prêt à exécuter se trouve dans [`backend/sql/schema.sql`](./backend/sql/schema.sql). Il crée les tables, configure les règles d'accès, ajoute les données initiales et prépare la modération des filières.

1. Dans VS Code, ouvrez `backend/sql/schema.sql`.
2. Sélectionnez tout le fichier (`Ctrl+A`), puis copiez-le (`Ctrl+C`).
3. Dans Supabase, ouvrez **SQL Editor** et cliquez sur **New query**.
4. Collez le script entier dans l'éditeur.
5. Cliquez sur **Run** et attendez la fin. Une exécution réussie affiche **Success**. Si un message d'erreur rouge apparaît, arrêtez-vous et corrigez-le avant de continuer.
6. Pour vérifier le catalogue créé, ouvrez une nouvelle requête et exécutez :

```sql
select
  (select count(*) from public.institutions) as etablissements,
  (select count(*) from public.programs) as filieres,
  (select count(*) from public.courses) as cours;
```

Sur un projet neuf, les valeurs attendues sont **13 établissements, 45 filières et 20 cours**. Les cours des autres filières devront être ajoutés avant d'y autoriser les dépôts.

Pour un projet existant, faites une sauvegarde et vérifiez les noms d'établissements avant de relancer le script.

### Ce que ce script crée :
- `public.profiles` : Informations étudiantes (nom, campus, filière, bio, niveau).
- `public.institutions` : Les 13 établissements du catalogue initial, avec leur secteur public/privé.
- `public.programs` : Les filières initiales, associées à chaque établissement.
- `public.program_change_requests` : Propositions de création et de renommage de filières en attente de modération.
- `public.courses` : Les 20 cours de démonstration disponibles au premier lancement (S1 à S6); complétez ce catalogue dans Supabase avant d'ouvrir le dépôt à tous les parcours.
- `public.documents` : Banque de documents PDF (supports, TD, examens 2026).
- `public.notifications` : Alertes interactives pour chaque étudiant.
- **Row Level Security (RLS)** & Déclencheur automatique de création de profil à l'inscription.
- Fonction SQL atomique de validation/refus des demandes de filière, exécutable uniquement par le backend avec sa clé `service_role`.

---

## 📦 Étape 3 : Créer le Bucket de Stockage (Supabase Storage)

1. Dans le menu de gauche, cliquez sur **Storage** (icône seau).
2. Cliquez sur **"New Bucket"**.
3. Remplissez comme suit :
   - **Bucket name** : `academic-documents`
   - **Public bucket** : *Désactivé* (Laissez privé pour que les liens de téléchargement soient signés et sécurisés).
4. Cliquez sur **Save**. Le nom doit être exactement `academic-documents`; ne rendez pas le bucket public.

---

## 🔑 Étape 4 : Configurer l'authentification

Dans **Authentication > URL Configuration**, renseignez l'adresse Vercel comme **Site URL** et ajoutez-la aux **Redirect URLs**. Ajoutez aussi les adresses locales employées pendant le développement.

## 🔑 Étape 5 : Récupérer vos clés d'API

1. Rendez-vous dans **Project Settings** (icône roue crantée en bas à gauche) > **API**.
2. Copiez les deux valeurs :
   - **Project URL** (ex: `https://xyzprojectid.supabase.co`)
   - **Project API Keys** :
     - `anon` `public` : Pour le frontend (`scripts/config.js`).
     - `service_role` `secret` : Pour le backend FastAPI (`backend/.env`).

---

## ⚙️ Étape 6 : Connecter le frontend et le backend

### 1. Frontend : [`frontend/scripts/config.js`](./frontend/scripts/config.js)
```javascript
window.EDUVAULT_CONFIG = {
    API_BASE_URL: "https://votre-api-publique/api",
    SUPABASE_URL: "https://xyzprojectid.supabase.co",
    SUPABASE_ANON_KEY: "votre-cle-anon-publique"
};
```

Utilisez l'URL publique du backend FastAPI. Vercel héberge ici le frontend statique, pas l'API.

### 2. Backend : variables d'environnement du service FastAPI
```env
SUPABASE_URL=https://xyzprojectid.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role-secrete
SUPABASE_ANON_KEY=votre-cle-anon-publique
CORS_ORIGINS=["https://votre-domaine-vercel.app","http://localhost:5500","http://127.0.0.1:5500"]
```

Configurez ces valeurs dans les paramètres privés de l'hébergeur backend (ou dans `backend/.env` en local). **Ne publiez pas la clé `SUPABASE_SERVICE_ROLE_KEY` dans le frontend, GitHub ou un message.**

### 3. Rôle de modération du catalogue

Les comptes connectés peuvent proposer une filière ou son renommage. Seul un compte dont le `app_metadata` Supabase contient `catalog_role: "moderator"` peut approuver ou refuser ces demandes. Attribuez ce rôle depuis un environnement serveur de confiance avec l'API Supabase Auth Admin; ne le stockez jamais dans `user_metadata` modifiable par l'utilisateur et ne l'attribuez jamais depuis le frontend.

Les changements de filière restent indisponibles entre utilisateurs tant que le backend FastAPI n'est pas déployé et connecté à cette base.

---

## ✅ Étape 7 : Vérifier le déploiement de bout en bout

1. Déployez le backend FastAPI et vérifiez ses logs de démarrage.
2. Dans un navigateur, ouvrez `https://votre-api-publique/health` et vérifiez `{"status":"ok"}`. Ouvrez ensuite `/api/catalog` sur le même domaine et vérifiez que les établissements apparaissent.
3. Déployez le frontend Vercel avec l'URL API configurée. Vérifiez que `CORS_ORIGINS` contient le domaine Vercel exact.
4. Créez un compte de test, confirmez l'adresse selon le réglage Auth et vérifiez la connexion.
5. Déposez un petit PDF avec ce compte. Il doit apparaître dans **Profil** avec l'état **En attente**, sans être visible dans la bibliothèque publique.
6. Faites approuver le document par un modérateur. Vérifiez la lecture page par page, le défilement continu, et que le téléchargement ouvre le même fichier.
7. Supprimez le dépôt de test depuis le profil et vérifiez qu'il n'est plus disponible.

### En cas de problème

- **Erreur SQL** : lisez le premier message rouge dans SQL Editor et assurez-vous que le fichier entier a été copié.
- **Catalogue vide / erreur API** : vérifiez l'URL API, les variables Supabase du backend et les logs de ce service.
- **Erreur CORS** : ajoutez le domaine exact de Vercel dans `CORS_ORIGINS`, puis redéployez le backend.
- **Erreur de lecture ou de dépôt PDF** : vérifiez que le bucket privé `academic-documents` existe et que le backend possède la clé `service_role`.

La base n'est créée qu'après l'exécution du SQL dans votre projet Supabase. Ce dépôt ne crée pas le projet cloud à votre place.
