/* Gestion complète du profil étudiant, du Mode Exploration et des documents téléversés */
(() => {
    const store = window.EduVaultStore;
    const auth = window.EduVaultAuth;
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
        const isExploration = store.isExplorationMode();
        const profileLayout = document.querySelector(".profile-layout");
        const pageIntro = document.querySelector(".page-intro");
        const explorationBanner = document.querySelector("#exploration-profile-banner");

        if (isExploration) {
            // Affichage Spécifique Mode Exploration
            if (pageIntro) {
                pageIntro.textContent = "Vous parcourez actuellement EduVault en Mode Exploration (accès libre). Connectez-vous pour personnaliser votre espace ou publier des documents.";
            }

            // Si le bandeau d'exploration n'existe pas encore, on l'injecte
            if (!document.querySelector("#profile-exploration-card")) {
                const guestCardHtml = `
                <div class="profile-exploration-card" id="profile-exploration-card">
                    <div class="exploration-card-header">
                        <div class="exploration-big-icon">🧭</div>
                        <div>
                            <span class="badge badge-accent">Mode Invité Actif</span>
                            <h2>Vous êtes en Mode Exploration</h2>
                            <p>Vous avez accès à l'ensemble du catalogue académique, des annales corrigées et des cours PDF sans avoir besoin de créer un compte.</p>
                        </div>
                    </div>
                    <div class="exploration-card-benefits">
                        <div class="benefit-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Consultation libre & illimitée des PDF</span>
                        </div>
                        <div class="benefit-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Accès à tous les campus (ENP Lomé, UL, Kara, ESA...)</span>
                        </div>
                        <div class="benefit-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Recherche rapide par filière & semestre</span>
                        </div>
                    </div>
                    <div class="exploration-cta-group">
                        <a class="button button-primary" href="login.html">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                            <span>Se connecter à mon compte</span>
                        </a>
                        <a class="button button-outline" href="register.html">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                            <span>Créer un compte étudiant</span>
                        </a>
                        <a class="button button-accent" href="../index.html">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <span>Continuer à Explorer</span>
                        </a>
                    </div>
                </div>`;
                if (profileLayout) {
                    profileLayout.insertAdjacentHTML("beforebegin", guestCardHtml);
                }
            } else {
                const card = document.querySelector("#profile-exploration-card");
                if (card) card.style.display = "block";
            }

            // Masquer les blocs de gestion de profil privé quand en exploration
            if (profileLayout) profileLayout.classList.add("is-dimmed-exploration");

        } else {
            // Mode Connecté Normal
            const card = document.querySelector("#profile-exploration-card");
            if (card) card.style.display = "none";
            if (profileLayout) profileLayout.classList.remove("is-dimmed-exploration");

            if (pageIntro) {
                pageIntro.textContent = "Gérez vos coordonnées universitaires et suivez l'ensemble des documents et annales que vous avez partagés avec la communauté.";
            }

            const profile = store.getCurrentUserProfile();
            
            // Affichage carte latérale
            const nameEl = document.querySelector("#user-name-display");
            const instEl = document.querySelector("#user-institution-display span");
            const bioEl = document.querySelector("#user-bio-display");
            const avatarEl = document.querySelector("#user-avatar-display");

            if (nameEl) nameEl.textContent = profile.name || "Étudiant EduVault";
            if (instEl) instEl.textContent = profile.institution || "ENP Campus Lomé";
            if (bioEl) bioEl.textContent = profile.bio || "Membre de la communauté académique EduVault.";
            
            const initial = (profile.name || "K").slice(0, 1).toUpperCase();
            if (avatarEl) avatarEl.textContent = initial;

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
        }
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
                        <span>Consulter</span>
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
                    auth?.showToast("Document retiré du coffre avec succès.", "info");
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
            auth?.showToast("Profil mis à jour avec succès !", "success");
        });
    }

    // Bouton Déconnexion -> Bascule en Mode Exploration
    document.querySelector("#sign-out")?.addEventListener("click", async () => {
        store.logoutUser();
        updateProfileUI();
        renderUserDocuments();
        auth?.updateAccount();
        auth?.showToast("Déconnexion effectuée : vous êtes en Mode Exploration.", "info");
    });

    // Écouteurs de changements d'état d'authentification
    document.addEventListener("eduvault:auth_state_changed", () => {
        updateProfileUI();
        renderUserDocuments();
    });

    document.addEventListener("eduvault:auth_mode_changed", () => {
        updateProfileUI();
        renderUserDocuments();
    });

    document.addEventListener("eduvault:logout", () => {
        updateProfileUI();
        renderUserDocuments();
    });

    // Chargement initial
    updateProfileUI();
    renderUserDocuments();
})();