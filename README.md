# 🏛️ EduVault — Le Coffre-Fort Académique Universitaire (2026)

**EduVault** est une plateforme collaborative conçue pour permettre aux étudiants et enseignants de déposer, consulter et télécharger des ressources académiques modérées (supports de cours, TD, examens et annales). La modération ne garantit pas l’exactitude officielle des contenus; vérifiez-les auprès de l’établissement concerné.

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
  - Lecture du PDF original fourni, sans document fictif de remplacement.
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
├── frontend/                 # Application React/Vite et interface EduVault
│   ├── src/
│   │   ├── templates/        # Maquettes HTML historiques montées par React
│   │   ├── App.jsx           # Routage multi-pages et compatibilité des vues
│   │   └── main.jsx          # Initialisation de React et de l’API
│   ├── package.json          # Dépendances et commandes Vite
│   ├── package-lock.json     # Versions reproductibles des dépendances
│   ├── .env.example          # Exemple d’URL de l’API
│   ├── vite.config.js        # Build multi-pages
│   ├── assets/
│   │   └── eduvault.svg      # Logo vectoriel officiel EduVault
│   ├── pages/
│   │   ├── document-view.html # Visionneuse de document & lecteur PDF
│   │   ├── library.html       # Bibliothèque
│   │   ├── login.html         # Connexion
│   │   ├── notifications.html # Centre de notifications
│   │   ├── parcours.html      # Arborescence filières & semestres
│   │   ├── profile.html       # Gestion du profil & mes dépôts
│   │   ├── register.html      # Création de compte
│   │   └── upload.html        # Formulaire de dépôt simplifié
│   ├── scripts/
│   │   ├── app.js             # Interactions de la page d'accueil
│   │   ├── auth.js            # Client d'authentification
│   │   ├── catalog.js         # Navigation dans les cours
│   │   ├── config.js          # Configuration publique du frontend
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

### Prérequis

- Node.js **20.19+** ou **22.12+** (LTS recommandé).
- Python **3.11+** uniquement pour démarrer l’API.
- Un projet Supabase configuré pour consulter les documents stockés en ligne. Voir le [guide Supabase](./SUPABASE_SETUP.md).

### 1. Démarrer l’interface

Depuis la racine du dépôt, un terminal peut lancer directement :

```powershell
npm run dev
```

Cette commande utilise les dépendances du frontend. Pour installer celles-ci la première fois, ou lancer l’interface sans passer par les commandes racine :

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

La copie de `.env.example` est à faire une seule fois. Gardez `VITE_API_BASE_URL=http://localhost:8000/api` pour le démarrage local. Ouvrez l’URL affichée par Vite, généralement <http://localhost:5173>. Pour préparer le déploiement depuis la racine, utilisez `npm run build`.

Les pages Explorer, Bibliothèque, Parcours, dépôt, profil, connexion, notifications et lecteur sont accessibles depuis cette adresse. N’ouvrez pas les fichiers HTML directement avec `file://`.

### 2. Démarrer l’API pour lire les PDF en ligne

Dans un deuxième terminal PowerShell :

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
$env:SUPABASE_URL = "https://votre-projet.supabase.co"
$env:SUPABASE_ANON_KEY = "votre-cle-anon"
$env:SUPABASE_SERVICE_ROLE_KEY = "votre-cle-service-role"
$env:CORS_ORIGINS = '["http://localhost:5173"]'
uvicorn main:app --reload --port 8000
```

Renseignez les valeurs privées depuis votre projet Supabase; ne publiez jamais la clé `service_role`. Les fichiers PDF sont lus à partir du fichier effectivement déposé ou de son URL Supabase signée. Si le fichier ou l’API est indisponible, le lecteur affiche une erreur au lieu de fabriquer un document de substitution.

Sans API/Supabase, Vite permet d’explorer l’interface, mais ne peut pas charger les fichiers distants. Un PDF enregistré localement dans ce navigateur reste lisible depuis ce même navigateur.

### 3. Créer le build de production

```powershell
cd frontend
npm run build
```

Les pages et ressources prêtes à déployer sont générées dans `frontend/dist`.

---

## 📚 Guides Dédiés

- 🗄️ [Guide de configuration Supabase](./SUPABASE_SETUP.md)
- 🚀 [Guide de déploiement sur Vercel](./VERCEL_DEPLOYMENT.md)

---

## ⚖️ Licence & Copyright
© **2026 EduVault**. Plateforme collaborative sous licence MIT.