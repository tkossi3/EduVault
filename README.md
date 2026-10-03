# 🏛️ EduVault — Le Coffre-Fort Académique Universitaire (2026)

**EduVault** est une plateforme moderne, collaborative et libre conçue pour permettre aux étudiants et enseignants de déposer, consulter et télécharger des ressources académiques certifiées (supports de cours, TD, examens et annales corrigées).

---

## ✨ Nouveautés & Fonctionnalités Clés (Session 2026)

- **🎨 Design Moderne & Thème Clair par Défaut** :
  - Interface soignée, lumineuse et responsive adaptée à tous les écrans.
  - Bascule fluide entre thème clair et sombre avec mémorisation des préférences.
- **✨ 100% Icônes SVG Personnalisées** :
  - Tous les anciens émojis et glyphes ont été remplacés par des icônes vectorielles SVG nettes, expressives et professionnelles.
  - Nouveau logo SVG personnalisé représentant le coffre et la voûte académique.
- **🔍 Recherche Intuitive & Optimisée** :
  - Barre de recherche intégrée avec loupe SVG, suggestions dynamiques et filtrage instantané par catégorie.
  - Suppression des raccourcis encombrants pour une navigation fluide et naturelle.
- **🔔 Centre de Notifications Réactif** :
  - Suivi en temps réel des dépôts et publications.
  - Onglets "Toutes" / "Non lues", actions instantanées ("Marquer comme lu", "Tout marquer comme lu", "Supprimer").
- **👤 Espace Profil & Historique des Dépôts** :
  - Modification des informations étudiantes (nom, email, campus, filière, niveau, bio).
  - Statistiques en direct (nombre de dépôts, vues cumulées, téléchargements).
  - Gestion et suppression de ses propres documents déposés.
- **🏫 Gestion Intelligente des Campus & Détection Anti-Doublon** :
  - Recherche et sélection parmi les établissements partenaires (**ENP Campus Lomé**, Université de Lomé, Université de Kara, etc.).
  - Vérification automatique de similarité pour empêcher les doublons d'établissements.
- **📖 Visionneuse de Document Haute Définition Intégrée** :
  - Lecteur multipage avec simulation complète d'épreuves et corrigés officiels.
  - Outils de navigation (page suivante/précédente, zoom +/-, impression, téléchargement direct).

---

## 📁 Structure du Projet

```
EduVault/
├── backend/                  # API Python FastAPI & Supabase
│   ├── models/               # Schémas Pydantic
│   ├── routes/               # Routes FastAPI (auth, catalog, documents, notifications)
│   ├── sql/
│   │   └── schema.sql        # Schéma PostgreSQL Supabase 2026
│   ├── config.py
│   ├── main.py
│   └── requirements.txt
├── frontend/                 # Application Web Moderne (HTML5, Vanilla CSS, JS)
│   ├── assets/
│   │   └── eduvault.svg      # Logo vectoriel officiel EduVault
│   ├── pages/
│   │   ├── document-view.html # Visionneuse de document & lecteur PDF
│   │   ├── notifications.html # Centre de notifications
│   │   ├── parcours.html      # Arborescence filières & semestres
│   │   ├── profile.html       # Gestion du profil & mes dépôts
│   │   └── upload.html        # Formulaire de dépôt simplifié
│   ├── scripts/
│   │   ├── app.js             # Interactions de la page d'accueil
│   │   ├── auth.js            # Client d'authentification
│   │   ├── catalog.js         # Navigation dans les cours
│   │   ├── icons.js           # Bibliothèque d'icônes SVG
│   │   ├── pdf-viewer.js      # Moteur de la visionneuse
│   │   ├── profile.js         # Logique du profil & statistiques
│   │   ├── store.js           # Store réactif & vérification anti-doublon
│   │   ├── theme.js           # Gestionnaire de thème clair/sombre
│   │   └── upload.js          # Glisser-déposer & validation
│   ├── styles/
│   │   ├── animations.css
│   │   ├── components.css
│   │   ├── main.css
│   │   ├── pages.css
│   │   └── variables.css
│   └── index.html             # Page d'accueil principale
├── SUPABASE_SETUP.md         # Guide pas à pas de configuration Supabase
├── VERCEL_DEPLOYMENT.md      # Guide pas à pas de déploiement Vercel
├── vercel.json               # Configuration de routage Vercel
└── README.md
```

---

## 🚀 Démarrage Rapide en Local

### 1. Ouvrir le site directement dans le navigateur
Ouvrez simplement le fichier [`frontend/index.html`](file:///c:/Users/tkossi3/Documents/EduVault/frontend/index.html) dans votre navigateur (ou via l'extension *Live Server* de votre éditeur). Toutes les fonctionnalités (recherche, lecteur de document, profil, upload, notifications) fonctionnent immédiatement grâce au store réactif embarqué.

### 2. Démarrer le backend FastAPI (Optionnel)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 📚 Guides Dédiés

- 🗄️ [Guide de configuration Supabase](file:///c:/Users/tkossi3/Documents/EduVault/SUPABASE_SETUP.md)
- 🚀 [Guide de déploiement sur Vercel](file:///c:/Users/tkossi3/Documents/EduVault/VERCEL_DEPLOYMENT.md)

---

## ⚖️ Licence & Copyright
© **2026 EduVault**. Plateforme collaborative sous licence MIT.