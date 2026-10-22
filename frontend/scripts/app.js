/* Recherche, filtres et interactions dynamiques de la page d'accueil EduVault */
(() => {
    const config = window.EDUVAULT_CONFIG;
    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;
    const results = document.querySelector("#document-results");
    if (!results) return;

    let activeCategory = "";
    let currentDocuments = [];
    let currentQuery = "";
    let currentInstitutions = [];
    const isExplorerPage = document.body.dataset.page === "explorer";
    const isLibraryPage = document.body.dataset.page === "library";
    const documentViewHref = isLibraryPage ? "document-view.html" : "pages/document-view.html";
    const catalogHref = isLibraryPage ? "parcours.html" : "pages/parcours.html";
    const pageParams = new URLSearchParams(location.search);
    const courseId = pageParams.get("course_id");
    const currentAcademicYear = () => {
        const year = new Date().getFullYear();
        return `${year}-${year + 1}`;
    };

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ 
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" 
    })[char]);

    const carouselStates = new Map();
    const syncAutoCarousel = (container) => {
        if (!container) return;
        let state = carouselStates.get(container.id);
        if (!state) {
            state = { timer: null, hovered: false, focused: false, manuallyPaused: false, bound: false };
            carouselStates.set(container.id, state);
        }
        if (state.timer) clearInterval(state.timer);

        const toggle = document.querySelector(`[data-carousel-toggle="${container.id}"]`);
        const isVertical = window.matchMedia("(max-width: 768px)").matches;
        const canScroll = container.classList.contains("is-carousel")
            && container.children.length > 1
            && (isVertical
                ? container.scrollHeight > container.clientHeight + 4
                : container.scrollWidth > container.clientWidth + 4)
            && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (toggle) toggle.hidden = !canScroll;
        if (!canScroll) return;

        if (!state.bound) {
            container.addEventListener("pointerenter", () => { state.hovered = true; });
            container.addEventListener("pointerleave", () => { state.hovered = false; });
            container.addEventListener("focusin", () => { state.focused = true; });
            container.addEventListener("focusout", (event) => {
                state.focused = container.contains(event.relatedTarget);
            });
            container.addEventListener("touchstart", () => { state.hovered = true; }, { passive: true });
            container.addEventListener("touchend", () => {
                window.setTimeout(() => { state.hovered = false; }, 2500);
            }, { passive: true });
            toggle?.addEventListener("click", () => {
                state.manuallyPaused = !state.manuallyPaused;
                toggle.setAttribute("aria-pressed", String(state.manuallyPaused));
                toggle.textContent = state.manuallyPaused ? "Reprendre" : "Pause";
            });
            state.bound = true;
        }

        state.timer = window.setInterval(() => {
            if (state.hovered || state.focused || state.manuallyPaused || document.hidden) return;
            const firstCard = container.firstElementChild;
            if (!firstCard) return;
            const gap = parseFloat(getComputedStyle(container).gap) || 0;
            if (isVertical) {
                const stride = firstCard.getBoundingClientRect().height + gap;
                const maxScroll = container.scrollHeight - container.clientHeight;
                const nextTop = container.scrollTop + stride;
                container.scrollTo({
                    top: nextTop >= maxScroll - 4 ? 0 : nextTop,
                    behavior: "smooth"
                });
            } else {
                const stride = firstCard.getBoundingClientRect().width + gap;
                const maxScroll = container.scrollWidth - container.clientWidth;
                const nextLeft = container.scrollLeft + stride;
                container.scrollTo({
                    left: nextLeft >= maxScroll - 4 ? 0 : nextLeft,
                    behavior: "smooth"
                });
            }
        }, 4500);
    };

    const formatSize = (bytes) => {
        if (!bytes) return "PDF";
        return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
    };

    const render = () => {
        let visible = currentDocuments.filter((item) =>
            !item.is_demo && (!activeCategory || item.category === activeCategory)
        );
        if (isExplorerPage && !currentQuery) {
            const mobile = window.matchMedia("(max-width: 768px)").matches;
            visible = visible.slice(0, mobile ? 4 : 8);
            results.classList.add("is-carousel");
        } else {
            results.classList.remove("is-carousel");
        }
        const emptyState = document.querySelector("#empty-state");
        if (emptyState) emptyState.hidden = visible.length > 0;

        if (!visible.length) {
            results.innerHTML = "";
            syncAutoCarousel(results);
            return;
        }

        results.innerHTML = visible.map((item) => {
            const courseName = item.course || pageParams.get("course") || "Ressource académique";
            const institutionName = item.institution || pageParams.get("institution") || "Établissement universitaire";
            const programName = item.program || pageParams.get("program") || "Filière à confirmer";
            const semester = item.semester || pageParams.get("semester") || 1;
            const params = new URLSearchParams({
                id: item.id, 
                title: item.title, 
                course: courseName,
                institution: institutionName,
                program: programName,
                semester,
                category: item.category || "Support de cours"
            });
            
            const categoryBadgeClass = item.category === "Examen/Annales" 
                ? "badge-warning" 
                : item.category === "TD/TP" 
                ? "badge-accent" 
                : "badge-primary";

            return `
            <article class="document-card">
                <div class="document-card-top">
                    <span class="badge ${categoryBadgeClass}">${escapeHtml(item.category)}</span>
                    <span class="badge badge-accent" style="font-weight: 700; font-size: 11px;">
                        Semestre ${semester} (S${semester})
                    </span>
                </div>
                
                <h3>${escapeHtml(item.title)}</h3>

                <div class="doc-card-hierarchy-tags">
                    <span class="doc-chip doc-chip-inst">${escapeHtml(institutionName)}</span>
                    <span class="doc-chip doc-chip-prog">${escapeHtml(programName)}</span>
                </div>

                <p class="doc-card-course">
                    <strong>Matière :</strong> ${escapeHtml(courseName)}
                </p>

                <div class="document-card-footer">
                    <span>${escapeHtml(item.academic_year || currentAcademicYear())} · ${formatSize(item.file_size)}</span>
                    <a class="action-read" href="${documentViewHref}?${params}">
                        <span>Consulter</span>
                        ${icons?.arrowRight || '→'}
                    </a>
                </div>
            </article>`;
        }).join("");
        syncAutoCarousel(results);
    };

    const search = async (query = "") => {
        currentQuery = query.trim();
        results.innerHTML = '<div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 40px;"><p>Recherche des documents en cours…</p></div>';
        const emptyState = document.querySelector("#empty-state");
        if (emptyState) emptyState.hidden = true;
        
        const titleEl = document.querySelector("#results-title");
        if (titleEl) {
            titleEl.textContent = query
                ? `Résultats pour « ${query} »`
                : isLibraryPage ? "Bibliothèque complète" : "Documents phares";
        }

        const normalizedQuery = query.toLowerCase().trim();
        const localDocuments = (store?.loadState().documents || []).filter((document) => !document.is_demo);
        if (isLibraryPage && courseId) {
            const courseName = pageParams.get("course") || "";
            currentDocuments = localDocuments.filter((doc) => doc.course_id === courseId || doc.course === courseName);
        } else if (!normalizedQuery) {
            currentDocuments = localDocuments;
        } else {
            currentDocuments = localDocuments.filter((doc) => {
                const text = `${doc.title} ${doc.course} ${doc.program} ${doc.institution} ${doc.category} s${doc.semester} semestre ${doc.semester}`.toLowerCase();
                return text.includes(normalizedQuery);
            });
        }
        render();

        try {
            if (isLibraryPage && courseId) {
                const response = await fetch(`${config.API_BASE_URL}/catalog/courses/${encodeURIComponent(courseId)}/documents`);
                if (!response.ok) throw new Error(`Chargement du cours impossible (${response.status}).`);
                currentDocuments = await response.json();
            } else {
                const response = await fetch(`${config.API_BASE_URL}/documents/search?q=${encodeURIComponent(query)}`);
                if (!response.ok) throw new Error("API Offline");
                const data = await response.json();
                currentDocuments = data.documents || [];
                if (!currentDocuments.length && !query) {
                    currentDocuments = (store?.loadState().documents || []).filter((document) => !document.is_demo);
                }
            }
        } catch {
            const state = store?.loadState();
            const allDocs = (state?.documents || []).filter((document) => !document.is_demo);
            if (isLibraryPage && courseId) {
                const courseName = pageParams.get("course") || "";
                currentDocuments = allDocs.filter((doc) => doc.course_id === courseId || doc.course === courseName);
            } else if (!normalizedQuery) {
                currentDocuments = allDocs;
            } else {
                currentDocuments = allDocs.filter((doc) => {
                    const text = `${doc.title} ${doc.course} ${doc.program} ${doc.institution} ${doc.category} s${doc.semester} semestre ${doc.semester}`.toLowerCase();
                    return text.includes(normalizedQuery);
                });
            }
        }
        render();
    };

    // Chargement de la liste des campus
    const loadInstitutions = async () => {
        const container = document.querySelector("#institution-list");
        if (!container) return;

        let institutions = store?.loadState().institutions || [];
        currentInstitutions = institutions;
        renderInstitutions();
        try {
            const response = await fetch(`${config.API_BASE_URL}/catalog`);
            if (!response.ok) throw new Error(`Réponse API ${response.status}`);
            const data = await response.json();
            institutions = data.institutions || [];
            currentInstitutions = institutions;
            renderInstitutions();
        } catch (error) {
            console.warn("Catalogue des établissements indisponible; données locales affichées.", error);
        }
    };

    const renderInstitutions = () => {
        const container = document.querySelector("#institution-list");
        if (!container) return;
        const mobile = window.matchMedia("(max-width: 768px)").matches;
        const visibleInstitutions = isExplorerPage
            ? currentInstitutions.slice(0, mobile ? 4 : 8)
            : currentInstitutions;
        container.classList.toggle("is-carousel", isExplorerPage);
        container.innerHTML = visibleInstitutions.map((inst) => `
            <a href="${catalogHref}?inst=${encodeURIComponent(inst.id)}" class="institution-card">
                <div class="institution-icon">
                    ${escapeHtml(inst.name.slice(0, 1))}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <strong>${escapeHtml(inst.name)}</strong>
                    <small>${escapeHtml(inst.city || "Lomé")} · ${escapeHtml(inst.description || "Campus Universitaire")}</small>
                </div>
                <span style="color: var(--primary); font-weight: bold;">
                    ${icons?.arrowRight || '→'}
                </span>
            </a>
        `).join("");

        const moreLink = document.querySelector("#institutions-more");
        if (moreLink) moreLink.hidden = currentInstitutions.length <= visibleInstitutions.length;
        syncAutoCarousel(container);
    };

    if (isLibraryPage && courseId) {
        const params = pageParams;
        const courseName = params.get("course") || "Cours";
        const heading = document.querySelector("#results-title");
        const eyebrow = document.querySelector("#results-section .eyebrow");
        if (heading) heading.textContent = courseName;
        if (eyebrow) eyebrow.textContent = "DOCUMENTS DU COURS";
        const intro = document.querySelector(".page-intro");
        if (intro) {
            intro.textContent = [
                params.get("institution"),
                params.get("program"),
                params.get("semester") ? `Semestre ${params.get("semester")}` : ""
            ].filter(Boolean).join(" · ");
        }
        document.querySelector(".library-search")?.setAttribute("hidden", "");
        document.querySelector("#results-section .filter-row")?.setAttribute("hidden", "");
    }

    // Écouteurs de formulaires et filtres
    document.querySelector("#search-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const query = document.querySelector("#global-search").value.trim();
        search(query);
        document.querySelector("#results-section")?.scrollIntoView({ behavior: "smooth" });
    });

    document.querySelectorAll("[data-query]").forEach((button) => {
        button.addEventListener("click", () => {
            const query = button.dataset.query;
            const input = document.querySelector("#global-search");
            if (input) input.value = query;
            search(query);
            document.querySelector("#results-section")?.scrollIntoView({ behavior: "smooth" });
        });
    });

    document.querySelectorAll("[data-category]").forEach((button) => {
        button.addEventListener("click", () => {
            activeCategory = button.dataset.category;
            document.querySelectorAll("[data-category]").forEach((chip) => {
                chip.classList.toggle("is-selected", chip === button);
            });
            render();
        });
    });

    if (isExplorerPage) {
        const profile = store?.getCurrentUserProfile();
        const institutionChip = document.querySelector("#homepage-institution-chip");
        const programChip = document.querySelector("#homepage-program-chip");
        if (institutionChip) institutionChip.textContent = profile?.institution || "Votre établissement";
        if (programChip) programChip.textContent = profile?.program || "Votre parcours";
    }

    window.addEventListener("resize", () => {
        if (isExplorerPage && !currentQuery) render();
        renderInstitutions();
    });

    // Initialisation
    const initialQuery = new URLSearchParams(location.search).get("q") || "";
    if (initialQuery) {
        const input = document.querySelector("#global-search");
        if (input) input.value = initialQuery;
    }
    search(initialQuery);
    loadInstitutions();
})();