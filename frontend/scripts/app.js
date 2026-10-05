/* Recherche, filtres et interactions dynamiques de la page d'accueil EduVault */
(() => {
    const config = window.EDUVAULT_CONFIG;
    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;
    const results = document.querySelector("#document-results");
    if (!results) return;

    let activeCategory = "";
    let currentDocuments = [];

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ 
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" 
    })[char]);

    const formatSize = (bytes) => {
        if (!bytes) return "PDF";
        return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
    };

    const render = () => {
        const visible = currentDocuments.filter((item) => !activeCategory || item.category === activeCategory);
        const emptyState = document.querySelector("#empty-state");
        if (emptyState) emptyState.hidden = visible.length > 0;

        if (!visible.length) {
            results.innerHTML = "";
            return;
        }

        results.innerHTML = visible.map((item) => {
            const params = new URLSearchParams({ 
                id: item.id, 
                title: item.title, 
                course: item.course || "Ressource académique",
                institution: item.institution || "ENP Campus Lomé",
                program: item.program || "Filière Académique",
                semester: item.semester || 1,
                category: item.category || "Support de cours"
            });
            
            const categoryBadgeClass = item.category === "Examen/Annales" 
                ? "badge-warning" 
                : item.category === "TD/TP" 
                ? "badge-accent" 
                : "badge-primary";

            const semesterTag = item.semester ? `S${item.semester}` : "S1";

            return `
            <article class="document-card">
                <div class="document-card-top">
                    <span class="badge ${categoryBadgeClass}">${escapeHtml(item.category)}</span>
                    <span class="badge badge-accent" style="font-weight: 700; font-size: 11px;">
                        Semestre ${item.semester || 1} (${semesterTag})
                    </span>
                </div>
                
                <h3>${escapeHtml(item.title)}</h3>

                <div class="doc-card-hierarchy-tags">
                    <span class="doc-chip doc-chip-inst">${escapeHtml(item.institution || "ENP Campus Lomé")}</span>
                    <span class="doc-chip doc-chip-prog">${escapeHtml(item.program || "Tronc Commun")}</span>
                </div>

                <p class="doc-card-course">
                    <strong>Matière :</strong> ${escapeHtml(item.course || "Cours académique")}
                </p>

                <div class="document-card-footer">
                    <span>${escapeHtml(item.academic_year || "2025-2026")} · ${formatSize(item.file_size)}</span>
                    <a class="action-read" href="pages/document-view.html?${params}">
                        <span>Consulter</span>
                        ${icons?.arrowRight || '→'}
                    </a>
                </div>
            </article>`;
        }).join("");
    };

    const search = async (query = "") => {
        results.innerHTML = '<div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 40px;"><p>Recherche des documents en cours…</p></div>';
        const emptyState = document.querySelector("#empty-state");
        if (emptyState) emptyState.hidden = true;
        
        const titleEl = document.querySelector("#results-title");
        if (titleEl) {
            titleEl.textContent = query ? `Résultats pour « ${query} »` : "Documents récents & populaires";
        }

        const normalizedQuery = query.toLowerCase().trim();

        try {
            const response = await fetch(`${config.API_BASE_URL}/documents/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error("API Offline");
            const data = await response.json();
            currentDocuments = data.documents || [];
            if (!currentDocuments.length && !query) {
                currentDocuments = store?.loadState().documents || [];
            }
        } catch {
            const state = store?.loadState();
            const allDocs = state?.documents || [];
            if (!normalizedQuery) {
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

        let institutions = [];
        try {
            const response = await fetch(`${config.API_BASE_URL}/catalog`);
            if (response.ok) {
                const data = await response.json();
                institutions = data.institutions || [];
            } else {
                institutions = store?.loadState().institutions || [];
            }
        } catch {
            institutions = store?.loadState().institutions || [];
        }

        container.innerHTML = institutions.map((inst) => `
            <a href="pages/parcours.html?inst=${encodeURIComponent(inst.id)}" class="institution-card">
                <div class="institution-icon">
                    ${inst.name.slice(0, 1)}
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
    };

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

    // Initialisation
    const initialQuery = new URLSearchParams(location.search).get("q") || "";
    if (initialQuery) {
        const input = document.querySelector("#global-search");
        if (input) input.value = initialQuery;
    }
    search(initialQuery);
    loadInstitutions();
})();