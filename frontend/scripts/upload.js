/* Gestion du téléversement hiérarchique et intégration lecteur PDF — EduVault 2026 */
(() => {
    const form = document.querySelector("#upload-form");
    const feedback = document.querySelector("#upload-feedback");
    const dropzone = document.querySelector("#dropzone");
    const fileInput = document.querySelector("#upload-file");
    const fileInfo = document.querySelector("#dropzone-file-info");

    const instSelect = document.querySelector("#upload-institution");
    const degreeSelect = document.querySelector("#upload-degree");
    const progSelect = document.querySelector("#upload-program");
    const semSelect = document.querySelector("#upload-semester");
    const courseInput = document.querySelector("#upload-course-input");
    const courseDatalist = document.querySelector("#course-suggestions");
    const courseSelect = document.querySelector("#upload-course-select");
    const customCourseInput = document.querySelector("#upload-course-custom");
    const toggleNewCourseBtn = document.querySelector("#btn-toggle-new-course");
    const yearInput = document.querySelector("#upload-year");

    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;
    const config = window.EDUVAULT_CONFIG || {};

    let selectedFile = null;
    let fileDataUrl = null;
    let remoteCatalog = null;

    const currentAcademicYear = () => {
        const year = new Date().getFullYear();
        return `${year}-${year + 1}`;
    };

    if (yearInput) yearInput.value = currentAcademicYear();

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);

    const readFileAsDataUrl = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    };

    // 1. Charger les suggestions de matières du semestre et de la filière
    const populateCourses = () => {
        if (!store) return;
        const selectedProg = progSelect?.value;
        const selectedSemester = semSelect?.value || 1;

        const courses = remoteCatalog
            ? remoteCatalog.courses.filter((course) => course.program_id === selectedProg && course.semester === parseInt(selectedSemester, 10))
            : store.getCoursesByProgramAndSemester(selectedProg, selectedSemester);

        // Alimentation du datalist pour la saisie intuitive
        if (courseDatalist) {
            courseDatalist.innerHTML = (courses || []).map((c) => `
                <option value="${c.name}">${c.code ? `[${c.code}] ` : ''}${c.name}</option>
            `).join("");
        }

        // Support rétrocompatible pour ancien select s'il existe
        if (courseSelect) {
            if (!courses || courses.length === 0) {
                courseSelect.innerHTML = `<option value="__NEW__">+ Créer une nouvelle matière...</option>`;
            } else {
                courseSelect.innerHTML = courses.map((c) => `
                    <option value="${c.name}" data-id="${c.id}">${c.code ? `[${c.code}] ` : ''}${c.name}</option>
                `).join("") + `<option value="__NEW__">+ Créer une nouvelle matière...</option>`;
            }
        }
    };

    // 2. Charger les semestres selon la filière
    const populateSemesters = () => {
        if (!semSelect || !store) return;
        const selectedProg = progSelect?.value;
        const semesters = remoteCatalog
            ? Array.from(new Set(remoteCatalog.courses.filter((course) => course.program_id === selectedProg).map((course) => course.semester))).sort((a, b) => a - b)
            : store.getSemestersForProgram(selectedProg);
        const currentProgram = remoteCatalog?.programs.find((program) => program.id === selectedProg);
        const remoteDegree = currentProgram?.degree || "";
        const defaultSemesterCount = /ingénieur/i.test(remoteDegree) ? 10 : /master/i.test(remoteDegree) ? 4 : 6;
        const semesterOptions = semesters.length
            ? semesters
            : remoteCatalog
                ? Array.from({ length: defaultSemesterCount }, (_, index) => index + 1)
                : store.getSemestersForProgram(selectedProg);

        const currentVal = semSelect.value || "1";
        semSelect.innerHTML = semesterOptions.map((s) => `
            <option value="${s}">Semestre ${s} (S${s})</option>
        `).join("");

        if (semesterOptions.includes(parseInt(currentVal, 10))) {
            semSelect.value = currentVal;
        } else {
            semSelect.value = "1";
        }

        populateCourses();
    };

    // 3. Charger les filières selon l'établissement et le cycle
    const populatePrograms = () => {
        if (!progSelect || !store || !instSelect) return;
        const selectedOption = instSelect.selectedOptions[0];
        const instId = selectedOption?.dataset.id;
        const instName = instSelect.value;
        const degreeType = degreeSelect?.value || "";

        let programs = remoteCatalog
            ? remoteCatalog.programs.filter((program) =>
                program.institution_id === instId && (!program.degree || program.degree === degreeType || program.degree === "Licence / Master")
            )
            : store.getProgramsByInstitutionAndDegree(instId || instName, degreeType);

        if (!remoteCatalog && (!programs || !programs.length)) {
            programs = store.getProgramsByInstitution(instId || instName);
        }

        if (!programs || !programs.length) {
            progSelect.innerHTML = remoteCatalog
                ? `<option value="" disabled selected>Aucune filière enregistrée</option>`
                : `<option value="Génie Logiciel & Systèmes d'Information">Génie Logiciel & Systèmes d'Information</option><option value="__NEW__">+ Ajouter une nouvelle filière...</option>`;
        } else {
            progSelect.innerHTML = programs.map((p) => `
                <option value="${remoteCatalog ? p.id : p.name}" data-id="${p.id}">${escapeHtml(p.name)}</option>
            `).join("") + (remoteCatalog ? "" : `<option value="__NEW__">+ Ajouter une nouvelle filière...</option>`);
        }

        populateSemesters();
    };

    // 4. Charger les établissements
    const populateInstitutions = () => {
        if (!instSelect || !store) return;
        const userProfile = store.getCurrentUserProfile();
        const institutions = remoteCatalog ? remoteCatalog.institutions : store.loadState().institutions;

        instSelect.innerHTML = institutions.map((inst) => `
            <option value="${inst.name}" data-id="${inst.id}" ${inst.name === userProfile.institution ? 'selected' : ''}>
                ${inst.name} (${inst.city || "Lomé"})
            </option>
        `).join("") + (remoteCatalog ? "" : `<option value="__NEW__">+ Ajouter un nouvel établissement...</option>`);

        populatePrograms();

        if (userProfile.program && progSelect) {
            const options = Array.from(progSelect.options);
            const match = options.find((o) => o.value === userProfile.program || o.textContent.trim() === userProfile.program);
            if (match) {
                progSelect.value = match.value;
                populateSemesters();
            }
        }
    };

    const applyUploadContext = () => {
        const params = new URLSearchParams(location.search);
        const institutionId = params.get("institution_id");
        const programId = params.get("program_id");
        const semester = params.get("semester");
        if (institutionId && instSelect) {
            const institutionOption = Array.from(instSelect.options)
                .find((option) => option.dataset.id === institutionId);
            if (institutionOption) {
                instSelect.value = institutionOption.value;
                populatePrograms();
            }
        }
        if (programId && progSelect) {
            const programOption = Array.from(progSelect.options)
                .find((option) => option.dataset.id === programId || option.value === programId);
            if (programOption) {
                progSelect.value = programOption.value;
                populateSemesters();
            }
        }
        if (semester && semSelect && Array.from(semSelect.options).some((option) => option.value === semester)) {
            semSelect.value = semester;
            populateCourses();
        }
    };

    // Événements cascade hiérarchique
    instSelect?.addEventListener("change", () => {
        if (instSelect.value === "__NEW__") {
            const newName = prompt("Entrez le nom complet du nouvel établissement universitaire :");
            if (!newName || !newName.trim()) {
                populateInstitutions();
                return;
            }

            const trimmed = newName.trim();
            const duplicate = store.checkInstitutionExists(trimmed);
            const alertBox = document.querySelector("#institution-duplicate-alert");
            const alertDesc = document.querySelector("#duplicate-inst-desc");

            if (duplicate) {
                if (alertBox && alertDesc) {
                    alertDesc.textContent = `L'établissement « ${duplicate.name} » existe déjà dans EduVault. Nous l'avons sélectionné automatiquement.`;
                    alertBox.style.display = "flex";
                    setTimeout(() => { alertBox.style.display = "none"; }, 6000);
                }
                populateInstitutions();
                instSelect.value = duplicate.name;
                populatePrograms();
            } else {
                try {
                    const created = store.addInstitution(trimmed, "Lomé", "Togo");
                    populateInstitutions();
                    instSelect.value = created.name;
                    populatePrograms();
                    if (alertBox) alertBox.style.display = "none";
                } catch (e) {
                    alert(e.message);
                    populateInstitutions();
                }
            }
        } else {
            populatePrograms();
        }
    });

    degreeSelect?.addEventListener("change", populatePrograms);

    progSelect?.addEventListener("change", () => {
        if (progSelect.value === "__NEW__") {
            const newProgName = prompt("Entrez le nom de la nouvelle filière (ex: Génie Mécatronique) :");
            if (newProgName && newProgName.trim()) {
                const selectedInstOption = instSelect.selectedOptions[0];
                const instId = selectedInstOption?.dataset.id || "inst-1";
                const deg = degreeSelect?.value || "Licence Professionnelle";
                const createdProg = store.addProgram(newProgName.trim(), instId, deg);
                if (!createdProg) {
                    window.EduVaultAuth?.showToast("Une filière porte déjà ce nom dans cet établissement.", "error");
                    populatePrograms();
                    return;
                }
                populatePrograms();
                progSelect.value = createdProg.name;
                populateSemesters();
            } else {
                populatePrograms();
            }
        } else {
            populateSemesters();
        }
    });

    semSelect?.addEventListener("change", populateCourses);

    courseSelect?.addEventListener("change", () => {
        if (courseSelect.value === "__NEW__") {
            if (customCourseInput) {
                customCourseInput.style.display = "block";
                customCourseInput.required = true;
                customCourseInput.focus();
            }
        } else {
            if (customCourseInput) {
                customCourseInput.style.display = "none";
                customCourseInput.required = false;
            }
        }
    });

    toggleNewCourseBtn?.addEventListener("click", () => {
        if (!customCourseInput) return;
        const isHidden = customCourseInput.style.display === "none" || !customCourseInput.style.display;
        customCourseInput.style.display = isHidden ? "block" : "none";
        customCourseInput.required = isHidden;
        if (isHidden) {
            customCourseInput.focus();
            if (courseSelect) courseSelect.value = "__NEW__";
        }
    });

    // Gestion du fichier PDF
    if (dropzone && fileInput) {
        dropzone.addEventListener("click", () => fileInput.click());

        dropzone.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInput.click();
            }
        });

        ["dragenter", "dragover"].forEach((eventName) => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add("dragover");
            });
        });

        ["dragleave", "drop"].forEach((eventName) => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove("dragover");
            });
        });

        dropzone.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files[0]) {
                handleFile(files[0]);
            }
        });

        fileInput.addEventListener("change", () => {
            if (fileInput.files && fileInput.files[0]) {
                handleFile(fileInput.files[0]);
            }
        });
    }

    const handleFile = async (file) => {
        if (!file) return;
        selectedFile = null;
        fileDataUrl = null;
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            if (feedback) {
                feedback.className = "form-feedback";
                feedback.textContent = "Seuls les fichiers PDF sont acceptés pour la bibliothèque académique.";
            }
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            if (feedback) {
                feedback.className = "form-feedback";
                feedback.textContent = "Le fichier dépasse la taille maximale autorisée de 20 Mo.";
            }
            return;
        }

        selectedFile = file;
        const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " Mo";

        if (!remoteCatalog) {
            try {
                fileDataUrl = await readFileAsDataUrl(file);
            } catch (e) {
                console.error("Lecture du fichier impossible :", e);
                selectedFile = null;
                if (feedback) {
                    feedback.className = "form-feedback";
                    feedback.textContent = "Le fichier sélectionné ne peut pas être lu.";
                }
                return;
            }
        }

        if (fileInfo) {
            fileInfo.innerHTML = `
                ${icons?.checkCircle || '✓'}
                <span>${escapeHtml(file.name)} (${sizeFormatted})</span>
            `;
            fileInfo.style.display = "inline-flex";
        }

        if (feedback) feedback.textContent = "";

        const titleInput = document.querySelector("#upload-title");
        if (titleInput && !titleInput.value) {
            const rawName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
            titleInput.value = rawName;
        }
    };

    // Soumission du formulaire
    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const fileToUpload = selectedFile || (fileInput?.files ? fileInput.files[0] : null);

        if (!fileToUpload) {
            feedback.className = "form-feedback";
            feedback.textContent = "Veuillez sélectionner un fichier PDF à déposer.";
            return;
        }
        if ((fileToUpload.type !== "application/pdf" && !fileToUpload.name.toLowerCase().endsWith(".pdf")) ||
            fileToUpload.size > 20 * 1024 * 1024) {
            feedback.className = "form-feedback";
            feedback.textContent = fileToUpload.size > 20 * 1024 * 1024
                ? "Le fichier dépasse la taille maximale autorisée de 20 Mo."
                : "Seuls les fichiers PDF sont acceptés pour la bibliothèque académique.";
            return;
        }

        const formData = new FormData(form);
        const title = formData.get("title")?.trim() || fileToUpload.name.replace(/\.[^/.]+$/, "");
        const institution = formData.get("institution") || "École Polytechnique de Lomé (EPL)";
        const degreeType = formData.get("degree_type") || "Licence Professionnelle";
        const program = progSelect?.value || "Génie Logiciel & Systèmes d'Information";
        const semester = parseInt(formData.get("semester") || "1", 10);
        const category = formData.get("category") || "Support de Cours";
        const academicYear = formData.get("academic_year") || currentAcademicYear();

        // Récupération et enregistrement de la matière
        let courseName = formData.get("course")?.trim() || courseInput?.value?.trim() || customCourseInput?.value?.trim() || courseSelect?.value || "";

        if (courseName === "__NEW__") {
            courseName = customCourseInput?.value?.trim() || "";
        }

        if (!courseName) {
            feedback.className = "form-feedback";
            feedback.textContent = "Veuillez renseigner le nom de la matière ou unité d'enseignement.";
            return;
        }

        const selectedProgOption = progSelect?.selectedOptions ? progSelect.selectedOptions[0] : null;
        const progId = selectedProgOption?.dataset?.id || selectedProgOption?.value || "prog-1";

        if (remoteCatalog) {
            const course = remoteCatalog.courses.find((item) =>
                item.program_id === progId &&
                item.semester === semester &&
                item.name.trim().toLowerCase() === courseName.toLowerCase()
            );
            if (!course) {
                feedback.className = "form-feedback";
                feedback.textContent = "Choisissez une matière déjà enregistrée pour cette filière et ce semestre.";
                return;
            }

            const session = await window.EduVaultAuth?.getSession();
            if (!session?.access_token) {
                feedback.className = "form-feedback";
                feedback.textContent = "Connectez-vous avec Supabase pour déposer un document.";
                window.EduVaultAuth?.open("login", "Connectez-vous pour déposer votre document dans la bibliothèque.");
                return;
            }

            feedback.className = "form-feedback";
            feedback.textContent = "Envoi du PDF en cours…";
            const uploadData = new FormData();
            uploadData.append("title", title);
            uploadData.append("category", category);
            uploadData.append("academic_year", academicYear);
            uploadData.append("course_id", course.id);
            uploadData.append("file", fileToUpload, fileToUpload.name);

            try {
                const response = await fetch(`${config.API_BASE_URL}/documents/upload`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${session.access_token}` },
                    body: uploadData
                });
                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.detail || "Le dépôt n'a pas pu être enregistré.");
                }
                const created = await response.json();
                feedback.className = "form-feedback is-success";
                feedback.textContent = `Document envoyé. Il sera visible après validation par un modérateur. Référence : ${created.id}`;
                selectedFile = null;
                fileDataUrl = null;
                if (fileInput) fileInput.value = "";
                if (fileInfo) fileInfo.style.display = "none";
                return;
            } catch (error) {
                console.error("Dépôt du document impossible :", error);
                feedback.className = "form-feedback";
                feedback.textContent = error.message || "Le service de dépôt est momentanément indisponible.";
                return;
            }
        }

        const course = store.addCourse({ name: courseName, program_id: progId, semester });
        feedback.className = "form-feedback is-success";
        feedback.textContent = "Traitement et enregistrement du document PDF dans le coffre…";

        // S'assurer que le fichier est converti en DataURL
        if (!fileDataUrl && fileToUpload) {
            try {
                fileDataUrl = await readFileAsDataUrl(fileToUpload);
            } catch (e) {
                console.error("Conversion du fichier impossible :", e);
                feedback.className = "form-feedback";
                feedback.textContent = "Le fichier sélectionné ne peut pas être lu.";
                return;
            }
        }

        const docPayload = {
            title,
            institution,
            degree_type: degreeType,
            program,
            semester,
            course: courseName,
            course_id: course.id,
            category,
            academic_year: academicYear,
            file_name: fileToUpload.name || "document.pdf",
            file_size: fileToUpload.size || 2048576,
            file_data: fileDataUrl
        };

        try {
            const created = await store.addDocument(docPayload);
            
            // Stocker également dans la clé de transition immédiate
            if (fileDataUrl) {
                sessionStorage.setItem("eduvault_active_pdf", fileDataUrl);
                sessionStorage.setItem(`eduvault_file_${created.id}`, fileDataUrl);
            }

            feedback.textContent = "Document déposé avec succès ! Ouverture immédiate du lecteur…";
            location.href = `document-view.html?id=${encodeURIComponent(created.id)}`;
        } catch (error) {
            feedback.className = "form-feedback";
            feedback.textContent = "Une erreur est survenue lors de l'enregistrement : " + error.message;
        }
    });

    const loadUploadCatalog = async () => {
        const submitButton = form?.querySelector('[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        try {
            const response = await fetch(`${config.API_BASE_URL}/catalog`);
            if (!response.ok) throw new Error(`Réponse API ${response.status}`);
            const catalog = await response.json();
            if (!Array.isArray(catalog.institutions) || !Array.isArray(catalog.programs) || !Array.isArray(catalog.courses)) {
                throw new Error("Le catalogue reçu ne respecte pas le format attendu.");
            }
            remoteCatalog = catalog;
        } catch (error) {
            console.warn("Catalogue de dépôt distant indisponible :", error);
            if (location.protocol !== "file:" && !["localhost", "127.0.0.1"].includes(location.hostname)) {
                if (feedback) {
                    feedback.className = "form-feedback";
                    feedback.textContent = "Le service de dépôt n'est pas disponible. Réessayez plus tard.";
                }
                return;
            }
        }
        populateInstitutions();
        applyUploadContext();
        if (submitButton) submitButton.disabled = false;
    };

    loadUploadCatalog();
})();