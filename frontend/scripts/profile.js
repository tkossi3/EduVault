/* Gestion complète du profil étudiant et des documents téléversés — EduVault 2026 */
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
        const isUserLoggedIn = store.isLoggedIn();
        const profileLayout = document.querySelector(".profile-layout");
        const pageIntro = document.querySelector(".page-intro");

        if (!isUserLoggedIn) {
            // Affichage État Déconnecté / Visiteur
            if (pageIntro) {
                pageIntro.textContent = "Connectez-vous à votre espace étudiant pour gérer votre profil académique et suivre l'ensemble de vos documents partagés.";
            }

            if (!document.querySelector("#profile-guest-card")) {
                const guestCardHtml = `
                <div class="profile-exploration-card" id="profile-guest-card">
                    <div class="exploration-card-header">
                        <div class="exploration-big-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                            <h2>Espace Membre & Profil Étudiant</h2>
                            <p>Connectez-vous pour accéder à vos coordonnées universitaires, consulter vos statistiques de téléchargements et publier des annales pour votre filière.</p>
                        </div>
                    </div>
                    <div class="exploration-card-benefits">
                        <div class="benefit-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Gestion de votre filière et de votre établissement</span>
                        </div>
                        <div class="benefit-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Suivi en temps réel de vos documents déposés</span>
                        </div>
                        <div class="benefit-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Accès instantané aux notifications du campus</span>
                        </div>
                    </div>
                    <div class="exploration-cta-group">
                        <a class="button button-primary" href="login.html">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                            <span>Se connecter</span>
                        </a>
                        <a class="button button-outline" href="register.html">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                            <span>Créer un compte</span>
                        </a>
                        <a class="button button-outline" href="../index.html">
                            <span>Parcourir les cours</span>
                        </a>
                    </div>
                </div>`;
                if (profileLayout) {
                    profileLayout.insertAdjacentHTML("beforebegin", guestCardHtml);
                }
            } else {
                const card = document.querySelector("#profile-guest-card");
                if (card) card.style.display = "block";
            }

            if (profileLayout) profileLayout.style.display = "none";

        } else {
            // Mode Connecté
            const card = document.querySelector("#profile-guest-card");
            if (card) card.style.display = "none";
            if (profileLayout) profileLayout.style.display = "grid";

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
            
            const initial = (profile.name || "E").slice(0, 1).toUpperCase();
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
            renderUserDocuments();
        }
    };

    const renderUserDocuments = () => {
        const state = store.loadState();
        const profile = store.getCurrentUserProfile();
        const docsContainer = document.querySelector("#user-documents-list");
        if (!docsContainer) return;

        // Filtrer les documents appartenant à l'utilisateur
        const userDocs = state.documents.filter((d) => 
            d.uploaded_by === profile.id || 
            d.institution === profile.institution
        );

        // Mise à jour des stats
        const totalDocs = userDocs.length;
        const totalViews = userDocs.reduce((acc, d) => acc + (d.views_count || 45), 0);
        const totalDownloads = userDocs.reduce((acc, d) => acc + (d.downloads_count || 12), 0);

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
                    <h3>Aucun document déposé pour le moment</h3>
                    <p>Déposez des cours, TD corrigés ou annales pour aider les étudiants de votre filière.</p>
                    <a class="button button-primary" href="upload.html" style="margin-top: 14px;">
                        ${icons?.plus || '+'}
                        <span>Déposer un premier document</span>
                    </a>
                </div>
            `;
            return;
        }

        docsContainer.innerHTML = userDocs.map((doc) => {
            const params = new URLSearchParams({
                id: doc.id,
                title: doc.title,
                course: doc.course,
                institution: doc.institution,
                program: doc.program || "",
                semester: doc.semester || 1,
                category: doc.category
            });

            return `
            <article class="profile-doc-card">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <span class="badge badge-primary" style="font-size: 10px;">${escapeHtml(doc.category)}</span>
                        <span class="badge badge-accent" style="font-size: 10px; font-weight: 700;">Semestre ${doc.semester || 1} (S${doc.semester || 1})</span>
                        <span class="badge badge-outline" style="font-size: 10px; border: 1px solid var(--line);">${escapeHtml(doc.program || "Filière")}</span>
                    </div>
                    <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: 700; line-height: 1.3;">
                        <a href="document-view.html?${params}" style="color: var(--text); text-decoration: none;">
                            ${escapeHtml(doc.title)}
                        </a>
                    </h4>
                    <p style="margin: 0; font-size: 12px; color: var(--muted);">
                        ${escapeHtml(doc.course)} · ${escapeHtml(doc.institution)} · ${formatSize(doc.file_size)}
                    </p>
                </div>
                <div class="profile-doc-actions">
                    <a class="button button-outline button-sm" href="document-view.html?${params}">
                        <span>Lire</span>
                    </a>
                    <button class="button button-danger button-sm btn-delete-doc" data-doc-id="${doc.id}" type="button" title="Supprimer ce document">
                        ${icons?.trash || '✕'}
                    </button>
                </div>
            </article>`;
        }).join("");

        // Supprimer document
        docsContainer.querySelectorAll(".btn-delete-doc").forEach((btn) => {
            btn.addEventListener("click", () => {
                const docId = btn.dataset.docId;
                if (confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
                    store.deleteDocument(docId);
                    auth.showToast("Document retiré avec succès.", "info");
                    renderUserDocuments();
                }
            });
        });
    };

    // Soumission du formulaire de mise à jour du profil
    document.querySelector("#profile-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const feedback = document.querySelector("#profile-feedback");
        const name = document.querySelector("#edit-name")?.value.trim() || "";
        const email = document.querySelector("#edit-email")?.value.trim() || "";
        const institution = document.querySelector("#edit-institution")?.value || "";
        const program = document.querySelector("#edit-program")?.value.trim() || "";
        const level = document.querySelector("#edit-level")?.value || "";
        const bio = document.querySelector("#edit-bio")?.value.trim() || "";

        const updated = store.saveUserProfile({ name, email, institution, program, level, bio });

        if (feedback) {
            feedback.className = "form-feedback is-success";
            feedback.textContent = "Profil mis à jour avec succès !";
            setTimeout(() => { feedback.textContent = ""; }, 3000);
        }

        auth.showToast("Informations enregistrées avec succès.", "success");
        updateProfileUI();
    });

    // Bouton de déconnexion depuis la page profil
    document.querySelector("#profile-logout-btn")?.addEventListener("click", () => {
        if (confirm("Voulez-vous vous déconnecter de votre compte EduVault ?")) {
            store.logoutUser();
            auth.showToast("Vous avez été déconnecté.", "info");
            updateProfileUI();
        }
    });

    // Écoute des changements d'état
    document.addEventListener("eduvault:auth_state_changed", () => updateProfileUI());

    // Initialisation
    updateProfileUI();
})();