# 🚀 Guide de Déploiement sur Vercel (EduVault 2026)

Ce guide déploie **EduVault** sur **Vercel**. Le site parle directement à Supabase : il n'y a aucun serveur à héberger en plus.

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

### Étape 3 : Configurer Supabase

1. Suivez le [guide Supabase](./SUPABASE_SETUP.md) : il crée la base, la sécurité, le stockage des PDF et la connexion Google.
2. Renseignez l'URL Supabase et la clé **Publishable** dans `frontend/scripts/config.js`.
3. Ne placez jamais la clé **Secret** (`service_role`) dans le frontend, dans GitHub ou dans une variable Vercel : le site n'en a pas besoin.

Le lecteur affiche le fichier PDF original via un lien temporaire Supabase. Si le PDF n'est pas accessible (document pas encore validé, par exemple), une erreur est affichée.

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

Vercel construit les neuf entrées HTML React de Vite et publie `frontend/dist`, qui contient aussi les ressources statiques historiques nécessaires au fonctionnement des pages. 

---

## ✨ Tester votre site déployé
Dès la fin du déploiement :
- Ouvrez l'URL fournie par Vercel.
- Explorez les documents de l'**ENP Campus Lomé**, de l'**Université de Lomé**, testez la visionneuse de document intégrée, le centre de notifications et la page de profil !
