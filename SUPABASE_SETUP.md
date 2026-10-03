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

## ⚡ Étape 2 : Exécuter le Script SQL

1. Dans le menu latéral de votre tableau de bord Supabase, cliquez sur **SQL Editor** (icône `>_`).
2. Cliquez sur **"+ New query"**.
3. Ouvrez le fichier local [`backend/sql/schema.sql`](file:///c:/Users/tkossi3/Documents/EduVault/backend/sql/schema.sql), copiez l'intégralité de son contenu et collez-le dans l'éditeur SQL de Supabase.
4. Cliquez sur le bouton vert **"Run"** (ou `Ctrl + Enter`).
5. Vous devez obtenir le message : `Success. No rows returned`.

### Ce que ce script crée :
- `public.profiles` : Informations étudiantes (nom, campus, filière, bio, niveau).
- `public.institutions` : Universités et campus partenaires (avec détection anti-doublon, ex. **ENP Campus Lomé**, Université de Lomé, Université de Kara).
- `public.programs` : Filières académiques par campus.
- `public.courses` : Matières et unités d'enseignement (S1 à S6).
- `public.documents` : Banque de documents PDF (supports, TD, examens 2026).
- `public.notifications` : Alertes interactives pour chaque étudiant.
- **Row Level Security (RLS)** & Déclencheur automatique de création de profil à l'inscription.

---

## 📦 Étape 3 : Créer le Bucket de Stockage (Supabase Storage)

1. Dans le menu de gauche, cliquez sur **Storage** (icône seau).
2. Cliquez sur **"New Bucket"**.
3. Remplissez comme suit :
   - **Bucket name** : `academic-documents`
   - **Public bucket** : *Désactivé* (Laissez privé pour que les liens de téléchargement soient signés et sécurisés).
4. Cliquez sur **"Save"**.

---

## 🔑 Étape 4 : Récupérer vos Clés d'API

1. Rendez-vous dans **Project Settings** (icône roue crantée en bas à gauche) > **API**.
2. Copiez les deux valeurs :
   - **Project URL** (ex: `https://xyzprojectid.supabase.co`)
   - **Project API Keys** :
     - `anon` `public` : Pour le frontend (`scripts/config.js`).
     - `service_role` `secret` : Pour le backend FastAPI (`backend/.env`).

---

## ⚙️ Étape 5 : Connecter le Frontend et le Backend

### 1. Frontend : [`frontend/scripts/config.js`](file:///c:/Users/tkossi3/Documents/EduVault/frontend/scripts/config.js)
```javascript
window.EDUVAULT_CONFIG = {
    API_BASE_URL: "https://votre-backend.vercel.app/api", // ou http://localhost:8000/api en local
    SUPABASE_URL: "https://xyzprojectid.supabase.co",
    SUPABASE_ANON_KEY: "votre-cle-anon-publique"
};
```

### 2. Backend : [`backend/.env`](file:///c:/Users/tkossi3/Documents/EduVault/backend/.env)
```env
SUPABASE_URL=https://xyzprojectid.supabase.co
SUPABASE_KEY=votre-cle-service-role-secrete
SUPABASE_ANON_KEY=votre-cle-anon-publique
CORS_ORIGINS=["https://eduvault.vercel.app","http://localhost:3000","http://127.0.0.1:5500"]
```

---

## ✅ Félicitations !
Votre base de données Supabase est prête et interconnectée avec EduVault 2026 !
