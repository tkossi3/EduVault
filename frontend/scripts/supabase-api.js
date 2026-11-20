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

    const check = ({ data, error }, detail, status = 503) => {
        if (error) {
            console.error(detail, error);
            if (error.code === "23505") throw new ApiError(409, "Cet élément existe déjà.");
            if (error.code === "42501") throw new ApiError(403, "Action non autorisée pour ce compte.");
            throw new ApiError(status, detail);
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
        const [institutions, programs, courses] = await Promise.all([
            client.from("institutions").select("id,name,city,country,description,sector,aliases,verification,website").order("name"),
            client.from("programs").select("id,name,degree,institution_id,is_listed,verification,source_url").eq("is_listed", true).order("name"),
            client.from("courses").select("id,name,code,semester,program_id,is_demo").eq("is_demo", false).order("semester")
        ]);
        return {
            institutions: check(institutions, "Catalogue indisponible."),
            programs: check(programs, "Catalogue indisponible."),
            courses: check(courses, "Catalogue indisponible.")
        };
    };

    const listCourses = async () => check(
        await client.from("courses")
            .select("id,name,code,semester,program_id,programs!inner(name,is_listed,institutions(name))")
            .eq("is_demo", false).eq("programs.is_listed", true).order("name").limit(500),
        "Liste des cours indisponible."
    );

    const createCourse = async (payload) => {
        await requireUser();
        const name = cleanName(payload.name);
        const semester = parseInt(payload.semester, 10);
        if (name.length < 2) throw new ApiError(422, "Le nom doit contenir au moins 2 caractères.");
        if (!(semester >= 1 && semester <= 10)) throw new ApiError(422, "Semestre invalide.");
        const existing = check(
            await client.from("courses").select("id,name,code,semester,program_id")
                .eq("program_id", payload.program_id).eq("semester", semester),
            "Impossible de vérifier les cours existants."
        );
        const duplicate = existing.find((course) => sameName(course.name, name));
        if (duplicate) return { duplicate: true, course: duplicate };
        const created = check(
            await client.from("courses").insert({
                program_id: payload.program_id,
                name,
                semester,
                code: payload.code ? String(payload.code).trim() || null : null
            }).select("id,name,code,semester,program_id").single(),
            "Impossible d'ajouter le cours au catalogue."
        );
        return { duplicate: false, course: created };
    };

    const courseDocuments = async (courseId) => check(
        await client.from("documents")
            .select("id,title,category,academic_year,file_size,created_at")
            .eq("course_id", courseId).eq("is_public", true).eq("status", "approved")
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
        if (!courseId) throw new ApiError(422, "Choisissez une matière.");
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

    // ==================== ROUTEUR ====================
    const route = async (method, pathname, params, init) => {
        let match;
        if (method === "GET" && pathname === "/catalog") return getCatalog();
        if (method === "GET" && pathname === "/catalog/courses") return listCourses();
        if (method === "POST" && pathname === "/catalog/courses") {
            const result = await createCourse(readBody(init));
            if (result.duplicate) throw new ApiError(409, "Ce cours existe déjà dans ce semestre.");
            return [result.course, 201];
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
        throw new ApiError(404, `Route inconnue : ${method} ${pathname}`);
    };

    const apiFetch = async (path, init = {}) => {
        const method = (init.method || "GET").toUpperCase();
        if (config.API_AVAILABLE) {
            return fetch(`${config.API_BASE_URL}${path}`, init);
        }
        if (!client) {
            return jsonResponse({ detail: "Supabase n'est pas configuré (frontend/scripts/config.js)." }, 503);
        }
        const url = new URL(path, window.location.origin);
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

    window.EduVaultApi = { fetch: apiFetch, client };
})();
