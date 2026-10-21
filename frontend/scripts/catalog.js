/* Construit l’arborescence établissement > filière > semestre > cours > documents
   Supporte la recherche instantanée et les filtres Publics / Privés — EduVault 2026 */
(() => {
    const root = document.querySelector("#catalog-tree");
    if (!root) return;

    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;
    const config = window.EDUVAULT_CONFIG || {};
    const searchInput = document.querySelector("#catalog-search");
    const sectorFilterBtns = document.querySelectorAll("#catalog-sector-filters button");
    const pageParams = new URLSearchParams(location.search);
    const selectedInstitutionId = pageParams.get("inst");
    const selectedProgramId = pageParams.get("program");
    const breadcrumb = document.querySelector("#catalog-breadcrumb");
    const pageTitle = document.querySelector(".inner-page > h1");
    const pageIntro = document.querySelector(".inner-page > .page-intro");

    let currentSector = "all";
    let currentSearch = "";
    let currentData = store.loadState();
    let usingRemoteCatalog = false;

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ 
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" 
    })[char]);

    const catalogNameKey = (value = "") => String(value)
        .replace(/^\s*[A-Z]{2,6}\s*[-–:]\s*/, "")
        .replace(/\([^)]*\)/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const uniqueByName = (items) => [...new Map(items.map((item) => [catalogNameKey(item.name), item])).values()];

    const render = (data) => {
        currentData = data;
        let institutions = uniqueByName(data.institutions || []);
        const selectedProgram = selectedProgramId && data.programs.find((program) => program.id === selectedProgramId);
        const parentInstitutionId = selectedProgram?.institution_id || selectedInstitutionId;
        if (selectedProgram) {
            const institution = institutions.find((item) => item.id === selectedProgram.institution_id);
            if (pageTitle) pageTitle.textContent = selectedProgram.name;
            if (pageIntro) pageIntro.textContent = [institution?.name, selectedProgram.degree || "Niveau à confirmer"].filter(Boolean).join(" · ");
            if (breadcrumb) {
                breadcrumb.innerHTML = `<a href="parcours.html?inst=${encodeURIComponent(selectedProgram.institution_id)}">${escapeHtml(institution?.name || "Établissement")}</a><span aria-hidden="true">›</span><span>${escapeHtml(selectedProgram.name)}</span>`;
                breadcrumb.hidden = false;
            }
        } else if (selectedInstitutionId) {
            const institution = institutions.find((item) => item.id === selectedInstitutionId);
            if (institution) {
                if (pageTitle) pageTitle.textContent = institution.name;
                if (pageIntro) pageIntro.textContent = `${institution.city || "Togo"} · Formations recensées en informatique, à confirmer auprès de l’établissement.`;
                if (breadcrumb) {
                    breadcrumb.innerHTML = `<a href="parcours.html">Tous les établissements</a><span aria-hidden="true">›</span><span>${escapeHtml(institution.name)}</span>`;
                    breadcrumb.hidden = false;
                }
            }
        }
        if (parentInstitutionId) institutions = institutions.filter((inst) => inst.id === parentInstitutionId);

        // Filtrer par secteur (public / privé)
        if (currentSector !== "all") {
            institutions = institutions.filter((inst) => currentSector === "public"
                ? inst.sector === "public" || inst.sector === "interstate"
                : inst.sector === "private");
        }

        // Filtrer par recherche textuelle (école ou filière)
        if (currentSearch.trim()) {
            const query = currentSearch.trim().toLowerCase();
            institutions = institutions.filter((inst) => {
                const matchInst = inst.name.toLowerCase().includes(query)
                    || (inst.description && inst.description.toLowerCase().includes(query))
                    || (inst.aliases || []).some((alias) => alias.toLowerCase().includes(query));
                const instPrograms = data.programs.filter((p) => p.institution_id === inst.id);
                const matchProg = instPrograms.some((p) => p.name.toLowerCase().includes(query));
                return matchInst || matchProg;
            });
        }

        if (!institutions.length) {
            root.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${icons?.building || ''}</div>
                    <h3>Aucun établissement trouvé</h3>
                    <p>Essayez un autre mot-clé ou modifiez les filtres de recherche.</p>
                </div>`;
            return;
        }

        root.innerHTML = institutions.map((institution) => {
            let programs = uniqueByName(data.programs.filter((program) => program.institution_id === institution.id));
            if (selectedProgramId) programs = programs.filter((program) => program.id === selectedProgramId);

            if (currentSearch.trim()) {
                const query = currentSearch.trim().toLowerCase();
                const filteredProgs = programs.filter((p) => p.name.toLowerCase().includes(query));
                if (filteredProgs.length > 0) {
                    programs = filteredProgs;
                }
            }

            const isPublic = institution.sector === "public" || institution.sector === "interstate";
            const badgeClass = isPublic ? "badge-primary" : "badge-accent";
            const badgeLabel = institution.sector === "interstate"
                ? "Inter-États"
                : isPublic ? "Public" : "Privé · statut à vérifier";
            const autoOpen = Boolean(currentSearch.trim() || selectedInstitutionId || selectedProgramId);

            return `
            <details class="institution-accordion" data-institution-id="${escapeHtml(institution.id)}" ${autoOpen ? "open" : ""}>
                <summary>
                    <div class="institution-icon" style="width: 38px; height: 38px; border-radius: 8px; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; background: ${isPublic ? 'var(--primary-light)' : 'var(--accent-soft)'}; color: ${isPublic ? 'var(--primary)' : 'var(--accent)'}; border: 1px solid ${isPublic ? 'var(--primary-border)' : 'var(--accent-border)'};">
                        ${escapeHtml(institution.name.slice(0, 1))}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 2px;">
                            <strong style="font-size: 15px;">${escapeHtml(institution.name)}</strong>
                            <span class="badge ${badgeClass}" style="font-size: 10px; padding: 2px 7px;">${badgeLabel}</span>
                        </div>
                        <small style="color: var(--muted);">${escapeHtml(institution.city || "Lomé")} · ${escapeHtml(institution.description || "Informations à confirmer")}</small>
                    </div>
                    <span class="accordion-chevron" style="margin-left: auto; color: var(--muted); font-size: 16px;">▾</span>
                </summary>
                
                <div class="program-list">
                    <div class="program-list-heading">
                        <span>Parcours recensés (${programs.length})</span>
                        <div class="program-list-actions">
                            <button class="button button-outline button-sm program-add" type="button" data-institution-id="${escapeHtml(institution.id)}">Proposer une filière</button>
                        </div>
                    </div>
                    ${programs.length ? programs.map((program) => {
                        const courses = data.courses.filter((course) => course.program_id === program.id);
                        const semesters = Array.from(new Set(courses.map((course) => course.semester)))
                            .sort((a, b) => a - b);
                        const programUrl = `parcours.html?inst=${encodeURIComponent(institution.id)}&program=${encodeURIComponent(program.id)}`;
                        const openProgramLink = `<a class="button button-outline button-sm" href="${programUrl}">Voir les semestres</a>`;
                        
                        return `
                        <details class="program-accordion" ${selectedProgramId === program.id ? "open" : ""}>
                            <summary>
                                <div>
                                    <strong>${escapeHtml(program.name)}</strong>
                                    <small>${escapeHtml(program.degree || "Niveau à confirmer")} · <span class="catalog-verification">${escapeHtml(program.verification || "À confirmer")}</span></small>
                                </div>
                                <span class="badge badge-outline" style="margin-left: auto; font-size: 11px;">
                                    ${courses.length} cours
                                </span>
                                <span class="accordion-chevron" style="margin-left: 10px; color: var(--muted);">▾</span>
                            </summary>
                            <div class="program-actions">
                                ${!selectedProgramId ? openProgramLink : ""}
                                <button class="button button-outline button-sm program-edit" type="button" data-program-id="${escapeHtml(program.id)}" aria-label="Proposer un renommage pour ${escapeHtml(program.name)}">
                                    ${icons?.edit || "Modifier"}
                                    <span>Proposer un renommage</span>
                                </button>
                            </div>
                            
                            <div class="semester-grid">
                                ${semesters.map((semester) => {
                                    const semesterCourses = courses.filter((course) => course.semester === semester);
                                    const uploadParams = new URLSearchParams({ institution_id: institution.id, program_id: program.id, semester });
                                    return `
                                    <section class="semester-block">
                                        <div class="semester-heading">
                                            <h3>Semestre ${semester} (S${semester})</h3>
                                            <a class="text-link" href="upload.html?${uploadParams}">Déposer un document</a>
                                        </div>
                                        ${semesterCourses.length ? semesterCourses.map((course) => `
                                            <div class="course-row">
                                                <a class="course-toggle" href="library.html?${new URLSearchParams({
                                                    course_id: course.id,
                                                    course: course.name,
                                                    institution: institution.name,
                                                    program: program.name,
                                                    semester
                                                })}">
                                                    <span>${escapeHtml(course.name)}</span>
                                                    <span style="font-size: 11px; color: var(--muted);">${escapeHtml(course.code || "UE")}</span>
                                                </a>
                                            </div>
                                        `).join("") : `
                                            <div style="padding: 8px 4px;">
                                                <p style="font-size: 12px; color: var(--muted); margin: 0;">Aucun cours recensé pour ce semestre.</p>
                                            </div>
                                        `}
                                    </section>`;
                                }).join("")}
                            </div>
                        </details>`;
                    }).join("") : '<p style="padding: 16px; color: var(--muted); font-size: 13px;">Aucun parcours informatique confirmé pour cet établissement.</p>'}
                </div>
            </details>`;
        }).join("");

        root.querySelectorAll(".program-add").forEach((button) => {
            button.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const name = window.prompt("Nom du nouveau parcours ou de la nouvelle filière :");
                if (name === null) return;
                await submitProgramChange({
                    institution_id: button.dataset.institutionId,
                    request_type: "add",
                    name
                });
            });
        });

        root.querySelectorAll(".program-edit").forEach((button) => {
            button.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const program = data.programs.find((item) => item.id === button.dataset.programId);
                if (!program) return;
                const name = window.prompt("Modifier le nom de cette filière :", program.name);
                if (name === null || name.trim() === program.name) return;
                await submitProgramChange({
                    institution_id: program.institution_id,
                    program_id: program.id,
                    request_type: "rename",
                    name
                });
            });
        });

    };

    const submitProgramChange = async (payload) => {
        const auth = window.EduVaultAuth;
        const session = await auth?.getSession();
        if (!session?.access_token) {
            auth?.open("login", "Connectez-vous avec votre compte pour soumettre une filière à validation.");
            return;
        }

        try {
            const response = await fetch(`${config.API_BASE_URL}/catalog/program-requests`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.detail || "La demande n'a pas pu être envoyée.");
            }
            auth.showToast("Votre proposition a été envoyée aux modérateurs.", "success");
            loadProgramChangeRequests();
        } catch (error) {
            console.error("Envoi de la demande de filière impossible :", error);
            auth?.showToast(error.message || "Le service de proposition est indisponible.", "error");
        }
    };

    const renderProgramChangeRequests = (result) => {
        const section = document.querySelector("#program-review");
        const list = document.querySelector("#program-review-list");
        if (!section || !list) return;
        list.innerHTML = "";
        if (!result.requests.length) {
            section.hidden = !result.can_review;
            return;
        }

        section.hidden = false;
        const institutionNames = new Map(currentData.institutions.map((institution) => [institution.id, institution.name]));
        list.innerHTML = result.requests.map((request) => `
            <article class="program-review-item">
                <div>
                    <strong>${escapeHtml(request.request_type === "add" ? "Nouvelle filière" : "Renommage proposé")}</strong>
                    <p>${escapeHtml(request.requested_name)} · ${escapeHtml(institutionNames.get(request.institution_id) || "Établissement")}</p>
                    <small>${request.status === "pending" ? "En attente de validation" : `Demande ${request.status === "approved" ? "approuvée" : "refusée"}`}</small>
                </div>
                ${result.can_review && request.status === "pending" ? `
                <div class="program-review-actions">
                    <button class="button button-primary button-sm" type="button" data-review-id="${escapeHtml(request.id)}" data-review-action="approve">Valider</button>
                    <button class="button button-outline button-sm" type="button" data-review-id="${escapeHtml(request.id)}" data-review-action="reject">Refuser</button>
                </div>` : ""}
            </article>
        `).join("");

        list.querySelectorAll("[data-review-id]").forEach((button) => {
            button.addEventListener("click", async () => {
                button.disabled = true;
                await reviewProgramChange(button.dataset.reviewId, button.dataset.reviewAction);
                button.disabled = false;
            });
        });
    };

    const loadProgramChangeRequests = async () => {
        const auth = window.EduVaultAuth;
        const session = await auth?.getSession();
        if (!session?.access_token) return;
        try {
            const response = await fetch(`${config.API_BASE_URL}/catalog/program-requests`, {
                headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            if (!response.ok) throw new Error(`Réponse API ${response.status}`);
            renderProgramChangeRequests(await response.json());
        } catch (error) {
            console.error("Chargement des demandes de filière impossible :", error);
            auth?.showToast("Impossible de charger les propositions de filière.", "error");
        }
    };

    const reviewProgramChange = async (requestId, action) => {
        const auth = window.EduVaultAuth;
        const session = await auth?.getSession();
        if (!session?.access_token) return;
        try {
            const response = await fetch(`${config.API_BASE_URL}/catalog/program-requests/${encodeURIComponent(requestId)}/review`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ action })
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.detail || "La décision n'a pas pu être enregistrée.");
            }
            auth.showToast(action === "approve" ? "La filière est publiée." : "La proposition a été refusée.", "success");
            await loadCatalog();
            await loadProgramChangeRequests();
        } catch (error) {
            console.error("Modération de la demande de filière impossible :", error);
            auth?.showToast(error.message || "La modération a échoué.", "error");
        }
    };

    const targetInstId = new URLSearchParams(location.search).get("inst");
    const openTargetInstitution = () => {
        if (!targetInstId) return;
        root.querySelector(`details.institution-accordion[data-institution-id="${CSS.escape(targetInstId)}"]`)?.setAttribute("open", "");
    };

    const loadCatalog = async () => {
        try {
            const response = await fetch(`${config.API_BASE_URL}/catalog`);
            if (!response.ok) throw new Error(`Réponse API ${response.status}`);
            const remoteData = await response.json();
            const localData = store.loadState();
            const knownInstitutions = new Map();
            localData.institutions.forEach((institution) => {
                [institution.name, ...(institution.aliases || [])].forEach((name) => {
                    knownInstitutions.set(catalogNameKey(name), institution);
                });
            });
            remoteData.institutions = (remoteData.institutions || []).map((institution) => {
                const known = knownInstitutions.get(catalogNameKey(institution.name));
                return { ...institution, ...(known || {}), id: institution.id };
            });
            remoteData.documents = [];
            usingRemoteCatalog = true;
            render(remoteData);
        } catch (error) {
            console.warn("Catalogue distant indisponible, utilisation du catalogue local :", error);
            usingRemoteCatalog = false;
            render(store.loadState());
        }
        openTargetInstitution();
    };

    // Chargement initial
    render(currentData);
    loadCatalog().then(loadProgramChangeRequests);

    // Événements de recherche et filtres
    searchInput?.addEventListener("input", (e) => {
        currentSearch = e.target.value;
        render(currentData);
    });

    sectorFilterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            sectorFilterBtns.forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            currentSector = btn.dataset.sector || "all";
            render(currentData);
        });
    });
})();