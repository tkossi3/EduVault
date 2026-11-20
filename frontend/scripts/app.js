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
    const institutionKey = (value = "") => String(value)
        .replace(/^\s*[A-Z]{2,6}\s*[-–:]\s*/, "")
        .replace(/\([^)]*\)/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    // Défilement continu en boucle : avance tout seul, et l'utilisateur peut faire glisser
    // dans les deux sens (deux doigts sur pavé tactile, doigt sur mobile/tablette, Maj + molette).
    const MARQUEE_SPEED_PX_PER_SECOND = 45;
    const MARQUEE_GAP = 16;
    const USER_IDLE_DELAY_MS = 700; // reprise du défilement automatique après un geste
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const marqueeStates = new WeakMap();

    const marqueeCardWidth = (containerWidth) => {
        if (containerWidth >= 1000) return (containerWidth - MARQUEE_GAP * 3) / 4;
        if (containerWidth >= 640) return Math.min(340, containerWidth * 0.42);
        return Math.min(containerWidth * 0.84, 340);
    };

    const stopMarquee = (container) => {
        const state = marqueeStates.get(container);
        if (state?.frame) cancelAnimationFrame(state.frame);
        if (state) state.frame = null;
    };

    const bindMarqueeInteractions = (container) => {
        let state = marqueeStates.get(container);
        if (state) return state;
        state = { frame: null, position: 0, lastSet: 0, loop: 0, userUntil: 0 };
        marqueeStates.set(container, state);

        const markUserActive = () => { state.userUntil = performance.now() + USER_IDLE_DELAY_MS; };
        container.addEventListener("touchstart", markUserActive, { passive: true });
        container.addEventListener("touchmove", markUserActive, { passive: true });
        container.addEventListener("wheel", (event) => {
            if (Math.abs(event.deltaX) > 0 || event.shiftKey) markUserActive();
        }, { passive: true });
        container.addEventListener("scroll", () => {
            if (!state.loop) return;
            // Défilement provoqué par l'utilisateur : on reprend sa position et on boucle si besoin.
            if (Math.abs(container.scrollLeft - state.lastSet) > 1) {
                markUserActive();
                let left = container.scrollLeft;
                if (left >= state.loop) left -= state.loop;
                else if (left <= 0) left += state.loop;
                if (left !== container.scrollLeft) container.scrollLeft = left;
                state.position = left;
                state.lastSet = container.scrollLeft;
            }
        }, { passive: true });
        return state;
    };

    const syncAutoCarousel = (container) => {
        if (!container) return;
        stopMarquee(container);

        const existingTrack = container.querySelector(":scope > .marquee-track");
        if (existingTrack) {
            const originals = [...existingTrack.children].filter((child) => !child.dataset.carouselClone);
            container.replaceChildren(...originals);
        }
        container.classList.remove("is-marquee");

        const cards = [...container.children];
        if (!container.classList.contains("is-carousel") || !cards.length) return;

        const containerWidth = container.clientWidth;
        if (!containerWidth) return;
        const cardWidth = marqueeCardWidth(containerWidth);
        const stride = cardWidth + MARQUEE_GAP;

        // Pas assez de cartes pour remplir la largeur : affichage fixe, sans copies visibles.
        if (cards.length * stride <= containerWidth + MARQUEE_GAP) return;

        const track = document.createElement("div");
        track.className = "marquee-track";
        track.style.setProperty("--marquee-card-width", `${cardWidth}px`);
        track.style.setProperty("--marquee-gap", `${MARQUEE_GAP}px`);
        track.append(...cards);
        // Une copie de la série : la position boucle sur la première série, dans les deux sens.
        cards.forEach((card) => {
            const clone = card.cloneNode(true);
            clone.dataset.carouselClone = "true";
            clone.setAttribute("aria-hidden", "true");
            clone.setAttribute("tabindex", "-1");
            clone.querySelectorAll("a, button").forEach((element) => element.setAttribute("tabindex", "-1"));
            track.append(clone);
        });
        container.append(track);
        container.classList.add("is-marquee");

        const state = bindMarqueeInteractions(container);
        state.loop = cards.length * stride;
        state.position = Math.min(Math.max(state.position, 1), state.loop - 1);
        container.scrollLeft = state.position;
        state.lastSet = container.scrollLeft;

        if (reducedMotion.matches) return; // défilement manuel uniquement

        let previous = 0;
        const step = (time) => {
            const elapsed = previous ? Math.min(time - previous, 100) : 0;
            previous = time;
            if (!document.hidden && time >= state.userUntil && elapsed) {
                state.position += (elapsed / 1000) * MARQUEE_SPEED_PX_PER_SECOND;
                if (state.position >= state.loop) state.position -= state.loop;
                container.scrollLeft = state.position;
                state.lastSet = container.scrollLeft;
            } else if (time < state.userUntil) {
                state.position = container.scrollLeft;
            }
            state.frame = requestAnimationFrame(step);
        };
        state.frame = requestAnimationFrame(step);
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
            const programName = item.program || pageParams.get("program") || "Parcours non précisé";
            const semester = item.semester || pageParams.get("semester") || 1;
            const params = new URLSearchParams({
                id: item.id, 
                title: item.title, 
                course: courseName,
                institution: institutionName,
                program: programName,
                semester,
                category: item.category || "Support de cours",
                year: item.academic_year || currentAcademicYear()
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
                const response = await window.EduVaultApi.fetch(`/catalog/courses/${encodeURIComponent(courseId)}/documents`);
                if (!response.ok) throw new Error(`Chargement du cours impossible (${response.status}).`);
                currentDocuments = await response.json();
            } else {
                const response = await window.EduVaultApi.fetch(`/documents/search?q=${encodeURIComponent(query)}`);
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
            const response = await window.EduVaultApi.fetch(`/catalog`);
            if (!response.ok) throw new Error(`Réponse API ${response.status}`);
            const data = await response.json();
            const localInstitutions = store?.loadState().institutions || [];
            const listingByName = new Map();
            localInstitutions.forEach((institution) => {
                [institution.name, ...(institution.aliases || [])].forEach((name) => {
                    listingByName.set(institutionKey(name), institution.is_listed !== false);
                });
            });
            institutions = (data.institutions || []).map((institution) => {
                const listed = listingByName.get(institutionKey(institution.name));
                return {
                    ...institution,
                    is_listed: listed === undefined ? institution.is_listed === true : listed
                };
            });
            const remoteNames = new Set(institutions.flatMap((institution) =>
                [institution.name, ...(institution.aliases || [])].map(institutionKey)
            ));
            localInstitutions.forEach((institution) => {
                if (
                    institution.is_listed !== false
                    && ![institution.name, ...(institution.aliases || [])].some((name) => remoteNames.has(institutionKey(name)))
                ) {
                    institutions.push(institution);
                }
            });
            currentInstitutions = institutions;
            renderInstitutions();
        } catch (error) {
            console.warn("Catalogue des établissements indisponible; données locales affichées.", error);
        }
    };

    const renderInstitutions = () => {
        const container = document.querySelector("#institution-list");
        if (!container) return;
        const visibleInstitutions = currentInstitutions.filter((inst) =>
            inst.is_listed !== false && !/(?:à vérifier|à confirmer)/i.test(inst.name)
        );
        container.classList.toggle("is-carousel", isExplorerPage);
        container.innerHTML = visibleInstitutions.map((inst) => `
            <a href="${catalogHref}?inst=${encodeURIComponent(inst.id)}" class="institution-card">
                ${icons?.institutionMark?.(inst) || `<div class="institution-icon" aria-hidden="true">${escapeHtml(inst.name.slice(0, 1))}</div>`}
                <div class="institution-card-content">
                    <strong>${escapeHtml(inst.name)}</strong>
                    <small>${escapeHtml([inst.city, inst.country && inst.country !== "Togo" ? inst.country : ""].filter(Boolean).join(", ") || "Togo")} · ${inst.sector === "interstate" ? "Inter-États" : inst.sector === "private" ? "Privé" : "Public"}</small>
                </div>
                <span class="institution-card-arrow" aria-hidden="true">
                    ${icons?.arrowRight || '→'}
                </span>
            </a>
        `).join("");

        const moreLink = document.querySelector("#institutions-more");
        if (moreLink) moreLink.hidden = visibleInstitutions.length === 0;
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

    // Recalcul uniquement si la largeur change (la barre d'adresse mobile déclenche des « resize » verticaux).
    let lastViewportWidth = window.innerWidth;
    let resizeTimer = null;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth === lastViewportWidth) return;
            lastViewportWidth = window.innerWidth;
            if (isExplorerPage && !currentQuery) render();
            renderInstitutions();
        }, 200);
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