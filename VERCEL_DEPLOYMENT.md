# 🚀 Guide de Déploiement sur Vercel (EduVault 2026)

Ce guide déploie le frontend statique **EduVault** sur **Vercel**. Le backend FastAPI et la base Supabase sont des services séparés : le dépôt ne configure ni ne déploie automatiquement l'API.

---

## 🛠️ Prérequis

1. Un compte [Vercel](https://vercel.com) (connexion gratuite avec GitHub, GitLab ou email).
2. Votre code source déposé sur un dépôt GitHub (ou via l'outil CLI Vercel).

---

## 🌐 Méthode 1 : Déploiement Direct via l'interface Vercel (Recommandée)

### Étape 1 : Importer le Dépôt
1. Connectez-vous à votre tableau de bord sur [vercel.com](https://vercel.com).
2. Cliquez sur **"Add New..."** > **"Project"**.
3. Sélectionnez votre dépôt GitHub `EduVault` et cliquez sur **"Import"**.

### Étape 2 : Configuration du Projet
1. **Framework Preset** : Sélectionnez `Other`.
2. **Root Directory** : Laissez `./` (la racine du projet contient déjà le fichier `vercel.json`).
3. Dans la section **Build and Output Settings** :
   - *Build Command* : Laissez vide.
   - *Output Directory* : Laissez vide. `vercel.json` sert les fichiers du dossier `frontend`.

### Étape 3 : Configurer Supabase et l'API

1. Exécutez d'abord les étapes du [guide Supabase](./SUPABASE_SETUP.md).
2. Renseignez l'URL Supabase et la clé `anon` publique dans `frontend/scripts/config.js`.
3. Déployez le backend FastAPI sur un hébergeur compatible séparément. Puis configurez `API_BASE_URL` dans ce même fichier avec son URL publique suivie de `/api` et autorisez le domaine Vercel dans `CORS_ORIGINS`.
4. Ne placez jamais la clé Supabase `service_role` dans le frontend ou dans une variable exposée au navigateur; elle appartient uniquement au backend.

Sans backend public configuré, les appels API distants ne sont pas disponibles. Le frontend peut alors utiliser ses données locales de démonstration; celles-ci ne constituent pas une base partagée entre les visiteurs.

### Étape 4 : Déployer
1. Cliquez sur **"Deploy"**.
2. Patientez quelques secondes : Vercel génère votre URL publique (ex: `https://eduvault.vercel.app`).

---

## 💻 Méthode 2 : Déploiement via le Terminal (Vercel CLI)

Si vous préférez déployer depuis votre terminal PowerShell :

```powershell
# 1. Installer la CLI Vercel globalement
npm install -g vercel

# 2. Se connecter à Vercel
vercel login

# 3. Déployer en production
vercel --prod
```

---

## 🔄 Configuration de routage

Le fichier [`vercel.json`](./vercel.json) à la racine du projet assure le routage des pages, styles, scripts et ressources statiques. Il ne redirige volontairement pas `/api` vers `localhost` : une telle adresse désignerait l'ordinateur de chaque visiteur, pas votre backend.

```json
{
  "version": 2,
  "name": "eduvault",
  "cleanUrls": true,
  "routes": [
    { "src": "/pages/(.*)", "dest": "/frontend/pages/$1" },
    { "src": "/styles/(.*)", "dest": "/frontend/styles/$1" },
    { "src": "/scripts/(.*)", "dest": "/frontend/scripts/$1" },
    { "src": "/assets/(.*)", "dest": "/frontend/assets/$1" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ]
}
```

---

## ✨ Tester votre site déployé
Dès la fin du déploiement :
- Ouvrez l'URL fournie par Vercel.
- Explorez les documents de l'**ENP Campus Lomé**, de l'**Université de Lomé**, testez la visionneuse de document intégrée, le centre de notifications et la page de profil !
