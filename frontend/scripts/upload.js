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
    const courseSelect = document.querySelector("#upload-course-select");
    const customCourseInput = document.querySelector("#upload-course-custom");
    const toggleNewCourseBtn = document.querySelector("#btn-toggle-new-course");

    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;

    let selectedFile = null;
    let fileDataUrl = null;

    const readFileAsDataUrl = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    };

    // 1. Charger les matières du semestre et de la filière
    const populateCourses = () => {
        if (!courseSelect || !store) return;
        const selectedProg = progSelect?.value;
        const selectedSemester = semSelect?.value || 1;

        const courses = store.getCoursesByProgramAndSemester(selectedProg, selectedSemester);

        if (!courses || courses.length === 0) {
            courseSelect.innerHTML = `
                <option value="__NEW__">+ Créer une nouvelle matière pour le Semestre ${selectedSemester}...</option>
            `;
            if (customCourseInput) {
                customCourseInput.style.display = "block";
                customCourseInput.required = true;
            }
            return;
        }

        courseSelect.innerHTML = courses.map((c) => `
            <option value="${c.name}" data-id="${c.id}">${c.code ? `[${c.code}] ` : ''}${c.name}</option>
        `).join("") + `<option value="__NEW__">+ Créer une nouvelle matière...</option>`;

        if (customCourseInput) {
            customCourseInput.style.display = "none";
            customCourseInput.required = false;
        }
    };

    // 2. Charger les semestres selon la filière
    const populateSemesters = () => {
        if (!semSelect || !store) return;
        const selectedProg = progSelect?.value;
        const semesters = store.getSemestersForProgram(selectedProg);

        const currentVal = semSelect.value || "1";
        semSelect.innerHTML = semesters.map((s) => `
            <option value="${s}">Semestre ${s} (S${s})</option>
        `).join("");

        if (semesters.includes(parseInt(currentVal, 10))) {
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

        let programs = store.getProgramsByInstitutionAndDegree(instId || instName, degreeType);

        if (!programs || !programs.length) {
            programs = store.getProgramsByInstitution(instId || instName);
        }

        if (!programs || !programs.length) {
            progSelect.innerHTML = `<option value="Génie Logiciel & Systèmes d'Information">Génie Logiciel & Systèmes d'Information</option><option value="__NEW__">+ Ajouter une nouvelle filière...</option>`;
        } else {
            progSelect.innerHTML = programs.map((p) => `
                <option value="${p.name}" data-id="${p.id}">${p.name}</option>
            `).join("") + `<option value="__NEW__">+ Ajouter une nouvelle filière...</option>`;
        }

        populateSemesters();
    };

    // 4. Charger les établissements
    const populateInstitutions = () => {
        if (!instSelect || !store) return;
        const state = store.loadState();
        const userProfile = store.getCurrentUserProfile();

        instSelect.innerHTML = state.institutions.map((inst) => `
            <option value="${inst.name}" data-id="${inst.id}" ${inst.name === userProfile.institution ? 'selected' : ''}>
                ${inst.name} (${inst.city || "Lomé"})
            </option>
        `).join("") + `<option value="__NEW__">+ Ajouter un nouvel établissement...</option>`;

        populatePrograms();

        if (userProfile.program && progSelect) {
            const options = Array.from(progSelect.options);
            const match = options.find((o) => o.value === userProfile.program || o.value.includes(userProfile.program));
            if (match) {
                progSelect.value = match.value;
                populateSemesters();
            }
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
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            if (feedback) {
                feedback.className = "form-feedback";
                feedback.textContent = "Seuls les fichiers PDF sont acceptés pour la bibliothèque académique.";
            }
            return;
        }

        if (file.size > 30 * 1024 * 1024) {
            if (feedback) {
                feedback.className = "form-feedback";
                feedback.textContent = "Le fichier dépasse la taille maximale autorisée de 30 Mo.";
            }
            return;
        }

        selectedFile = file;
        const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " Mo";

        try {
            fileDataUrl = await readFileAsDataUrl(file);
        } catch (e) {
            console.warn("Read file error:", e);
        }

        if (fileInfo) {
            fileInfo.innerHTML = `
                ${icons?.checkCircle || '✓'}
                <span>${file.name} (${sizeFormatted})</span>
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

        const formData = new FormData(form);
        const title = formData.get("title")?.trim() || fileToUpload.name.replace(/\.[^/.]+$/, "");
        const institution = formData.get("institution") || "ENP Campus Lomé";
        const degreeType = formData.get("degree_type") || "Licence Professionnelle";
        const program = progSelect?.value || "Génie Logiciel & Systèmes d'Information";
        const semester = parseInt(formData.get("semester") || "1", 10);
        const category = formData.get("category") || "Support de Cours";
        const academicYear = formData.get("academic_year") || "2025-2026";

        // Récupération de la matière
        let courseName = "";
        const customName = customCourseInput?.value?.trim();
        const selectedCourseVal = courseSelect?.value;

        if (selectedCourseVal === "__NEW__" || (customCourseInput && customCourseInput.style.display !== "none" && customName)) {
            if (!customName) {
                feedback.className = "form-feedback";
                feedback.textContent = "Veuillez renseigner le nom de la nouvelle matière.";
                return;
            }
            courseName = customName;
            const selectedProgOption = progSelect.selectedOptions[0];
            const progId = selectedProgOption?.dataset.id || "prog-1";
            store.addCourse({ name: courseName, program_id: progId, semester });
        } else {
            courseName = selectedCourseVal || "Matière Académique";
        }

        feedback.className = "form-feedback is-success";
        feedback.textContent = "Traitement et enregistrement du document PDF dans le coffre…";

        // S'assurer que le fichier est converti en DataURL
        if (!fileDataUrl && fileToUpload) {
            try {
                fileDataUrl = await readFileAsDataUrl(fileToUpload);
            } catch (e) {
                console.warn("Conversion error:", e);
            }
        }

        const docPayload = {
            title,
            institution,
            degree_type: degreeType,
            program,
            semester,
            course: courseName,
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

    populateInstitutions();
})();