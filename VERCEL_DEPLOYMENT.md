# 🚀 Guide de Déploiement sur Vercel (EduVault 2026)

Ce guide déploie le frontend statique **EduVault** sur **Vercel**. Le backend FastAPI et la base Supabase sont des services séparés : le dépôt ne configure ni ne déploie automatiquement l'API.

---

## 🛠️ Prérequis

1. Un compte [Vercel](https://vercel.com) (connexion gratuite avec GitHub, GitLab ou email).
2. Votre code source déposé sur un dépôt GitHub (ou via l'outil CLI Vercel).
3. Node.js **20.19+** ou **22.12+** pour les installations et builds locaux.

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
   - *Build Command* : `npm --prefix frontend run build`
   - *Output Directory* : `frontend/dist`
   - *Install Command* : `npm --prefix frontend ci`

   Ces paramètres sont également enregistrés dans [`vercel.json`](./vercel.json).

### Étape 3 : Configurer Supabase et l'API

1. Exécutez d'abord les étapes du [guide Supabase](./SUPABASE_SETUP.md).
2. Déployez le backend FastAPI sur un hébergeur compatible séparément, puis définissez `VITE_API_BASE_URL` dans les variables d'environnement Vercel avec son URL publique suivie de `/api`. Autorisez le domaine Vercel dans `CORS_ORIGINS`.
3. Renseignez l'URL Supabase et la clé `anon` publique dans `frontend/scripts/config.js`.
4. Ne placez jamais la clé Supabase `service_role` dans le frontend ou dans une variable exposée au navigateur; elle appartient uniquement au backend.

Sans backend public configuré, les appels API distants ne sont pas disponibles. Les documents déposés en local restent dans le navigateur concerné et ne sont pas partagés entre les visiteurs.

Le lecteur affiche le fichier PDF original associé à son identifiant. Si le PDF, le backend ou son URL signée n’est pas accessible, une erreur est affichée : aucun faux document n’est généré à la place.

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

Vercel construit les neuf entrées HTML React de Vite et publie `frontend/dist`, qui contient aussi les ressources statiques historiques nécessaires au fonctionnement des pages. Il ne redirige volontairement pas `/api` vers `localhost` : une telle adresse désignerait l'ordinateur de chaque visiteur, pas votre backend.

---

## ✨ Tester votre site déployé
Dès la fin du déploiement :
- Ouvrez l'URL fournie par Vercel.
- Explorez les documents de l'**ENP Campus Lomé**, de l'**Université de Lomé**, testez la visionneuse de document intégrée, le centre de notifications et la page de profil !
