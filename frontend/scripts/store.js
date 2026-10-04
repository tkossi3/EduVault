/* Gestionnaire de données EduVault — Stockage local réactif & passerelle Supabase/API */
(() => {
    const STORAGE_KEY = "eduvault_data_v2026";
    const USER_KEY = "eduvault_current_user_v2026";
    const NOTIF_KEY = "eduvault_notifications_v2026";

    // Données initiales enrichies (Année 2026)
    const initialInstitutions = [
        { id: "inst-1", name: "ENP Campus Lomé", city: "Lomé", country: "Togo", description: "École Nationale Polytechnique de Lomé" },
        { id: "inst-2", name: "Université de Lomé", city: "Lomé", country: "Togo", description: "FDS, FASEG, FDD, FSS" },
        { id: "inst-3", name: "Université de Kara", city: "Kara", country: "Togo", description: "Campus Universitaire de Kara" },
        { id: "inst-4", name: "École Supérieure des Affaires (ESA)", city: "Lomé", country: "Togo", description: "Management, Finance & Droit" },
        { id: "inst-5", name: "IAEC Université", city: "Lomé", country: "Togo", description: "Institut Africain d'Études Commerciales" }
    ];

    const initialPrograms = [
        { id: "prog-1", institution_id: "inst-1", name: "Génie Logiciel & Systèmes d'Information", degree: "Licence & Master Professionnel" },
        { id: "prog-2", institution_id: "inst-1", name: "Génie Électrique & Télécommunications", degree: "Diplôme d'Ingénieur" },
        { id: "prog-3", institution_id: "inst-2", name: "Mathématiques & Informatique Fondamentale", degree: "Licence Fondamentale" },
        { id: "prog-4", institution_id: "inst-2", name: "Sciences Économiques & Gestion (FASEG)", degree: "Licence d'Économie" },
        { id: "prog-5", institution_id: "inst-4", name: "Audit & Contrôle de Gestion", degree: "Master" }
    ];

    const initialCourses = [
        { id: "course-1", program_id: "prog-1", name: "Algorithmique Avancée & Structures de Données", code: "INF201", semester: 3 },
        { id: "course-2", program_id: "prog-1", name: "Bases de Données Relationnelles & SQL", code: "INF202", semester: 3 },
        { id: "course-3", program_id: "prog-1", name: "Architecture des Ordinateurs & Systèmes", code: "INF101", semester: 1 },
        { id: "course-4", program_id: "prog-2", name: "Électronique Numérique & Microprocesseurs", code: "ELC301", semester: 4 },
        { id: "course-5", program_id: "prog-3", name: "Analyse Mathématique II & Équations Différentielles", code: "MAT201", semester: 2 },
        { id: "course-6", program_id: "prog-4", name: "Microéconomie Appliquée & Marchés", code: "ECO102", semester: 2 }
    ];

    const initialDocuments = [
        {
            id: "doc-algo-2026",
            title: "Algorithmique Avancée & Graphes — Examen Corrigé 2026",
            category: "Examen/Annales",
            academic_year: "2025-2026",
            course_id: "course-1",
            course: "Algorithmique Avancée & Structures de Données",
            program: "Génie Logiciel & Systèmes d'Information",
            institution: "ENP Campus Lomé",
            uploaded_by: "user-demo",
            uploader_name: "Kossi Tech",
            file_size: 2411724,
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
            course_id: "course-2",
            course: "Bases de Données Relationnelles & SQL",
            program: "Génie Logiciel & Systèmes d'Information",
            institution: "ENP Campus Lomé",
            uploaded_by: "user-demo",
            uploader_name: "Kossi Tech",
            file_size: 4194304,
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
            course_id: "course-5",
            course: "Analyse Mathématique II & Équations Différentielles",
            program: "Mathématiques & Informatique Fondamentale",
            institution: "Université de Lomé",
            uploaded_by: "user-academic",
            uploader_name: "Ami A.",
            file_size: 1845120,
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
            course_id: "course-4",
            course: "Électronique Numérique & Microprocesseurs",
            program: "Génie Électrique & Télécommunications",
            institution: "ENP Campus Lomé",
            uploaded_by: "user-demo",
            uploader_name: "Kossi Tech",
            file_size: 940000,
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
            course_id: "course-6",
            course: "Microéconomie Appliquée & Marchés",
            program: "Sciences Économiques & Gestion (FASEG)",
            institution: "Université de Lomé",
            uploaded_by: "user-faseg",
            uploader_name: "David K.",
            file_size: 1350000,
            status: "approved",
            is_public: true,
            downloads_count: 53,
            views_count: 190,
            created_at: "2026-03-05T08:45:00Z"
        }
    ];

    const initialNotifications = [
        {
            id: "notif-1",
            title: "Votre document « Algorithmique Avancée — Examen Corrigé 2026 » a été validé et publié !",
            type: "approval",
            document_id: "doc-algo-2026",
            created_at: "2026-03-10T10:15:00Z",
            is_read: false
        },
        {
            id: "notif-2",
            title: "Nouveau document déposé pour ENP Campus Lomé : « Bases de Données & Modélisation UML »",
            type: "new_document",
            document_id: "doc-sql-2026",
            created_at: "2026-03-09T14:30:00Z",
            is_read: false
        },
        {
            id: "notif-3",
            title: "Nouvelle ressource disponible en Analyse II (Université de Lomé).",
            type: "new_document",
            document_id: "doc-math-2026",
            created_at: "2026-03-08T09:00:00Z",
            is_read: true
        }
    ];

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
            return JSON.parse(raw);
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

    // Gestion du profil utilisateur courant et mode exploration
    const AUTH_MODE_KEY = "eduvault_auth_mode_v2026";

    const isExplorationMode = () => {
        try {
            const mode = localStorage.getItem(AUTH_MODE_KEY);
            return mode === "exploration";
        } catch {
            return false;
        }
    };

    const setExplorationMode = (enable = true) => {
        try {
            if (enable) {
                localStorage.setItem(AUTH_MODE_KEY, "exploration");
            } else {
                localStorage.setItem(AUTH_MODE_KEY, "authenticated");
            }
            document.dispatchEvent(new CustomEvent("eduvault:auth_mode_changed", { detail: { isExploration: enable } }));
        } catch (e) {
            console.warn("Could not set auth mode", e);
        }
    };

    const getCurrentUserProfile = () => {
        try {
            const raw = localStorage.getItem(USER_KEY);
            if (!raw) {
                const defaultProfile = {
                    id: "user-demo",
                    name: "Kossi Tech",
                    email: "etudiant@eduvault.tg",
                    institution: "ENP Campus Lomé",
                    institution_id: "inst-1",
                    program: "Génie Logiciel & Systèmes d'Information",
                    program_id: "prog-1",
                    level: "Licence 3",
                    bio: "Étudiant passionné d'informatique, de partage de ressources académiques et d'innovation technologique à Lomé.",
                    avatar: "K",
                    joined_year: "2026"
                };
                localStorage.setItem(USER_KEY, JSON.stringify(defaultProfile));
                return defaultProfile;
            }
            return JSON.parse(raw);
        } catch {
            return {
                id: "user-demo",
                name: "Étudiant EduVault",
                email: "etudiant@eduvault.tg",
                institution: "ENP Campus Lomé",
                level: "Licence 3"
            };
        }
    };

    const saveUserProfile = (profile) => {
        const current = getCurrentUserProfile();
        const updated = { ...current, ...profile };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        setExplorationMode(false);
        document.dispatchEvent(new CustomEvent("eduvault:profile_updated", { detail: updated }));
        return updated;
    };

    const logoutUser = () => {
        setExplorationMode(true);
        document.dispatchEvent(new CustomEvent("eduvault:logout", { detail: { isExploration: true } }));
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

    // Vérification d'unicité d'établissement (ex: ENP Campus Lomé)
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

    // Ajout d'un document
    const addDocument = (docData) => {
        const state = loadState();
        const user = getCurrentUserProfile();
        const newDoc = {
            id: `doc-${Date.now()}`,
            title: docData.title.trim(),
            category: docData.category,
            academic_year: docData.academic_year || "2025-2026",
            course_id: docData.course_id || "course-1",
            course: docData.course || "Ressource Académique",
            program: docData.program || user.program || "Filière universitaire",
            institution: docData.institution || user.institution || "ENP Campus Lomé",
            uploaded_by: user.id,
            uploader_name: user.name,
            file_size: docData.file_size || 2048576,
            file_name: docData.file_name || "document.pdf",
            status: "approved", // auto-approuvé pour l'expérience fluide
            is_public: true,
            downloads_count: 0,
            views_count: 1,
            created_at: new Date().toISOString()
        };
        state.documents.unshift(newDoc);
        saveState(state);

        // Créer une notification
        const notifications = getNotifications();
        notifications.unshift({
            id: `notif-${Date.now()}`,
            title: `Votre document « ${newDoc.title} » a été publié avec succès dans le coffre académique !`,
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
        const initialLength = state.documents.length;
        state.documents = state.documents.filter((d) => d.id !== docId);
        saveState(state);
        return state.documents.length < initialLength;
    };

    // Expose API
    window.EduVaultStore = {
        loadState,
        saveState,
        isExplorationMode,
        setExplorationMode,
        logoutUser,
        getCurrentUserProfile,
        saveUserProfile,
        getNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        updateBadgeUI,
        checkInstitutionExists,
        addInstitution,
        addDocument,
        deleteDocument
    };

    document.addEventListener("DOMContentLoaded", () => {
        updateBadgeUI();
    });
})();
