/* Gestion du téléversement simplifié et validation anti-doublon d'établissement */
(() => {
    const form = document.querySelector("#upload-form");
    const feedback = document.querySelector("#upload-feedback");
    const dropzone = document.querySelector("#dropzone");
    const fileInput = document.querySelector("#upload-file");
    const fileInfo = document.querySelector("#dropzone-file-info");
    const instSelect = document.querySelector("#upload-institution");
    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;

    let selectedFile = null;

    // Remplissage de la liste des établissements
    const populateInstitutions = () => {
        if (!instSelect || !store) return;
        const state = store.loadState();
        const userProfile = store.getCurrentUserProfile();

        instSelect.innerHTML = state.institutions.map((inst) => `
            <option value="${inst.name}" ${inst.name === userProfile.institution ? 'selected' : ''}>
                ${inst.name} (${inst.city || "Lomé"})
            </option>
        `).join("") + `<option value="__NEW__">+ Ajouter un nouvel établissement...</option>`;
    };

    // Gestion du choix de nouvel établissement avec détection anti-doublon
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
                // Détection de doublon (ex: ENP Campus Lomé)
                if (alertBox && alertDesc) {
                    alertDesc.textContent = `L'établissement « ${duplicate.name} » existe déjà dans EduVault. Nous l'avons automatiquement sélectionné pour vous.`;
                    alertBox.style.display = "flex";
                    setTimeout(() => { alertBox.style.display = "none"; }, 6000);
                }
                populateInstitutions();
                instSelect.value = duplicate.name;
            } else {
                try {
                    const created = store.addInstitution(trimmed, "Lomé", "Togo");
                    populateInstitutions();
                    instSelect.value = created.name;
                    if (alertBox) alertBox.style.display = "none";
                } catch (e) {
                    alert(e.message);
                    populateInstitutions();
                }
            }
        }
    });

    // Drag and drop events
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

    const handleFile = (file) => {
        if (!file) return;
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            if (feedback) {
                feedback.className = "form-feedback";
                feedback.textContent = "Seuls les fichiers PDF sont acceptés.";
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
        
        if (fileInfo) {
            fileInfo.innerHTML = `
                ${icons?.checkCircle || '✓'}
                <span>${file.name} (${sizeFormatted})</span>
            `;
            fileInfo.style.display = "inline-flex";
        }

        if (feedback) feedback.textContent = "";

        // Pré-remplir le titre si vide
        const titleInput = document.querySelector("#upload-title");
        if (titleInput && !titleInput.value) {
            const rawName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
            titleInput.value = rawName;
        }
    };

    // Soumission du formulaire de dépôt
    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!selectedFile && (!fileInput || !fileInput.files[0])) {
            feedback.className = "form-feedback";
            feedback.textContent = "Veuillez sélectionner un fichier PDF à déposer.";
            return;
        }

        const formData = new FormData(form);
        const title = formData.get("title").trim();
        const institution = formData.get("institution");
        const category = formData.get("category");
        const course = formData.get("course").trim();
        const academicYear = formData.get("academic_year") || "2025-2026";

        feedback.className = "form-feedback is-success";
        feedback.textContent = "Validation et enregistrement du document dans le coffre…";

        const docPayload = {
            title,
            institution,
            category,
            course,
            academic_year: academicYear,
            file_name: selectedFile ? selectedFile.name : "document.pdf",
            file_size: selectedFile ? selectedFile.size : 2048576
        };

        try {
            const created = store.addDocument(docPayload);
            feedback.textContent = "Document déposé avec succès ! Redirection en cours…";
            setTimeout(() => {
                location.href = `document-view.html?id=${encodeURIComponent(created.id)}&title=${encodeURIComponent(created.title)}&course=${encodeURIComponent(created.course)}&institution=${encodeURIComponent(created.institution)}`;
            }, 1200);
        } catch (error) {
            feedback.className = "form-feedback";
            feedback.textContent = "Une erreur est survenue lors de l'enregistrement.";
        }
    });

    populateInstitutions();
})();