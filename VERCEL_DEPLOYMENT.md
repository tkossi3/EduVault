# 🚀 Guide de Déploiement sur Vercel (EduVault 2026)

Ce guide vous explique comment déployer le site web **EduVault** gratuitement et en quelques clics sur **Vercel**.

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
   - *Output Directory* : `frontend` (ou laissez par défaut selon `vercel.json`).

### Étape 3 : Variables d'Environnement (Optionnel si API séparée)
Si vous connectez le frontend à votre instance Supabase, vous pouvez renseigner vos variables dans [`frontend/scripts/config.js`](file:///c:/Users/tkossi3/Documents/EduVault/frontend/scripts/config.js).

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

## 🔄 Configuration de Redirection & Routage

Le fichier [`vercel.json`](file:///c:/Users/tkossi3/Documents/EduVault/vercel.json) à la racine du projet assure le routage correct des pages, styles et scripts :

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
