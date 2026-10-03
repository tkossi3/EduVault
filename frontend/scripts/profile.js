/* Gestion complète du profil étudiant et des documents téléversés */
(() => {
    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;
    if (!store) return;

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ 
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" 
    })[char]);

    const formatSize = (bytes) => bytes ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo` : "PDF";

    const populateInstitutionsSelect = (selectedName) => {
        const select = document.querySelector("#edit-institution");
        if (!select) return;
        const state = store.loadState();
        select.innerHTML = state.institutions.map((inst) => `
            <option value="${escapeHtml(inst.name)}" ${inst.name === selectedName ? 'selected' : ''}>
                ${escapeHtml(inst.name)} (${escapeHtml(inst.city || "Lomé")})
            </option>
        `).join("");
    };

    const updateProfileUI = () => {
        const profile = store.getCurrentUserProfile();
        
        // Affichage carte latérale
        const nameEl = document.querySelector("#user-name-display");
        const instEl = document.querySelector("#user-institution-display span");
        const bioEl = document.querySelector("#user-bio-display");
        const avatarEl = document.querySelector("#user-avatar-display");
        const accountInitials = document.querySelector("#account-initials");

        if (nameEl) nameEl.textContent = profile.name || "Étudiant EduVault";
        if (instEl) instEl.textContent = profile.institution || "ENP Campus Lomé";
        if (bioEl) bioEl.textContent = profile.bio || "Membre de la communauté académique EduVault.";
        
        const initial = (profile.name || "K").slice(0, 1).toUpperCase();
        if (avatarEl) avatarEl.textContent = initial;
        if (accountInitials) accountInitials.textContent = initial;

        // Préremplissage du formulaire
        const inputName = document.querySelector("#edit-name");
        const inputEmail = document.querySelector("#edit-email");
        const inputProgram = document.querySelector("#edit-program");
        const inputLevel = document.querySelector("#edit-level");
        const inputBio = document.querySelector("#edit-bio");

        if (inputName) inputName.value = profile.name || "";
        if (inputEmail) inputEmail.value = profile.email || "";
        if (inputProgram) inputProgram.value = profile.program || "";
        if (inputLevel) inputLevel.value = profile.level || "Licence 3 (L3)";
        if (inputBio) inputBio.value = profile.bio || "";

        populateInstitutionsSelect(profile.institution);
    };

    const renderUserDocuments = () => {
        const state = store.loadState();
        const profile = store.getCurrentUserProfile();
        const docsContainer = document.querySelector("#user-documents-list");
        if (!docsContainer) return;

        // Filtrer les documents appartenant à l'utilisateur ou par défaut
        const userDocs = state.documents.filter((d) => 
            d.uploaded_by === profile.id || 
            d.uploaded_by === "user-demo" || 
            d.institution === profile.institution
        );

        // Mise à jour des stats
        const totalDocs = userDocs.length;
        const totalViews = userDocs.reduce((acc, d) => acc + (d.views_count || 120), 0);
        const totalDownloads = userDocs.reduce((acc, d) => acc + (d.downloads_count || 35), 0);

        const statDoc = document.querySelector("#stats-doc-count");
        const statViews = document.querySelector("#stats-views-count");
        const statDownloads = document.querySelector("#stats-downloads-count");

        if (statDoc) statDoc.textContent = totalDocs;
        if (statViews) statViews.textContent = totalViews;
        if (statDownloads) statDownloads.textContent = totalDownloads;

        if (!userDocs.length) {
            docsContainer.innerHTML = `
                <div class="empty-state" style="padding: 36px 16px;">
                    <div class="empty-state-icon">${icons?.fileText || ''}</div>
                    <h3>Vous n'avez pas encore déposé de document</h3>
                    <p>Contribuez à la bibliothèque de votre établissement pour aider vos camarades.</p>
                </div>`;
            return;
        }

        docsContainer.innerHTML = userDocs.map((doc) => {
            const params = new URLSearchParams({
                id: doc.id,
                title: doc.title,
                course: doc.course || "Ressource",
                institution: doc.institution || profile.institution,
                category: doc.category || "Document"
            });

            return `
            <article class="user-doc-item">
                <div class="user-doc-info">
                    <strong>${escapeHtml(doc.title)}</strong>
                    <small>
                        <span class="badge badge-accent" style="padding: 2px 8px; font-size: 10px;">${escapeHtml(doc.category)}</span>
                        &nbsp;·&nbsp; ${escapeHtml(doc.course || "Cours")} &nbsp;·&nbsp; ${escapeHtml(doc.academic_year || "2025-2026")} &nbsp;·&nbsp; ${formatSize(doc.file_size)}
                    </small>
                </div>
                <div class="user-doc-actions">
                    <a class="button button-outline button-sm" href="document-view.html?${params}">
                        ${icons?.eye || ''}
                        <span>Lire</span>
                    </a>
                    <button class="icon-button btn-delete-doc" type="button" data-id="${doc.id}" title="Supprimer ce document" style="width: 32px; height: 32px; color: var(--danger);">
                        ${icons?.trash || '×'}
                    </button>
                </div>
            </article>`;
        }).join("");

        // Écouteurs de suppression
        docsContainer.querySelectorAll(".btn-delete-doc").forEach((btn) => {
            btn.addEventListener("click", () => {
                const docId = btn.dataset.id;
                if (confirm("Êtes-vous sûr de vouloir retirer ce document du coffre académique ?")) {
                    store.deleteDocument(docId);
                    renderUserDocuments();
                }
            });
        });
    };

    // Gestion du formulaire d'édition du profil
    const editForm = document.querySelector("#profile-edit-form");
    if (editForm) {
        editForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const feedback = document.querySelector("#profile-feedback");
            const formData = new FormData(editForm);

            const updatedProfile = {
                name: formData.get("name").trim(),
                email: formData.get("email").trim(),
                institution: formData.get("institution"),
                level: formData.get("level"),
                program: formData.get("program").trim(),
                bio: formData.get("bio").trim()
            };

            store.saveUserProfile(updatedProfile);
            updateProfileUI();
            renderUserDocuments();

            if (feedback) {
                feedback.className = "form-feedback is-success";
                feedback.textContent = "Vos informations ont été mises à jour avec succès !";
                setTimeout(() => { feedback.textContent = ""; }, 4000);
            }
        });
    }

    // Déconnexion / Reset
    document.querySelector("#sign-out")?.addEventListener("click", async () => {
        if (confirm("Voulez-vous réinitialiser les données de session du profil ?")) {
            localStorage.removeItem("eduvault_current_user_v2026");
            location.reload();
        }
    });

    // Chargement initial
    updateProfileUI();
    renderUserDocuments();
})();