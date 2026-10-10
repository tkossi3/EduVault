/* Construit l’arborescence établissement > filière > semestre > cours > documents
   Supporte la recherche instantanée et les filtres Publics / Privés — EduVault 2026 */
(() => {
    const root = document.querySelector("#catalog-tree");
    if (!root) return;

    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;
    const searchInput = document.querySelector("#catalog-search");
    const sectorFilterBtns = document.querySelectorAll("#catalog-sector-filters button");

    let currentSector = "all";
    let currentSearch = "";

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ 
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" 
    })[char]);

    const formatSize = (bytes) => bytes ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo` : "PDF";

    const loadCourseDocuments = (course, target, instName) => {
        const state = store ? store.loadState() : null;
        const docs = state?.documents.filter((d) => d.course_id === course.id || d.course === course.name) || [];

        if (!docs.length) {
            target.innerHTML = `
                <div style="padding: 12px; color: var(--muted); font-size: 13px;">
                    <p style="margin: 0 0 8px;">Aucun document n'a encore été déposé pour cette matière.</p>
                    <a class="button button-outline button-sm" href="upload.html">
                        ${icons?.plus || '+'}
                        <span>Déposer le premier document</span>
                    </a>
                </div>`;
            return;
        }

        target.innerHTML = docs.map((doc) => {
            const params = new URLSearchParams({
                id: doc.id,
                title: doc.title,
                course: course.name,
                institution: instName,
                program: doc.program || "",
                semester: doc.semester || course.semester || 1,
                category: doc.category
            });

            return `
            <a class="course-document" href="document-view.html?${params}">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--primary);">${icons?.fileText || ''}</span>
                    <div>
                        <strong>${escapeHtml(doc.title)}</strong>
                        <div style="font-size: 11px; color: var(--muted);">
                            <span class="badge badge-primary" style="padding: 1px 6px; font-size: 9px;">${escapeHtml(doc.category)}</span>
                            &nbsp;·&nbsp; ${escapeHtml(doc.academic_year || "2025-2026")} &nbsp;·&nbsp; ${formatSize(doc.file_size)}
                        </div>
                    </div>
                </div>
                <span class="action-read" style="display: inline-flex; align-items: center; gap: 4px; color: var(--primary); font-weight: 700; font-size: 12px;">
                    <span>Consulter</span>
                    ${icons?.arrowRight || '→'}
                </span>
            </a>`;
        }).join("");
    };

    const render = (data) => {
        let institutions = data.institutions || [];

        // Filtrer par secteur (public / privé)
        if (currentSector !== "all") {
            institutions = institutions.filter((inst) => inst.sector === currentSector);
        }

        // Filtrer par recherche textuelle (école ou filière)
        if (currentSearch.trim()) {
            const query = currentSearch.trim().toLowerCase();
            institutions = institutions.filter((inst) => {
                const matchInst = inst.name.toLowerCase().includes(query) || (inst.description && inst.description.toLowerCase().includes(query));
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
            let programs = data.programs.filter((program) => program.institution_id === institution.id);

            if (currentSearch.trim()) {
                const query = currentSearch.trim().toLowerCase();
                const filteredProgs = programs.filter((p) => p.name.toLowerCase().includes(query));
                if (filteredProgs.length > 0) {
                    programs = filteredProgs;
                }
            }

            const isPublic = institution.sector === "public";
            const badgeClass = isPublic ? "badge-primary" : "badge-accent";
            const badgeLabel = isPublic ? "Public / Université" : "Privé Agréé";
            const autoOpen = Boolean(currentSearch.trim());

            return `
            <details class="institution-accordion" ${autoOpen ? "open" : ""}>
                <summary>
                    <div class="institution-icon" style="width: 38px; height: 38px; border-radius: 8px; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; background: ${isPublic ? 'var(--primary-light)' : 'var(--accent-soft)'}; color: ${isPublic ? 'var(--primary)' : 'var(--accent)'}; border: 1px solid ${isPublic ? 'var(--primary-border)' : 'var(--accent-border)'};">
                        ${institution.name.slice(0, 1)}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 2px;">
                            <strong style="font-size: 15px;">${escapeHtml(institution.name)}</strong>
                            <span class="badge ${badgeClass}" style="font-size: 10px; padding: 2px 7px;">${badgeLabel}</span>
                        </div>
                        <small style="color: var(--muted);">${escapeHtml(institution.city || "Lomé")} · ${escapeHtml(institution.description || "Formation en informatique & technologies")}</small>
                    </div>
                    <span class="accordion-chevron" style="margin-left: auto; color: var(--muted); font-size: 16px;">▾</span>
                </summary>
                
                <div class="program-list">
                    <div style="padding: 10px 16px; background: var(--surface-raised); border-bottom: 1px solid var(--line); font-size: 12px; font-weight: 600; color: var(--text-secondary);">
                        Filières et parcours accrédités (${programs.length})
                    </div>
                    ${programs.length ? programs.map((program) => {
                        const courses = data.courses.filter((course) => course.program_id === program.id);
                        const semesters = (store && typeof store.getSemestersForProgram === "function")
                            ? store.getSemestersForProgram(program.id)
                            : Array.from({ length: 6 }, (_, index) => index + 1);
                        
                        return `
                        <details class="program-accordion" ${autoOpen ? "open" : ""}>
                            <summary>
                                <div>
                                    <strong>${escapeHtml(program.name)}</strong>
                                    <small>${escapeHtml(program.degree || "Licence & Master")}</small>
                                </div>
                                <span class="badge badge-outline" style="margin-left: auto; font-size: 11px;">
                                    ${courses.length} matières
                                </span>
                                <span class="accordion-chevron" style="margin-left: 10px; color: var(--muted);">▾</span>
                            </summary>
                            
                            <div class="semester-grid">
                                ${semesters.map((semester) => {
                                    const semesterCourses = courses.filter((course) => course.semester === semester);
                                    return `
                                    <section class="semester-block">
                                        <h3>Semestre ${semester} (S${semester})</h3>
                                        ${semesterCourses.length ? semesterCourses.map((course) => `
                                            <div class="course-row">
                                                <button class="course-toggle" type="button" aria-expanded="false" data-course-id="${course.id}" data-inst-name="${escapeHtml(institution.name)}">
                                                    <span>${escapeHtml(course.name)}</span>
                                                    <span style="font-size: 11px; color: var(--muted);">${escapeHtml(course.code || "UE")}</span>
                                                </button>
                                                <div class="course-documents" id="course-${course.id}" hidden></div>
                                            </div>
                                        `).join("") : `
                                            <div style="padding: 8px 4px;">
                                                <p style="font-size: 12px; color: var(--muted); margin: 0 0 6px;">Matières ouvertes au dépôt</p>
                                                <a class="text-button" href="upload.html" style="font-size: 11px; font-weight: 700; color: var(--primary);">+ Déposer pour ce semestre</a>
                                            </div>
                                        `}
                                    </section>`;
                                }).join("")}
                            </div>
                        </details>`;
                    }).join("") : '<p style="padding: 16px; color: var(--muted); font-size: 13px;">Aucune filière répertoriée pour cet établissement.</p>'}
                </div>
            </details>`;
        }).join("");

        // Toggle des documents par matière
        root.querySelectorAll(".course-toggle").forEach((button) => {
            button.addEventListener("click", () => {
                const panel = root.querySelector(`#course-${CSS.escape(button.dataset.courseId)}`);
                if (!panel) return;
                const open = panel.hidden;
                panel.hidden = !open;
                button.setAttribute("aria-expanded", String(open));
                if (open) {
                    const course = data.courses.find((item) => item.id === button.dataset.courseId);
                    if (course) {
                        loadCourseDocuments(course, panel, button.dataset.instName);
                    }
                }
            });
        });
    };

    // Chargement initial
    const state = store.loadState();
    render(state);

    // Événements de recherche et filtres
    searchInput?.addEventListener("input", (e) => {
        currentSearch = e.target.value;
        render(store.loadState());
    });

    sectorFilterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            sectorFilterBtns.forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            currentSector = btn.dataset.sector || "all";
            render(store.loadState());
        });
    });

    // Si un établissement spécifique est ciblé dans l'URL
    const targetInstId = new URLSearchParams(location.search).get("inst");
    if (targetInstId) {
        const accordions = root.querySelectorAll(".institution-accordion");
        if (accordions.length > 0) {
            accordions[0].open = true;
        }
    }
})();