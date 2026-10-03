/* Construit l’arborescence établissement > filière > semestre > cours > documents */
(() => {
    const root = document.querySelector("#catalog-tree");
    if (!root) return;

    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;

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
        if (!data.institutions.length) {
            root.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${icons?.building || ''}</div>
                    <h3>Le catalogue académique est en cours de synchronisation</h3>
                    <p>Les établissements et filières apparaîtront ici.</p>
                </div>`;
            return;
        }

        root.innerHTML = data.institutions.map((institution) => {
            const programs = data.programs.filter((program) => program.institution_id === institution.id);
            return `
            <details class="institution-accordion">
                <summary>
                    <div class="institution-icon" style="width: 36px; height: 36px; border-radius: 8px; font-size: 14px;">
                        ${institution.name.slice(0, 1)}
                    </div>
                    <div>
                        <strong>${escapeHtml(institution.name)}</strong>
                        <small>${escapeHtml(institution.city || "Lomé")} · ${escapeHtml(institution.description || "Campus Universitaire")}</small>
                    </div>
                    <span class="accordion-chevron" style="margin-left: auto; color: var(--muted); font-size: 16px;">▾</span>
                </summary>
                
                <div class="program-list">
                    ${programs.length ? programs.map((program) => {
                        const courses = data.courses.filter((course) => course.program_id === program.id);
                        const semesters = Array.from({ length: 6 }, (_, index) => index + 1);
                        
                        return `
                        <details class="program-accordion">
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
                                        `).join("") : '<p style="font-size: 12px; color: var(--muted); margin: 4px 0;">Matières à venir</p>'}
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

    // Si un établissement spécifique est ciblé dans l'URL
    const targetInstId = new URLSearchParams(location.search).get("inst");
    if (targetInstId) {
        const accordions = root.querySelectorAll(".institution-accordion");
        if (accordions.length > 0) {
            accordions[0].open = true;
        }
    }
})();