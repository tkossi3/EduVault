/* Accès direct à Supabase depuis le navigateur (sans serveur intermédiaire).
 *
 * Les pages appellent window.EduVaultApi.fetch("/catalog"), ("/documents/upload"), etc.
 * et reçoivent une Response standard. Chaque route lit ou écrit dans Supabase avec la
 * session de l'utilisateur : la sécurité est assurée par les règles RLS de la base
 * (voir supabase/eduvault.sql), jamais par ce fichier.
 *
 * Si VITE_API_BASE_URL est défini au build, les appels partent vers cette API HTTP.
 */
(() => {
    const config = window.EDUVAULT_CONFIG || {};
    const sdk = window.supabase;
    const BUCKET = "academic-documents";
    const SIGNED_URL_TTL_SECONDS = 600;
    const MAX_PDF_BYTES = 20 * 1024 * 1024;
    const CATEGORIES = new Set(["Support de Cours", "TD/TP", "Examen/Annales", "Fiche de révision"]);

    let client = null;
    const isConfigured = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY)
        && !/VOTRE-PROJECT-REF|VOTRE_CLE|your-project/.test(`${config.SUPABASE_URL}${config.SUPABASE_ANON_KEY}`);
    if (sdk?.createClient && isConfigured) {
        try {
            client = sdk.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
        } catch (error) {
            console.error("Initialisation de Supabase impossible.", error);
        }
    }
    // Un seul client partagé par toute la page (évite plusieurs sessions concurrentes).
    window.EduVaultSupabase = client;

    class ApiError extends Error {
        constructor(status, detail) {
            super(detail);
            this.status = status;
        }
    }

    const jsonResponse = (data, status = 200) => new Response(
        status === 204 ? null : JSON.stringify(data),
        { status, headers: { "Content-Type": "application/json" } }
    );

    const single = (value) => (Array.isArray(value) ? value[0] || {} : value || {});
    const cleanName = (value) => String(value || "").split(/\s+/).filter(Boolean).join(" ");
    const sameName = (a, b) => cleanName(a).toLocaleLowerCase("fr") === cleanName(b).toLocaleLowerCase("fr");
    const isUuid = (value = "") => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));

    const check = ({ data, error }, detail, status = 503) => {
        if (error) {
            console.error(detail, error);
            if (error.code === "23505") throw new ApiError(409, "Cet élément existe déjà.");
            if (error.code === "42501") throw new ApiError(403, "Action non autorisée pour ce compte.");
            if (error.code === "23503") throw new ApiError(404, "La filière ou l’établissement sélectionné est introuvable.");
            const technicalDetail = String(error.message || "").trim();
            throw new ApiError(status, technicalDetail ? `${detail} (${technicalDetail})` : detail);
        }
        return data;
    };

    const requireUser = async () => {
        const { data } = await client.auth.getSession();
        const user = data?.session?.user;
        if (!user) throw new ApiError(401, "Connectez-vous pour continuer.");
        return user;
    };

    const isModerator = (user) => user?.app_metadata?.catalog_role === "moderator";

    // Aplatit document → cours → filière → établissement pour les cartes de l'interface.
    const flattenDocument = (document) => {
        const course = single(document.courses);
        const program = single(course.programs);
        const institution = single(program.institutions);
        const { courses, ...rest } = document;
        return {
            ...rest,
            course: course.name || "",
            semester: course.semester || 1,
            program: program.name || "",
            degree_type: program.degree || "",
            institution: institution.name || ""
        };
    };
    const DOCUMENT_FIELDS = "id,title,category,academic_year,file_size,status,created_at,views_count,downloads_count,course_id,"
        + "courses(name,semester,programs(name,degree,institutions(name)))";

    const readBody = (init) => {
        if (!init?.body) return {};
        if (typeof init.body === "string") {
            try { return JSON.parse(init.body); } catch { return {}; }
        }
        return init.body;
    };

    // ==================== CATALOGUE ====================
    const getCatalog = async () => {
        const [institutions, programs, courses, linkedDocuments] = await Promise.all([
            client.from("institutions").select("id,name,city,country,description,sector,aliases,verification,website").order("name"),
            client.from("programs").select("id,name,degree,institution_id,is_listed,verification,source_url").eq("is_listed", true).order("name"),
            client.from("courses").select("id,name,code,semester,program_id,is_demo").eq("is_demo", false).order("semester"),
            client.from("documents").select("course_id,status")
        ]);
        const checkedCourses = check(courses, "Catalogue indisponible.");
        const documentCounts = new Map();
        check(linkedDocuments, "Nombre de documents indisponible.", 503).forEach((document) => {
            if (!document.course_id) return;
            const current = documentCounts.get(document.course_id) || { total: 0, approved: 0, pending: 0 };
            current.total += 1;
            if (document.status === "approved") current.approved += 1;
            if (document.status === "pending") current.pending += 1;
            documentCounts.set(document.course_id, current);
        });
        return {
            institutions: check(institutions, "Catalogue indisponible."),
            programs: check(programs, "Catalogue indisponible."),
            courses: checkedCourses.map((course) => ({
                ...course,
                document_count: documentCounts.get(course.id)?.total || 0,
                approved_document_count: documentCounts.get(course.id)?.approved || 0,
                pending_document_count: documentCounts.get(course.id)?.pending || 0
            }))
        };
    };

    const listCourses = async () => check(
        await client.from("courses")
            .select("id,name,code,semester,program_id,programs!inner(name,is_listed,institutions(name))")
            .eq("is_demo", false).eq("programs.is_listed", true).order("name").limit(500),
        "Liste des cours indisponible."
    );

    const createCourse = async (payload) => {
        const user = await requireUser();
        const name = cleanName(payload.name);
        const semester = parseInt(payload.semester, 10);
        if (name.length < 2) throw new ApiError(422, "Le nom doit contenir au moins 2 caractères.");
        if (!(semester >= 1 && semester <= 10)) throw new ApiError(422, "Semestre invalide.");
        if (!isUuid(payload.program_id)) throw new ApiError(422, "Filière invalide.");

        const program = await client.from("programs")
            .select("id,is_listed")
            .eq("id", payload.program_id)
            .maybeSingle();
        if (program.error) throw new ApiError(502, "Impossible de vérifier la filière.");
        if (!program.data || program.data.is_listed === false) throw new ApiError(422, "Filière invalide.");

        const existing = await client.from("courses").select("id,name,code,semester,program_id")
            .eq("program_id", payload.program_id).eq("semester", semester);
        if (!existing.error) {
            const duplicate = (existing.data || []).find((course) => sameName(course.name, name));
            if (duplicate) {
                const linked = await client.from("documents").select("id,status").eq("course_id", duplicate.id);
                const linkedDocuments = linked.error ? [] : (linked.data || []);
                return {
                    duplicate: true,
                    course: {
                        ...duplicate,
                        document_count: linkedDocuments.length,
                        approved_document_count: linkedDocuments.filter((document) => document.status === "approved").length,
                        pending_document_count: linkedDocuments.filter((document) => document.status === "pending").length
                    }
                };
            }
        }

        const created = check(
            await client.from("courses").insert({
                program_id: payload.program_id,
                name,
                semester,
                created_by: user.id,
                is_demo: false,
                code: payload.code ? String(payload.code).trim() || null : null
            }).select("id,name,code,semester,program_id").single(),
            "Impossible d'ajouter le cours au catalogue."
        );
        const visible = check(
            await client.from("courses").select("id,name,code,semester,program_id")
                .eq("id", created.id).eq("is_demo", false).maybeSingle(),
            "Le cours a été créé mais n'est pas visible dans le catalogue."
        );
        if (!visible) throw new ApiError(503, "Le cours n'est pas visible immédiatement dans le catalogue.");
        const linked = await client.from("documents").select("id,status").eq("course_id", visible.id);
        const linkedDocuments = linked.error ? [] : (linked.data || []);
        return {
            duplicate: false,
            course: {
                ...visible,
                document_count: linkedDocuments.length,
                approved_document_count: linkedDocuments.filter((document) => document.status === "approved").length,
                pending_document_count: linkedDocuments.filter((document) => document.status === "pending").length
            }
        };
    };

    const courseDocuments = async (courseId) => check(
        await client.from("documents")
            .select("id,title,category,academic_year,file_size,status,uploaded_by,created_at")
            .eq("course_id", courseId)
            .order("created_at", { ascending: false }).limit(50),
        "Documents du cours indisponibles."
    );

    // ==================== DEMANDES DE FILIÈRE ====================
    const listProgramRequests = async () => {
        const user = await requireUser();
        let query = client.from("program_change_requests")
            .select("id,institution_id,program_id,request_type,requested_name,requested_by,status,created_at,reviewed_at")
            .order("created_at", { ascending: false }).limit(100);
        query = isModerator(user) ? query.eq("status", "pending") : query.eq("requested_by", user.id);
        return {
            can_review: isModerator(user),
            requests: check(await query, "Impossible de charger les demandes de filière.")
        };
    };

    const createProgramRequest = async (payload) => {
        const user = await requireUser();
        const name = cleanName(payload.name);
        if (name.length < 2) throw new ApiError(422, "Le nom doit contenir au moins 2 caractères.");
        if (!["add", "rename", "delete"].includes(payload.request_type)) throw new ApiError(422, "Type de demande invalide.");
        if ((payload.request_type === "add") !== !payload.program_id) {
            throw new ApiError(422, "La filière ciblée ne correspond pas au type de demande.");
        }
        const programs = check(
            await client.from("programs").select("id,name").eq("institution_id", payload.institution_id),
            "Impossible de vérifier les filières existantes."
        );
        if (programs.some((program) => sameName(program.name, name) && program.id !== payload.program_id)) {
            throw new ApiError(409, "Une filière portant ce nom existe déjà.");
        }
        if (payload.request_type === "rename") {
            const target = programs.find((program) => program.id === payload.program_id);
            if (!target) throw new ApiError(404, "La filière à renommer est introuvable dans cet établissement.");
            if (sameName(target.name, name)) throw new ApiError(409, "Le nom proposé est déjà celui de cette filière.");
        }
        return check(
            await client.from("program_change_requests").insert({
                institution_id: payload.institution_id,
                program_id: payload.program_id || null,
                request_type: payload.request_type,
                requested_name: name,
                requested_by: user.id
            }).select().single(),
            "Impossible d'enregistrer la demande de filière."
        );
    };

    const reviewProgramRequest = async (requestId, action) => {
        const user = await requireUser();
        if (!isModerator(user)) throw new ApiError(403, "Droits de modération requis.");
        const rows = check(
            await client.rpc("review_program_change_request", { p_request_id: requestId, p_action: action }),
            "La modération n'a pas pu être enregistrée.",
            409
        );
        return single(rows);
    };

    const listInstitutionRequests = async () => {
        const user = await requireUser();
        let query = client.from("institution_change_requests")
            .select("id,institution_id,request_type,requested_name,requested_by,status,created_at,reviewed_at")
            .order("created_at", { ascending: false }).limit(100);
        query = isModerator(user) ? query : query.eq("requested_by", user.id);
        const requests = check(await query, "Impossible de charger les demandes d’établissement.");
        return { can_review: isModerator(user), requests };
    };

    const createInstitutionRequest = async (payload) => {
        const user = await requireUser();
        const name = cleanName(payload.name);
        if (name.length < 2) throw new ApiError(422, "Le nom doit contenir au moins 2 caractères.");
        if (!["add", "rename"].includes(payload.request_type)) throw new ApiError(422, "Type de demande invalide.");
        if (payload.request_type === "rename" && !payload.institution_id) throw new ApiError(422, "Établissement cible requis.");

        const institutions = check(await client.from("institutions").select("id,name"), "Impossible de vérifier les établissements.");
        if (institutions.some((institution) => sameName(institution.name, name) && institution.id !== payload.institution_id)) {
            throw new ApiError(409, "Un établissement portant ce nom existe déjà.");
        }
        return check(
            await client.from("institution_change_requests").insert({
                institution_id: payload.institution_id || null,
                request_type: payload.request_type,
                requested_name: name,
                requested_by: user.id
            }).select().single(),
            "Impossible d'enregistrer la demande d’établissement."
        );
    };

    const reviewInstitutionRequest = async (requestId, action) => {
        const user = await requireUser();
        if (!isModerator(user)) throw new ApiError(403, "Droits de modération requis.");
        const rows = check(
            await client.rpc("review_institution_change_request", { p_request_id: requestId, p_action: action }),
            "La modération n'a pas pu être enregistrée.",
            409
        );
        return single(rows);
    };

    // ==================== DOCUMENTS ====================
    const searchDocuments = async (params) => {
        const query = cleanName(params.get("q")).slice(0, 100);
        const limit = Math.max(1, Math.min(parseInt(params.get("limit") || "40", 10) || 40, 60));
        let docsQuery = client.from("documents").select(DOCUMENT_FIELDS)
            .eq("is_public", true).eq("status", "approved")
            .order("created_at", { ascending: false }).limit(limit);
        if (query) docsQuery = docsQuery.ilike("title", `%${query.replace(/[%_]/g, "")}%`);
        const documents = check(await docsQuery, "La recherche est momentanément indisponible.");
        return { documents: documents.map(flattenDocument), courses: [] };
    };

    const signedUrl = async (documentId, { download = false } = {}) => {
        const document = check(
            await client.from("documents").select("storage_path,status").eq("id", documentId).maybeSingle(),
            "Impossible de préparer la lecture du document."
        );
        // La règle RLS ne renvoie que : les documents approuvés, ceux de l'utilisateur, ou tout pour un modérateur.
        if (!document) throw new ApiError(404, "Document introuvable ou pas encore validé.");
        const { data, error } = await client.storage.from(BUCKET)
            .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS, download ? { download: true } : undefined);
        if (error || !data?.signedUrl) {
            console.error("URL signée impossible.", error);
            throw new ApiError(503, "Impossible de préparer la lecture du document.");
        }
        if (document.status === "approved") {
            client.rpc(download ? "increment_document_downloads" : "increment_document_views", { p_document_id: documentId })
                .then(({ error: counterError }) => counterError && console.warn("Compteur non mis à jour.", counterError));
        }
        return { signed_url: data.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS };
    };

    const hasPdfSignature = async (file) => {
        const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        return String.fromCharCode(...head) === "%PDF-";
    };

    const uploadDocument = async (formData) => {
        const user = await requireUser();
        const title = cleanName(formData.get("title"));
        const category = String(formData.get("category") || "");
        const academicYear = String(formData.get("academic_year") || "");
        const courseId = String(formData.get("course_id") || "");
        const file = formData.get("file");

        if (title.length < 5 || title.length > 160) throw new ApiError(422, "Le titre doit contenir entre 5 et 160 caractères.");
        if (!CATEGORIES.has(category)) throw new ApiError(422, "Catégorie de document invalide.");
        if (!/^\d{4}-\d{4}$/.test(academicYear)) throw new ApiError(422, "Année universitaire invalide (format 2025-2026).");
        if (!isUuid(courseId)) throw new ApiError(422, "Choisissez une matière valide.");
        const course = await client.from("courses").select("id").eq("id", courseId).eq("is_demo", false).maybeSingle();
        if (course.error) throw new ApiError(502, "Impossible de vérifier la matière.");
        if (!course.data) throw new ApiError(422, "Cette matière n'existe pas dans le catalogue universitaire.");
        if (!(file instanceof Blob) || !file.size) throw new ApiError(422, "Sélectionnez un fichier PDF.");
        if (file.size > MAX_PDF_BYTES) throw new ApiError(413, "Le fichier dépasse 20 Mo.");
        if (!(await hasPdfSignature(file))) throw new ApiError(415, "Le fichier ne contient pas une signature PDF valide.");

        const storagePath = `${user.id}/${crypto.randomUUID()}.pdf`;
        const { error: uploadError } = await client.storage.from(BUCKET)
            .upload(storagePath, file, { contentType: "application/pdf", upsert: false });
        if (uploadError) {
            console.error("Envoi du PDF impossible.", uploadError);
            throw new ApiError(502, "Le fichier n'a pas pu être envoyé. Réessayez.");
        }

        const { data, error } = await client.from("documents").insert({
            title,
            category,
            academic_year: academicYear,
            course_id: courseId,
            storage_path: storagePath,
            mime_type: "application/pdf",
            file_size: file.size,
            uploaded_by: user.id
        }).select("id,title,status").single();

        if (error) {
            // Évite de laisser un fichier orphelin si l'enregistrement de la fiche échoue.
            await client.storage.from(BUCKET).remove([storagePath]);
            check({ error }, "Le dépôt n'a pas pu être enregistré.", 502);
        }
        return data;
    };

    const myDocuments = async () => {
        const user = await requireUser();
        const documents = check(
            await client.from("documents").select(DOCUMENT_FIELDS)
                .eq("uploaded_by", user.id).order("created_at", { ascending: false }).limit(100),
            "Historique indisponible."
        );
        return documents.map(flattenDocument);
    };

    const deleteDocument = async (documentId) => {
        const user = await requireUser();
        const document = check(
            await client.from("documents").select("id,storage_path,uploaded_by").eq("id", documentId).maybeSingle(),
            "Impossible de vérifier la propriété du document."
        );
        if (!document || (document.uploaded_by !== user.id && !isModerator(user))) {
            throw new ApiError(404, "Document introuvable dans vos dépôts.");
        }
        const { error: storageError } = await client.storage.from(BUCKET).remove([document.storage_path]);
        if (storageError) {
            console.error("Suppression du fichier impossible.", storageError);
            throw new ApiError(502, "Le fichier n'a pas pu être supprimé du stockage.");
        }
        check(await client.from("documents").delete().eq("id", documentId), "Les informations du document n'ont pas pu être supprimées.");
        return null;
    };

    // ==================== PROFIL & PHOTO ====================
    const AVATAR_BUCKET = "avatars";
    const AVATAR_SIZE = 320;
    const PROFILE_FIELDS = ["full_name", "institution", "program", "level", "bio"];

    const googlePhoto = (user) => user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

    const getMyProfile = async () => {
        const user = await requireUser();
        let profile = check(
            await client.from("profiles").select("id,full_name,institution,program,level,bio,avatar_url").eq("id", user.id).maybeSingle(),
            "Profil indisponible."
        );
        if (!profile) {
            // Compte créé avant l'installation du déclencheur : on crée le profil maintenant.
            profile = check(
                await client.from("profiles").insert({
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.user_metadata?.name || (user.email || "").split("@")[0],
                    avatar_url: googlePhoto(user)
                }).select("id,full_name,institution,program,level,bio,avatar_url").single(),
                "Profil indisponible."
            );
        }
        return { ...profile, email: user.email || "", google_avatar_url: googlePhoto(user) };
    };

    const updateMyProfile = async (payload) => {
        const user = await requireUser();
        const changes = { updated_at: new Date().toISOString() };
        PROFILE_FIELDS.forEach((field) => {
            if (payload[field] !== undefined) changes[field] = String(payload[field] || "").trim().slice(0, field === "bio" ? 500 : 160);
        });
        return check(
            await client.from("profiles").update(changes).eq("id", user.id)
                .select("id,full_name,institution,program,level,bio,avatar_url").single(),
            "Le profil n'a pas pu être enregistré."
        );
    };

    // Recadre au centre et réduit l'image en carré JPEG (photo légère, envoi rapide).
    const resizeAvatar = async (file) => {
        const bitmap = await createImageBitmap(file).catch(() => null);
        if (!bitmap) throw new ApiError(415, "Cette image ne peut pas être lue. Utilisez une photo JPEG, PNG ou WebP.");
        const side = Math.min(bitmap.width, bitmap.height);
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        canvas.getContext("2d").drawImage(
            bitmap,
            (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
            0, 0, AVATAR_SIZE, AVATAR_SIZE
        );
        bitmap.close?.();
        return new Promise((resolve, reject) => canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new ApiError(500, "Conversion de l'image impossible."))),
            "image/jpeg",
            0.88
        ));
    };

    const uploadAvatar = async (formData) => {
        const user = await requireUser();
        const file = formData.get("file");
        if (!(file instanceof Blob) || !file.size) throw new ApiError(422, "Choisissez une image.");
        if (!/^image\//.test(file.type)) throw new ApiError(415, "Le fichier choisi n'est pas une image.");
        if (file.size > 15 * 1024 * 1024) throw new ApiError(413, "L'image dépasse 15 Mo.");
        const blob = await resizeAvatar(file);
        const path = `${user.id}/avatar.jpg`;
        const { error } = await client.storage.from(AVATAR_BUCKET)
            .upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
        if (error) {
            console.error("Envoi de la photo impossible.", error);
            throw new ApiError(502, "La photo n'a pas pu être envoyée. Réessayez.");
        }
        const publicUrl = client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
        const avatarUrl = `${publicUrl}?v=${Date.now()}`; // évite l'ancienne photo en cache
        return check(
            await client.from("profiles").update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
                .eq("id", user.id).select("avatar_url").single(),
            "La photo n'a pas pu être enregistrée."
        );
    };

    // Retire la photo personnelle : retour à la photo Google si elle existe, sinon à l'initiale.
    const resetAvatar = async () => {
        const user = await requireUser();
        await client.storage.from(AVATAR_BUCKET).remove([`${user.id}/avatar.jpg`]);
        return check(
            await client.from("profiles").update({ avatar_url: googlePhoto(user), updated_at: new Date().toISOString() })
                .eq("id", user.id).select("avatar_url").single(),
            "La photo n'a pas pu être retirée."
        );
    };

    // ==================== NOTIFICATIONS PERSONNELLES ====================
    const NOTIFICATION_FIELDS = "id,title,type,document_id,is_read,created_at";
    const listNotifications = async () => {
        const user = await requireUser();
        return check(
            await client.from("notifications").select(NOTIFICATION_FIELDS)
                .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
            "Les notifications n'ont pas pu être chargées."
        );
    };

    const markNotificationRead = async (notificationId) => {
        const user = await requireUser();
        if (!isUuid(notificationId)) throw new ApiError(422, "Notification invalide.");
        const updated = check(
            await client.from("notifications").update({ is_read: true })
                .eq("id", notificationId).eq("user_id", user.id).select(NOTIFICATION_FIELDS).maybeSingle(),
            "La notification n'a pas pu être mise à jour."
        );
        if (!updated) throw new ApiError(404, "Notification introuvable.");
        return updated;
    };

    const markAllNotificationsRead = async () => {
        const user = await requireUser();
        check(
            await client.from("notifications").update({ is_read: true })
                .eq("user_id", user.id).eq("is_read", false),
            "Les notifications n'ont pas pu être mises à jour."
        );
        return null;
    };

    const deleteNotification = async (notificationId) => {
        const user = await requireUser();
        if (!isUuid(notificationId)) throw new ApiError(422, "Notification invalide.");
        check(
            await client.from("notifications").delete()
                .eq("id", notificationId).eq("user_id", user.id),
            "La notification n'a pas pu être supprimée."
        );
        return null;
    };

    // ==================== MODÉRATION ====================
    const MODERATION_STATUSES = new Set(["pending", "approved", "rejected"]);

    const moderationDocuments = async (params) => {
        await requireUser();
        if (!(await window.EduVaultApi.isModerator())) throw new ApiError(403, "Droits de modération requis.");
        const status = MODERATION_STATUSES.has(params.get("status")) ? params.get("status") : "pending";
        const [list, counts] = await Promise.all([
            client.from("documents").select(`${DOCUMENT_FIELDS},uploaded_by,file_size`)
                .eq("status", status).order("created_at", { ascending: status === "pending" }).limit(200),
            client.from("documents").select("status")
        ]);
        const documents = check(list, "Documents à modérer indisponibles.").map(flattenDocument);
        const countByStatus = { pending: 0, approved: 0, rejected: 0 };
        check(counts, "Compteurs indisponibles.").forEach((row) => { countByStatus[row.status] = (countByStatus[row.status] || 0) + 1; });

        // Nom des auteurs (les profils sont publics en lecture).
        const authorIds = [...new Set(documents.map((document) => document.uploaded_by))];
        const authors = new Map();
        if (authorIds.length) {
            const profiles = check(
                await client.from("profiles").select("id,full_name,institution").in("id", authorIds),
                "Profils des auteurs indisponibles."
            );
            profiles.forEach((profile) => authors.set(profile.id, profile));
        }
        return {
            status,
            counts: countByStatus,
            documents: documents.map((document) => ({
                ...document,
                uploader_name: authors.get(document.uploaded_by)?.full_name || "Auteur inconnu"
            }))
        };
    };

    const moderateDocument = async (documentId, action) => {
        await requireUser();
        if (!(await window.EduVaultApi.isModerator())) throw new ApiError(403, "Droits de modération requis.");
        const status = { approve: "approved", reject: "rejected", reset: "pending" }[action];
        if (!status) throw new ApiError(422, "Action de modération invalide.");
        const updated = check(
            await client.from("documents").update({ status }).eq("id", documentId).select("id,title,status"),
            "La décision n'a pas pu être enregistrée."
        );
        if (!updated.length) {
            throw new ApiError(403, "Décision refusée par la base : reconnectez-vous pour actualiser votre rôle de modérateur.");
        }
        return updated[0];
    };

    // ==================== ROUTEUR ====================
    const route = async (method, pathname, params, init) => {
        let match;
        if (method === "GET" && pathname === "/catalog") return getCatalog();
        if (method === "GET" && pathname === "/catalog/courses") return listCourses();
        if (method === "POST" && pathname === "/catalog/courses") {
            const result = await createCourse(readBody(init));
            return [result.course, result.duplicate ? 200 : 201];
        }
        if (method === "GET" && (match = pathname.match(/^\/catalog\/courses\/([^/]+)\/documents$/))) {
            return courseDocuments(decodeURIComponent(match[1]));
        }
        if (method === "GET" && pathname === "/catalog/program-requests") return listProgramRequests();
        if (method === "POST" && pathname === "/catalog/program-requests") {
            return [await createProgramRequest(readBody(init)), 201];
        }
        if (method === "POST" && (match = pathname.match(/^\/catalog\/program-requests\/([^/]+)\/review$/))) {
            return reviewProgramRequest(decodeURIComponent(match[1]), readBody(init).action);
        }
        if (method === "GET" && pathname === "/catalog/institution-requests") return listInstitutionRequests();
        if (method === "POST" && pathname === "/catalog/institution-requests") {
            return [await createInstitutionRequest(readBody(init)), 201];
        }
        if (method === "POST" && (match = pathname.match(/^\/catalog\/institution-requests\/([^/]+)\/review$/))) {
            return reviewInstitutionRequest(decodeURIComponent(match[1]), readBody(init).action);
        }
        if (method === "GET" && pathname === "/documents/search") return searchDocuments(params);
        if (method === "POST" && pathname === "/documents/upload") return [await uploadDocument(init.body), 201];
        if (method === "GET" && pathname === "/auth/my-documents") return myDocuments();
        if (method === "GET" && (match = pathname.match(/^\/documents\/([^/]+)\/(view-url|owner-view-url|download-url)$/))) {
            return signedUrl(decodeURIComponent(match[1]), { download: match[2] === "download-url" });
        }
        if (method === "DELETE" && (match = pathname.match(/^\/documents\/([^/]+)$/))) {
            await deleteDocument(decodeURIComponent(match[1]));
            return [null, 204];
        }
        if (method === "GET" && pathname === "/profile/me") return getMyProfile();
        if (method === "PATCH" && pathname === "/profile/me") return updateMyProfile(readBody(init));
        if (method === "POST" && pathname === "/profile/avatar") return uploadAvatar(init.body);
        if (method === "DELETE" && pathname === "/profile/avatar") return resetAvatar();
        if (method === "GET" && pathname === "/notifications") return listNotifications();
        if (method === "PATCH" && pathname === "/notifications/read-all") return markAllNotificationsRead();
        if (method === "PATCH" && (match = pathname.match(/^\/notifications\/([^/]+)\/read$/))) {
            return markNotificationRead(decodeURIComponent(match[1]));
        }
        if (method === "DELETE" && (match = pathname.match(/^\/notifications\/([^/]+)$/))) {
            await deleteNotification(decodeURIComponent(match[1]));
            return [null, 204];
        }
        if (method === "GET" && pathname === "/moderation/documents") return moderationDocuments(params);
        if (method === "POST" && (match = pathname.match(/^\/moderation\/documents\/([^/]+)$/))) {
            return moderateDocument(decodeURIComponent(match[1]), readBody(init).action);
        }
        throw new ApiError(404, `Route inconnue : ${method} ${pathname}`);
    };

    const apiFetch = async (path, init = {}) => {
        const method = (init.method || "GET").toUpperCase();
        const url = new URL(path, window.location.origin);
        const isNotificationRoute = url.pathname === "/notifications" || url.pathname.startsWith("/notifications/");
        if (config.API_AVAILABLE && !isNotificationRoute) {
            return fetch(`${config.API_BASE_URL}${path}`, init);
        }
        if (!client) {
            return jsonResponse({ detail: "Supabase n'est pas configuré (frontend/scripts/config.js)." }, 503);
        }
        try {
            const result = await route(method, url.pathname, url.searchParams, init);
            const [data, status] = Array.isArray(result) && result.length === 2 && typeof result[1] === "number"
                ? result
                : [result, 200];
            return jsonResponse(data, status);
        } catch (error) {
            if (error instanceof ApiError) return jsonResponse({ detail: error.message }, error.status);
            console.error("Erreur Supabase inattendue.", error);
            return jsonResponse({ detail: "Service momentanément indisponible. Vérifiez votre connexion." }, 503);
        }
    };

    let moderatorCheck = null;
    client?.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") moderatorCheck = null;
    });

    window.EduVaultApi = {
        fetch: apiFetch,
        client,
        // Vrai si la session courante porte le rôle modérateur (app_metadata, non modifiable par l'utilisateur).
        isModerator: () => {
            moderatorCheck = moderatorCheck || (async () => {
                if (!client) return false;
                const { data } = await client.auth.getSession();
                const sessionUser = data?.session?.user;
                if (!sessionUser) return false;
                if (isModerator(sessionUser)) return true;
                // Rôle attribué après la connexion : on interroge Supabase, puis on renouvelle
                // la session pour que la base reconnaisse aussi le rôle (règles RLS).
                const { data: fresh } = await client.auth.getUser();
                if (!isModerator(fresh?.user)) return false;
                const { error } = await client.auth.refreshSession();
                if (error) console.warn("Renouvellement de session impossible.", error);
                return true;
            })().catch((error) => {
                console.warn("Vérification du rôle modérateur impossible.", error);
                moderatorCheck = null;
                return false;
            });
            return moderatorCheck;
        }
    };
})();
