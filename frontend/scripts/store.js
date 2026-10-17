/* Gestionnaire de données EduVault — Stockage local réactif, IndexedDB & passerelle Supabase/API */
(() => {
    const STORAGE_KEY = "eduvault_data_v2026";
    const USER_KEY = "eduvault_current_user_v2026";
    const NOTIF_KEY = "eduvault_notifications_v2026";
    const AUTH_KEY = "eduvault_auth_session_v2026";
    const DB_NAME = "eduvault_files_db_v2026";
    const DB_VERSION = 1;
    const STORE_FILES = "pdf_files";

    // Cache mémoire temporaire
    const memoryFilesCache = new Map();

    // ==================== INDEXEDDB POUR FICHIERS PDF EXACTS ====================
    const openFilesDB = () => {
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                resolve(null);
                return;
            }
            try {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_FILES)) {
                        db.createObjectStore(STORE_FILES, { keyPath: "id" });
                    }
                };
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        });
    };

    const storePdfFile = async (docId, fileData, fileName) => {
        if (!docId || !fileData) return false;
        
        // 1. Stocker en mémoire
        memoryFilesCache.set(docId, fileData);

        // 2. Stocker en sessionStorage pour accès immédiat inter-pages
        try {
            sessionStorage.setItem(`eduvault_file_${docId}`, fileData);
        } catch (e) {
            console.warn("SessionStorage full for file:", e);
        }

        // 3. Stocker de façon permanente dans IndexedDB
        try {
            const db = await openFilesDB();
            if (!db) return true;
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_FILES, "readwrite");
                const store = tx.objectStore(STORE_FILES);
                store.put({ id: docId, data: fileData, name: fileName, updated_at: Date.now() });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch (e) {
            console.warn("IndexedDB put error:", e);
            return false;
        }
    };

    const getPdfFile = async (docId) => {
        if (!docId) return null;

        // 1. Essai en mémoire vive
        if (memoryFilesCache.has(docId)) {
            return memoryFilesCache.get(docId);
        }

        // 2. Essai en sessionStorage
        try {
            const sessionData = sessionStorage.getItem(`eduvault_file_${docId}`);
            if (sessionData) {
                memoryFilesCache.set(docId, sessionData);
                return sessionData;
            }
        } catch {}

        // 3. Essai dans IndexedDB
        try {
            const db = await openFilesDB();
            if (db) {
                const idbResult = await new Promise((resolve) => {
                    const tx = db.transaction(STORE_FILES, "readonly");
                    const store = tx.objectStore(STORE_FILES);
                    const req = store.get(docId);
                    req.onsuccess = () => resolve(req.result ? req.result.data : null);
                    req.onerror = () => resolve(null);
                });
                if (idbResult) {
                    memoryFilesCache.set(docId, idbResult);
                    return idbResult;
                }
            }
        } catch (e) {
            console.warn("IndexedDB read error:", e);
        }

        return null;
    };

    // Données initiales enrichies (Année 2026)
    // Données initiales enrichies (Année 2026) — Écoles Publiques & Privées en Informatique
    const initialInstitutions = [
        // ==================== ÉTABLISSEMENTS PUBLICS & INTER-ÉTATS ====================
        { 
            id: "inst-1", 
            name: "ENP Campus Lomé (EPL)", 
            city: "Lomé", 
            country: "Togo", 
            sector: "public",
            description: "École Polytechnique de Lomé (Université de Lomé) — Formations d'ingénieurs & licences pro" 
        },
        { 
            id: "inst-2", 
            name: "Université de Lomé (FDS - Informatique)", 
            city: "Lomé", 
            country: "Togo", 
            sector: "public",
            description: "Faculté des Sciences — Département de Mathématiques & Informatique Fondamentale" 
        },
        { 
            id: "inst-3", 
            name: "Université de Kara (FST)", 
            city: "Kara", 
            country: "Togo", 
            sector: "public",
            description: "Campus Universitaire de Kara — Faculté des Sciences et Techniques Informatiques" 
        },
        { 
            id: "inst-iai", 
            name: "IAI-Togo (Institut Africain d'Informatique)", 
            city: "Lomé", 
            country: "Togo", 
            sector: "public",
            description: "Institution inter-États de référence africaine en ingénierie logicielle et systèmes" 
        },

        // ==================== ÉTABLISSEMENTS PRIVÉS AGRÉÉS EN INFORMATIQUE ====================
        { 
            id: "inst-esgis", 
            name: "ESGIS (École Supérieure de Gestion, d'Informatique et des Sciences)", 
            city: "Lomé", 
            country: "Togo", 
            sector: "private",
            description: "Grande école privée agréée CAMES — Génie Logiciel, Réseaux & IA" 
        },
        { 
            id: "inst-ipnet", 
            name: "IPNET Institute of Technology", 
            city: "Lomé", 
            country: "Togo", 
            sector: "private",
            description: "Institut technologique privé certifié Cisco, Huawei, AWS — Réseaux, DevOps & Cybersécurité" 
        },
        { 
            id: "inst-defitech", 
            name: "DEFITECH (Institut Polytechnique DEFITECH)", 
            city: "Lomé", 
            country: "Togo", 
            sector: "private",
            description: "Institut polytechnique privé agréé — Génie Logiciel, Télécoms & Data" 
        },
        { 
            id: "inst-ucao", 
            name: "UCAO-UUT (École Supérieure d'Ingénieurs - ESI)", 
            city: "Lomé", 
            country: "Togo", 
            sector: "private",
            description: "Université Catholique — Génie Informatique, Cybersécurité & Données" 
        },
        { 
            id: "inst-esig", 
            name: "ESIG Global Success", 
            city: "Lomé", 
            country: "Togo", 
            sector: "private",
            description: "École supérieure privée agréée — Développement Web/Mobile, Systèmes & BD" 
        },
        { 
            id: "inst-5", 
            name: "IAEC Université (Pôle Technologies & Informatique)", 
            city: "Lomé", 
            country: "Togo", 
            sector: "private",
            description: "Institut Africain d'Études Commerciales & Technologies Numériques" 
        },
        { 
            id: "inst-formatec", 
            name: "FORMATEC (Institut Supérieur Technologique)", 
            city: "Lomé", 
            country: "Togo", 
            sector: "private",
            description: "Institut supérieur privé de formation aux métiers technologiques et réseaux" 
        },
        { 
            id: "inst-cib", 
            name: "CIB-INTA", 
            city: "Lomé", 
            country: "Togo", 
            sector: "private",
            description: "Institut privé d'informatique appliquée, réseaux et développement logiciel" 
        },
        { 
            id: "inst-4", 
            name: "École Supérieure des Affaires (ESA)", 
            city: "Lomé", 
            country: "Togo", 
            sector: "private",
            description: "Management technologique, finance & systèmes d'information" 
        }
    ];

    // Types de diplômes & cycles universitaires
    const initialDegreeTypes = [
        "Licence Professionnelle",
        "Licence Fondamentale",
        "Master Professionnel",
        "Master Recherche",
        "Diplôme d'Ingénieur"
    ];

    const initialPrograms = [
        // ENP Campus Lomé (EPL)
        { id: "prog-1", institution_id: "inst-1", name: "Génie Logiciel & Systèmes d'Information (GL)", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-2", institution_id: "inst-1", name: "Génie Électrique & Télécommunications", degree_type: "Diplôme d'Ingénieur", degree: "Diplôme d'Ingénieur (BAC+5)" },
        { id: "prog-3", institution_id: "inst-1", name: "Systèmes, Réseaux & Sécurité Informatique (SRI)", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-4", institution_id: "inst-1", name: "Intelligence Artificielle & Big Data", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },
        { id: "prog-epl-is", institution_id: "inst-1", name: "Informatique et Systèmes (IS)", degree_type: "Licence Fondamentale", degree: "Licence Fondamentale (LMD)" },
        { id: "prog-epl-cyber", institution_id: "inst-1", name: "Cybersécurité & Sécurité des Systèmes d'Information", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },

        // Université de Lomé (FDS)
        { id: "prog-5", institution_id: "inst-2", name: "Mathématiques & Informatique Fondamentale (MIF)", degree_type: "Licence Fondamentale", degree: "Licence Fondamentale (LMD)" },
        { id: "prog-fds-ifa", institution_id: "inst-2", name: "Informatique Fondamentale et Appliquée (IFA)", degree_type: "Licence Fondamentale", degree: "Licence Fondamentale (LMD)" },
        { id: "prog-fds-ds", institution_id: "inst-2", name: "Science des Données & Modélisation Mathématique", degree_type: "Master Recherche", degree: "Master Recherche (BAC+5)" },
        { id: "prog-6", institution_id: "inst-2", name: "Sciences Économiques & Gestion (FASEG)", degree_type: "Licence Fondamentale", degree: "Licence Fondamentale (LMD)" },

        // Université de Kara (FST)
        { id: "prog-uk-mi", institution_id: "inst-3", name: "Mathématiques et Informatique (MI)", degree_type: "Licence Fondamentale", degree: "Licence Fondamentale (LMD)" },
        { id: "prog-uk-rit", institution_id: "inst-3", name: "Réseaux Informatiques & Télécommunications (RIT)", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-uk-dev", institution_id: "inst-3", name: "Génie Logiciel & Technologies Web", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },

        // IAI-Togo
        { id: "prog-iai-igl", institution_id: "inst-iai", name: "Ingénierie du Génie Logiciel (IGL)", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-iai-asr", institution_id: "inst-iai", name: "Administration Systèmes, Réseaux & Cloud (ASR)", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-iai-isi", institution_id: "inst-iai", name: "Ingénierie des Systèmes d'Information (ISI)", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },
        { id: "prog-iai-sec", institution_id: "inst-iai", name: "Cybersécurité & Audit Informatique", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },

        // ESGIS
        { id: "prog-esgis-gl", institution_id: "inst-esgis", name: "Génie Logiciel & Applications Mobiles", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-esgis-sri", institution_id: "inst-esgis", name: "Systèmes, Réseaux & Sécurité (LPSRI)", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-esgis-ia", institution_id: "inst-esgis", name: "Intelligence Artificielle & Big Data Analytics", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },
        { id: "prog-esgis-miage", institution_id: "inst-esgis", name: "Informatique de Gestion & Systèmes d'Information (MIAGE)", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },

        // IPNET Institute of Technology
        { id: "prog-ipnet-cyber", institution_id: "inst-ipnet", name: "Réseaux, Systèmes & Cybersécurité Internationale", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-ipnet-cloud", institution_id: "inst-ipnet", name: "Génie Logiciel, DevOps & Cloud Computing", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-ipnet-iot", institution_id: "inst-ipnet", name: "Intelligence Artificielle, IoT & Big Data", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },
        { id: "prog-ipnet-gov", institution_id: "inst-ipnet", name: "Gouvernance IT & Systèmes d'Information", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },

        // DEFITECH
        { id: "prog-defi-gl", institution_id: "inst-defitech", name: "Génie Logiciel & Systèmes d'Information", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-defi-mr", institution_id: "inst-defitech", name: "Maintenance Informatique & Réseaux Télécoms", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-defi-sec", institution_id: "inst-defitech", name: "Sécurité Réseaux & Systèmes d'Exploitation", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },
        { id: "prog-defi-data", institution_id: "inst-defitech", name: "Administration de Bases de Données & Data Science", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },

        // UCAO-UUT
        { id: "prog-ucao-gi", institution_id: "inst-ucao", name: "Génie Informatique & Télécommunications", degree_type: "Diplôme d'Ingénieur", degree: "Diplôme d'Ingénieur (BAC+5)" },
        { id: "prog-ucao-cyber", institution_id: "inst-ucao", name: "Cybersécurité & Confiance Numérique", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },
        { id: "prog-ucao-ia", institution_id: "inst-ucao", name: "Intelligence Artificielle & Sciences des Données", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },
        { id: "prog-ucao-dev", institution_id: "inst-ucao", name: "Conception Logicielle & Systèmes Embarqués", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },

        // ESIG Global Success
        { id: "prog-esig-gl", institution_id: "inst-esig", name: "Génie Logiciel & Développement Web/Mobile", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-esig-sr", institution_id: "inst-esig", name: "Administration Systèmes, Réseaux & Bases de Données", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-esig-si", institution_id: "inst-esig", name: "Management des Systèmes d'Information", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },

        // IAEC Université
        { id: "prog-13", institution_id: "inst-5", name: "Génie Logiciel & Multimédia Numérique", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-14", institution_id: "inst-5", name: "Informatique de Gestion (IG)", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-iaec-rt", institution_id: "inst-5", name: "Réseaux Informatiques & Télécommunications", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },

        // FORMATEC
        { id: "prog-forma-gi", institution_id: "inst-formatec", name: "Génie Informatique & Réseaux Industriels", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-forma-tel", institution_id: "inst-formatec", name: "Télécommunications & Systèmes Connectés", degree_type: "Diplôme d'Ingénieur", degree: "Diplôme d'Ingénieur (BAC+5)" },

        // CIB-INTA
        { id: "prog-cib-dev", institution_id: "inst-cib", name: "Développement Web & Génie Logiciel", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },
        { id: "prog-cib-res", institution_id: "inst-cib", name: "Maintenance Informatique & Réseaux Locaux", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" },

        // École Supérieure des Affaires (ESA)
        { id: "prog-11", institution_id: "inst-4", name: "Audit, Contrôle de Gestion & Finance", degree_type: "Master Professionnel", degree: "Master Professionnel (BAC+5)" },
        { id: "prog-12", institution_id: "inst-4", name: "Marketing Digital & Stratégie Commerciale", degree_type: "Licence Professionnelle", degree: "Licence Professionnelle (BAC+3)" }
    ];

    const initialCourses = [
        // Génie Logiciel (prog-1)
        { id: "course-1", program_id: "prog-1", name: "Architecture des Ordinateurs & Systèmes", code: "INF101", semester: 1 },
        { id: "course-2", program_id: "prog-1", name: "Algorithmique & Programmation C/C++", code: "INF102", semester: 1 },
        { id: "course-3", program_id: "prog-1", name: "Mathématiques pour l'Informatique (Algèbre & Analyse)", code: "MAT101", semester: 1 },
        { id: "course-4", program_id: "prog-1", name: "Programmation Orientée Objet (Java / Python)", code: "INF201", semester: 2 },
        { id: "course-5", program_id: "prog-1", name: "Structures de Données Avancées & Graphes", code: "INF202", semester: 2 },
        { id: "course-6", program_id: "prog-1", name: "Bases de Données Relationnelles & SQL", code: "INF301", semester: 3 },
        { id: "course-7", program_id: "prog-1", name: "Génie Logiciel & Modélisation UML", code: "INF302", semester: 3 },
        { id: "course-8", program_id: "prog-1", name: "Développement Web Full-Stack (JS/Node)", code: "INF401", semester: 4 },
        { id: "course-9", program_id: "prog-1", name: "Systèmes d'Exploitation & Linux Avancé", code: "INF402", semester: 4 },
        { id: "course-10", program_id: "prog-1", name: "Architectures Cloud & Microservices", code: "INF501", semester: 5 },
        { id: "course-11", program_id: "prog-1", name: "Cybersécurité & Tests Logiciels", code: "INF502", semester: 5 },
        { id: "course-12", program_id: "prog-1", name: "Projet de Fin d'Études & Stage Professionnel", code: "INF601", semester: 6 },

        // Math-Info UL (prog-5)
        { id: "course-13", program_id: "prog-5", name: "Analyse Mathématique I (Suites & Séries)", code: "MAT101", semester: 1 },
        { id: "course-14", program_id: "prog-5", name: "Analyse Mathématique II & Équations Différentielles", code: "MAT201", semester: 2 },
        { id: "course-15", program_id: "prog-5", name: "Probabilités & Statistiques Inférentielles", code: "MAT301", semester: 3 },

        // FASEG UL (prog-6)
        { id: "course-16", program_id: "prog-6", name: "Microéconomie Appliquée & Marchés", code: "ECO102", semester: 2 },
        { id: "course-17", program_id: "prog-6", name: "Macroéconomie & Politiques Monétaires", code: "ECO201", semester: 3 },
        { id: "course-18", program_id: "prog-6", name: "Comptabilité Générale & Analytique", code: "GES101", semester: 1 },

        // Génie Électrique (prog-2)
        { id: "course-19", program_id: "prog-2", name: "Électronique Numérique & Microprocesseurs", code: "ELC301", semester: 4 },
        { id: "course-20", program_id: "prog-2", name: "Traitement du Signal & Télécoms", code: "TEL401", semester: 5 }
    ];

    const initialDocuments = [
        {
            id: "doc-algo-2026",
            title: "Algorithmique Avancée & Graphes — Examen Corrigé 2026",
            category: "Examen/Annales",
            academic_year: "2025-2026",
            course_id: "course-5",
            course: "Structures de Données Avancées & Graphes",
            semester: 2,
            degree_type: "Licence Professionnelle",
            program: "Génie Logiciel & Systèmes d'Information",
            institution: "ENP Campus Lomé",
            uploaded_by: "user-academic",
            uploader_name: "Kossi Tech",
            file_size: 2411724,
            file_name: "Examen_Algo_Avancee_2026.pdf",
            status: "approved",
            is_public: true,
            downloads_count: 142,
            views_count: 580,
            created_at: "2026-02-14T09:30:00Z"
        },
        {
            id: "doc-sql-2026",
            title: "Bases de Données & Modélisation UML/SQL — Support de Cours Complet",
            category: "Support de Cours",
            academic_year: "2025-2026",
            course_id: "course-6",
            course: "Bases de Données Relationnelles & SQL",
            semester: 3,
            degree_type: "Licence Professionnelle",
            program: "Génie Logiciel & Systèmes d'Information",
            institution: "ENP Campus Lomé",
            uploaded_by: "user-academic",
            uploader_name: "Kossi Tech",
            file_size: 4194304,
            file_name: "Support_BDD_SQL_UML.pdf",
            status: "approved",
            is_public: true,
            downloads_count: 89,
            views_count: 310,
            created_at: "2026-02-18T14:15:00Z"
        },
        {
            id: "doc-math-2026",
            title: "Analyse II : Séries, Intégrales Multiples & Corrigés TD",
            category: "TD/TP",
            academic_year: "2025-2026",
            course_id: "course-14",
            course: "Analyse Mathématique II & Équations Différentielles",
            semester: 2,
            degree_type: "Licence Fondamentale",
            program: "Mathématiques & Informatique Fondamentale",
            institution: "Université de Lomé",
            uploaded_by: "user-academic",
            uploader_name: "Ami A.",
            file_size: 1845120,
            file_name: "TD_Analyse_II_Corriges.pdf",
            status: "approved",
            is_public: true,
            downloads_count: 215,
            views_count: 720,
            created_at: "2026-01-28T11:00:00Z"
        },
        {
            id: "doc-elec-2026",
            title: "Fiche de Révision Synthétique : Circuits Logiques & Bascules",
            category: "Fiche de révision",
            academic_year: "2025-2026",
            course_id: "course-19",
            course: "Électronique Numérique & Microprocesseurs",
            semester: 4,
            degree_type: "Diplôme d'Ingénieur",
            program: "Génie Électrique & Télécommunications",
            institution: "ENP Campus Lomé",
            uploaded_by: "user-academic",
            uploader_name: "Kossi Tech",
            file_size: 940000,
            file_name: "Fiche_Circuits_Logiques.pdf",
            status: "approved",
            is_public: true,
            downloads_count: 67,
            views_count: 240,
            created_at: "2026-03-02T16:20:00Z"
        },
        {
            id: "doc-eco-2026",
            title: "Microéconomie : Théorie du Consommateur & Exercices Types",
            category: "TD/TP",
            academic_year: "2025-2026",
            course_id: "course-16",
            course: "Microéconomie Appliquée & Marchés",
            semester: 2,
            degree_type: "Licence Fondamentale",
            program: "Sciences Économiques & Gestion (FASEG)",
            institution: "Université de Lomé",
            uploaded_by: "user-academic",
            uploader_name: "Koffi M.",
            file_size: 1520000,
            file_name: "Microeconomie_Consommateur_TD.pdf",
            status: "approved",
            is_public: true,
            downloads_count: 112,
            views_count: 430,
            created_at: "2026-02-25T10:00:00Z"
        }
    ];

    const initialNotifications = [
        {
            id: "notif-1",
            title: "Bienvenue sur EduVault — Le coffre-fort académique universitaire 2026 !",
            type: "welcome",
            document_id: null,
            created_at: "2026-03-01T08:00:00Z",
            is_read: false
        },
        {
            id: "notif-2",
            title: "Nouveau document disponible : Examen Corrigé Algorithmique Avancée S3.",
            type: "new_document",
            document_id: "doc-algo-2026",
            created_at: "2026-03-02T11:30:00Z",
            is_read: false
        }
    ];

    // Synchronisation automatique des nouveaux établissements et filières avec le cache local existant
    const syncInitialData = (state) => {
        if (!state) return state;
        let modified = false;
        if (!Array.isArray(state.institutions)) { state.institutions = []; modified = true; }
        if (!Array.isArray(state.programs)) { state.programs = []; modified = true; }
        if (!Array.isArray(state.courses)) { state.courses = []; modified = true; }
        if (!Array.isArray(state.documents)) { state.documents = []; modified = true; }

        initialInstitutions.forEach((initInst) => {
            const exists = state.institutions.find((i) => i.id === initInst.id || (i.name && i.name.toLowerCase() === initInst.name.toLowerCase()));
            if (!exists) {
                state.institutions.push(initInst);
                modified = true;
            } else {
                if (initInst.sector && exists.sector !== initInst.sector) {
                    exists.sector = initInst.sector;
                    modified = true;
                }
                if (initInst.description && !exists.description) {
                    exists.description = initInst.description;
                    modified = true;
                }
            }
        });

        initialPrograms.forEach((initProg) => {
            const exists = state.programs.find((p) => p.id === initProg.id || (p.institution_id === initProg.institution_id && p.name.toLowerCase() === initProg.name.toLowerCase()));
            if (!exists) {
                state.programs.push(initProg);
                modified = true;
            }
        });

        initialCourses.forEach((initCourse) => {
            const exists = state.courses.find((c) => c.id === initCourse.id || (c.program_id === initCourse.program_id && c.name.toLowerCase() === initCourse.name.toLowerCase()));
            if (!exists) {
                state.courses.push(initCourse);
                modified = true;
            }
        });

        if (modified) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) {
                console.warn("Storage sync save error:", e);
            }
        }
        return state;
    };

    // Initialisation du storage
    const loadState = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                const initial = {
                    institutions: initialInstitutions,
                    programs: initialPrograms,
                    courses: initialCourses,
                    documents: initialDocuments
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
                return initial;
            }
            const parsed = JSON.parse(raw);
            return syncInitialData(parsed);
        } catch {
            return {
                institutions: initialInstitutions,
                programs: initialPrograms,
                courses: initialCourses,
                documents: initialDocuments
            };
        }
    };

    const saveState = (state) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn("Storage full or unavailable", e);
        }
    };

    // ==================== AUTHENTIFICATION & STATUT CONNECTÉ ====================
    const isLoggedIn = () => {
        try {
            return localStorage.getItem(AUTH_KEY) === "active";
        } catch {
            return false;
        }
    };

    const isExplorationMode = () => {
        return !isLoggedIn();
    };

    const getCurrentUserProfile = () => {
        try {
            const raw = localStorage.getItem(USER_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
            return {
                id: "user-student",
                name: "Étudiant Universitaire",
                email: "etudiant@eduvault.tg",
                institution: "ENP Campus Lomé",
                institution_id: "inst-1",
                program: "Génie Logiciel & Systèmes d'Information",
                program_id: "prog-1",
                level: "Licence 3",
                bio: "Étudiant à Lomé, partage et consultation de documents académiques.",
                avatar: "E",
                joined_year: "2026"
            };
        } catch {
            return {
                id: "user-student",
                name: "Étudiant Universitaire",
                email: "etudiant@eduvault.tg",
                institution: "ENP Campus Lomé",
                level: "Licence 3"
            };
        }
    };

    const loginUser = (profileData = {}) => {
        try {
            localStorage.setItem(AUTH_KEY, "active");
            const current = getCurrentUserProfile();
            const updated = {
                ...current,
                ...profileData,
                id: profileData.id || current.id || `user-${Date.now()}`
            };
            localStorage.setItem(USER_KEY, JSON.stringify(updated));
            document.dispatchEvent(new CustomEvent("eduvault:auth_state_changed", { detail: { isLoggedIn: true, profile: updated } }));
            return updated;
        } catch (e) {
            console.warn("Could not save login", e);
            return null;
        }
    };

    const saveUserProfile = (profile) => {
        return loginUser(profile);
    };

    const logoutUser = () => {
        try {
            localStorage.removeItem(AUTH_KEY);
            document.dispatchEvent(new CustomEvent("eduvault:auth_state_changed", { detail: { isLoggedIn: false } }));
            document.dispatchEvent(new CustomEvent("eduvault:logout"));
        } catch (e) {
            console.warn("Could not logout", e);
        }
    };

    const setExplorationMode = (enable = true) => {
        if (enable) {
            logoutUser();
        } else {
            loginUser();
        }
    };

    // Gestion des notifications
    const getNotifications = () => {
        try {
            const raw = localStorage.getItem(NOTIF_KEY);
            if (!raw) {
                localStorage.setItem(NOTIF_KEY, JSON.stringify(initialNotifications));
                return initialNotifications;
            }
            return JSON.parse(raw);
        } catch {
            return initialNotifications;
        }
    };

    const saveNotifications = (list) => {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
        updateBadgeUI();
    };

    const markNotificationAsRead = (id) => {
        const list = getNotifications().map((item) => item.id === id ? { ...item, is_read: true } : item);
        saveNotifications(list);
        return list;
    };

    const markAllNotificationsAsRead = () => {
        const list = getNotifications().map((item) => ({ ...item, is_read: true }));
        saveNotifications(list);
        return list;
    };

    const deleteNotification = (id) => {
        const list = getNotifications().filter((item) => item.id !== id);
        saveNotifications(list);
        return list;
    };

    const updateBadgeUI = () => {
        const list = getNotifications();
        const unreadCount = list.filter((n) => !n.is_read).length;
        document.querySelectorAll("#notification-count, .notification-count").forEach((badge) => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
                badge.hidden = false;
                badge.removeAttribute("hidden");
                badge.style.display = "grid";
            } else {
                badge.hidden = true;
                badge.style.display = "none";
            }
        });
    };

    // Normalisation des noms pour éviter les doublons d'établissements
    const normalizeName = (str = "") => {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    };

    const checkInstitutionExists = (name) => {
        if (!name || !name.trim()) return null;
        const normalized = normalizeName(name);
        const state = loadState();
        return state.institutions.find((inst) => {
            const instNorm = normalizeName(inst.name);
            return instNorm === normalized || 
                   (normalized.length > 5 && instNorm.includes(normalized)) ||
                   (instNorm.length > 5 && normalized.includes(instNorm));
        }) || null;
    };

    const addInstitution = (name, city = "Lomé", country = "Togo", description = "") => {
        const trimmed = name.trim();
        const existing = checkInstitutionExists(trimmed);
        if (existing) {
            throw new Error(`L'établissement « ${existing.name} » existe déjà dans EduVault. Veuillez le sélectionner dans la liste.`);
        }
        const state = loadState();
        const newInst = {
            id: `inst-${Date.now()}`,
            name: trimmed,
            city: city.trim() || "Lomé",
            country: country.trim() || "Togo",
            description: description.trim()
        };
        state.institutions.push(newInst);
        saveState(state);
        return newInst;
    };

    // ==================== GESTION DE LA HIÉRARCHIE ACADÉMIQUE ====================
    const getDegreeTypes = () => initialDegreeTypes;

    const getDegreesByInstitution = (institutionIdentifier) => {
        const state = loadState();
        if (!institutionIdentifier) return initialDegreeTypes;
        const inst = state.institutions.find((i) => i.id === institutionIdentifier || i.name.toLowerCase() === institutionIdentifier.toLowerCase());
        const progs = inst ? state.programs.filter((p) => p.institution_id === inst.id) : state.programs;
        const availableDegrees = Array.from(new Set(progs.map(p => p.degree_type || "Licence Professionnelle")));
        return availableDegrees.length > 0 ? availableDegrees : initialDegreeTypes;
    };

    const getProgramsByInstitutionAndDegree = (institutionIdentifier, degreeType) => {
        const state = loadState();
        let progs = state.programs;
        if (institutionIdentifier) {
            const inst = state.institutions.find((i) => i.id === institutionIdentifier || i.name.toLowerCase() === institutionIdentifier.toLowerCase());
            if (inst) {
                progs = progs.filter((p) => p.institution_id === inst.id);
            }
        }
        if (degreeType) {
            progs = progs.filter((p) => (p.degree_type || "").toLowerCase() === degreeType.toLowerCase() || (p.degree || "").toLowerCase().includes(degreeType.toLowerCase()));
        }
        return progs;
    };

    const getProgramsByInstitution = (institutionIdentifier) => {
        const state = loadState();
        if (!institutionIdentifier) return state.programs;
        const inst = state.institutions.find((i) => i.id === institutionIdentifier || i.name.toLowerCase() === institutionIdentifier.toLowerCase());
        if (!inst) {
            return state.programs.filter((p) => {
                const parentInst = state.institutions.find(i => i.id === p.institution_id);
                return parentInst && parentInst.name.toLowerCase().includes(institutionIdentifier.toLowerCase());
            });
        }
        return state.programs.filter((p) => p.institution_id === inst.id);
    };

    const getSemestersForProgram = (programIdentifier) => {
        const state = loadState();
        const prog = state.programs.find((p) => p.id === programIdentifier || p.name.toLowerCase() === programIdentifier?.toLowerCase());
        if (prog?.degree_type?.includes("Master")) {
            return [1, 2, 3, 4];
        }
        if (prog?.degree_type?.includes("Ingénieur")) {
            return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        }
        return [1, 2, 3, 4, 5, 6]; // Licence standard L1 à L3 (S1 à S6)
    };

    const getCoursesByProgramAndSemester = (programIdentifier, semesterNumber) => {
        const state = loadState();
        let courses = state.courses;
        if (programIdentifier) {
            const prog = state.programs.find((p) => p.id === programIdentifier || p.name.toLowerCase() === programIdentifier.toLowerCase());
            if (prog) {
                courses = courses.filter((c) => c.program_id === prog.id);
            }
        }
        if (semesterNumber) {
            const semNum = parseInt(semesterNumber, 10);
            courses = courses.filter((c) => c.semester === semNum);
        }
        return courses;
    };

    const getCoursesByProgram = (programIdentifier) => {
        return getCoursesByProgramAndSemester(programIdentifier, null);
    };

    // Création dynamique d'une nouvelle matière / cours
    const addCourse = ({ name, program_id, semester = 1, code = null }) => {
        const state = loadState();
        const trimmedName = name.trim();
        const existing = state.courses.find(c => c.name.toLowerCase() === trimmedName.toLowerCase() && (!program_id || c.program_id === program_id));
        if (existing) return existing;

        const generatedCode = code || `${trimmedName.slice(0, 3).toUpperCase()}${semester}0${(state.courses.length % 9) + 1}`;
        const newCourse = {
            id: `course-${Date.now()}`,
            program_id: program_id || "prog-1",
            name: trimmedName,
            code: generatedCode,
            semester: parseInt(semester, 10) || 1
        };
        state.courses.push(newCourse);
        saveState(state);
        return newCourse;
    };

    const addProgram = (name, institutionId, degreeType = "Licence Professionnelle", degree = "Licence Professionnelle (BAC+3)") => {
        const state = loadState();
        const trimmedName = name.trim();
        const duplicate = state.programs.find((program) =>
            program.institution_id === institutionId && program.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (!trimmedName || duplicate) return null;
        const newProg = {
            id: `prog-${Date.now()}`,
            institution_id: institutionId,
            name: trimmedName,
            degree_type: degreeType,
            degree: degree.trim()
        };
        state.programs.push(newProg);
        saveState(state);
        return newProg;
    };

    // Récupérer un document par son identifiant
    const getDocumentById = (docId) => {
        const state = loadState();
        return state.documents.find((d) => d.id === docId) || null;
    };

    // Ajout d'un document (asynchrone pour persistance garantie)
    const addDocument = async (docData) => {
        const state = loadState();
        const user = getCurrentUserProfile();
        const docId = `doc-${Date.now()}`;
        const newDoc = {
            id: docId,
            title: docData.title.trim(),
            category: docData.category || "Support de Cours",
            academic_year: docData.academic_year || "2025-2026",
            course_id: docData.course_id || "course-1",
            course: docData.course || "Ressource Académique",
            semester: parseInt(docData.semester, 10) || 1,
            degree_type: docData.degree_type || "Licence Professionnelle",
            program: docData.program || user.program || "Génie Logiciel & Systèmes d'Information",
            institution: docData.institution || user.institution || "ENP Campus Lomé",
            uploaded_by: user.id || "user-student",
            uploader_name: user.name || "Étudiant",
            file_size: docData.file_size || 2048576,
            file_name: docData.file_name || "document.pdf",
            file_url: docData.file_url || null,
            status: "approved",
            is_public: true,
            downloads_count: 0,
            views_count: 1,
            created_at: new Date().toISOString()
        };

        // Sauvegarder le fichier PDF réel intégralement de manière synchrone & asynchrone
        if (docData.file_data) {
            await storePdfFile(docId, docData.file_data, newDoc.file_name);
        }

        state.documents.unshift(newDoc);
        saveState(state);

        // Créer une notification
        const notifications = getNotifications();
        notifications.unshift({
            id: `notif-${Date.now()}`,
            title: `Votre document « ${newDoc.title} » (${newDoc.course}) a été publié avec succès dans la filière ${newDoc.program} !`,
            type: "upload_success",
            document_id: newDoc.id,
            created_at: new Date().toISOString(),
            is_read: false
        });
        saveNotifications(notifications);

        return newDoc;
    };

    // Suppression d'un document de l'utilisateur
    const deleteDocument = (docId) => {
        const state = loadState();
        const user = getCurrentUserProfile();
        const document = state.documents.find((item) => item.id === docId);
        if (!document || document.uploaded_by !== user.id) return false;
        const initialLength = state.documents.length;
        state.documents = state.documents.filter((item) => item.id !== docId);
        saveState(state);
        return state.documents.length < initialLength;
    };

    // Expose API
    window.EduVaultStore = {
        loadState,
        saveState,
        isLoggedIn,
        loginUser,
        logoutUser,
        isExplorationMode,
        setExplorationMode,
        getCurrentUserProfile,
        saveUserProfile,
        getNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        updateBadgeUI,
        checkInstitutionExists,
        addInstitution,
        getDegreeTypes,
        getDegreesByInstitution,
        getProgramsByInstitutionAndDegree,
        getProgramsByInstitution,
        getSemestersForProgram,
        getCoursesByProgramAndSemester,
        getCoursesByProgram,
        addCourse,
        addProgram,
        getDocumentById,
        addDocument,
        deleteDocument,
        storePdfFile,
        getPdfFile
    };

    document.addEventListener("DOMContentLoaded", () => {
        updateBadgeUI();
    });
})();
