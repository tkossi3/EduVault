/* Visionneuse HD et Lecteur de Documents PDF — EduVault 2026
   Supporte le Mode Page par Page et la Vue Navigateur (Défilement Continu Plein Écran) */
(async () => {
    const params = new URLSearchParams(location.search);
    const documentId = params.get("id") || "doc-algo-2026";
    const store = window.EduVaultStore;

    // Configuration du worker PDF.js
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }

    // Récupération des métadonnées du document
    const state = store ? store.loadState() : null;
    let currentDoc = (store && typeof store.getDocumentById === "function") 
        ? store.getDocumentById(documentId) 
        : state?.documents.find((d) => d.id === documentId);

    if (!currentDoc) {
        currentDoc = {
            id: documentId,
            title: params.get("title") || "Document Académique",
            course: params.get("course") || "Cours Universitaire",
            institution: params.get("institution") || "ENP Campus Lomé (EPL)",
            program: params.get("program") || "Génie Logiciel & Systèmes d'Information (GL)",
            semester: parseInt(params.get("semester") || "3", 10),
            category: params.get("category") || "Support de Cours",
            academic_year: params.get("year") || "2025-2026",
            file_name: "document.pdf"
        };
    }

    const title = currentDoc.title || "Document Académique";
    const course = currentDoc.course || "Cours Universitaire";
    const institution = currentDoc.institution || "Établissement Universitaire";
    const program = currentDoc.program || "Filière Académique";
    const semester = currentDoc.semester || 1;
    const category = currentDoc.category || "Support de Cours";
    const year = currentDoc.academic_year || "2025-2026";

    const escapeHtml = (value = "") =>
        String(value).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[c]);

    // 1. Mise à jour des titres et badges
    const titleEl = document.querySelector("#document-title");
    const courseEl = document.querySelector("#document-course");
    const badgesEl = document.querySelector("#reader-meta-badges");

    if (titleEl) titleEl.textContent = title;
    if (courseEl) courseEl.textContent = `${institution} · ${program} · ${course} (${year})`;
    document.title = `${title} — EduVault 2026`;

    if (badgesEl) {
        const catBadgeClass = category === "Examen/Annales" ? "badge-warning" : category === "TD/TP" ? "badge-accent" : "badge-primary";
        badgesEl.innerHTML = `
            <span class="badge ${catBadgeClass}">${escapeHtml(category)}</span>
            <span class="badge badge-primary" style="background: var(--surface-raised); color: var(--text-secondary); border: 1px solid var(--line);">${escapeHtml(institution)}</span>
            <span class="badge badge-outline" style="border: 1px solid var(--line); color: var(--text-secondary);">${escapeHtml(program)}</span>
            <span class="badge badge-accent" style="font-weight: 700;">Semestre ${semester} (S${semester})</span>
        `;
    }

    // Incrémenter le compteur de vues
    if (state && currentDoc.id) {
        const storedDoc = state.documents.find(d => d.id === currentDoc.id);
        if (storedDoc) {
            storedDoc.views_count = (storedDoc.views_count || 0) + 1;
            store.saveState(state);
        }
    }

    // Éléments du DOM
    const readerContainer = document.querySelector("#reader-container");
    const readerViewport = document.querySelector("#reader-viewport");
    const loadingIndicator = document.querySelector("#pdf-loading-indicator");
    const canvasWrapper = document.querySelector("#pdf-canvas-wrapper");
    const singleCanvas = document.querySelector("#pdf-canvas");
    const continuousWrapper = document.querySelector("#pdf-continuous-wrapper");

    // Contrôles UI
    const pageNavGroup = document.querySelector("#page-nav-group");
    const continuousInfoGroup = document.querySelector("#continuous-info-group");
    const continuousPageCount = document.querySelector("#continuous-page-count");
    const pageIndicator = document.querySelector("#page-indicator");
    const pageInput = document.querySelector("#page-input");
    const zoomIndicator = document.querySelector("#zoom-indicator");
    const modeTag = document.querySelector("#reader-mode-tag");
    const toggleViewBtn = document.querySelector("#toggle-view-mode");
    const toggleViewText = document.querySelector("#toggle-view-text");
    const btnFullscreen = document.querySelector("#btn-fullscreen");
    const fullscreenText = document.querySelector("#fullscreen-text");
    const btnExpandWidth = document.querySelector("#btn-expand-width");
    const expandWidthText = document.querySelector("#expand-width-text");

    let pdfDoc = null;
    let pageNum = 1;
    let totalPages = 1;
    let scale = 1.35;
    let viewMode = "single"; // "single" (Page par Page) ou "continuous" (Vue Navigateur / Défilement continu)
    let rawPdfBlobUrl = null;
    let rawPdfBytes = null;

    // Helper: conversion Base64 DataURL -> Uint8Array
    const dataUrlToUint8Array = (dataUrl) => {
        try {
            const base64Index = dataUrl.indexOf(";base64,");
            const base64 = base64Index !== -1 ? dataUrl.slice(base64Index + 8) : dataUrl;
            const binaryStr = atob(base64);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            return bytes;
        } catch (e) {
            console.warn("Base64 decode error:", e);
            return null;
        }
    };

    // ==================== RENDU HD PAGE UNIQUE (MODE CLIC PAGE PAR PAGE) ====================
    const renderSinglePage = async (num) => {
        if (!pdfDoc || !singleCanvas) return;
        if (readerViewport) {
            readerViewport.scrollTop = 0;
            readerViewport.scrollLeft = 0;
        }

        try {
            const page = await pdfDoc.getPage(num);
            const dpr = window.devicePixelRatio || 1.5;
            const viewport = page.getViewport({ scale: scale });

            singleCanvas.width = Math.floor(viewport.width * dpr);
            singleCanvas.height = Math.floor(viewport.height * dpr);
            singleCanvas.style.width = `${Math.floor(viewport.width)}px`;
            singleCanvas.style.height = `${Math.floor(viewport.height)}px`;

            const ctx = singleCanvas.getContext("2d");
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

        } catch (err) {
            console.warn("Single page render error:", err);
        }

        updateUIIndicators();
    };

    // ==================== RENDU VUE NAVIGATEUR (DÉFILEMENT CONTINU PLEIN ÉCRAN) ====================
    const renderContinuousView = async () => {
        if (!continuousWrapper) return;
        if (readerViewport) {
            readerViewport.scrollTop = 0;
            readerViewport.scrollLeft = 0;
        }
        continuousWrapper.innerHTML = "";

        if (!pdfDoc) return;

        try {
            for (let i = 1; i <= totalPages; i++) {
                const page = await pdfDoc.getPage(i);
                const dpr = window.devicePixelRatio || 1.5;
                const viewport = page.getViewport({ scale: scale });

                const pageBox = document.createElement("div");
                pageBox.className = "pdf-page-container";
                pageBox.id = `page-container-${i}`;

                const tag = document.createElement("span");
                tag.className = "pdf-page-number-tag";
                tag.textContent = `Page ${i} / ${totalPages}`;

                const c = document.createElement("canvas");
                c.className = "pdf-page-canvas";
                c.width = Math.floor(viewport.width * dpr);
                c.height = Math.floor(viewport.height * dpr);
                c.style.width = `${Math.floor(viewport.width)}px`;
                c.style.height = `${Math.floor(viewport.height)}px`;

                const ctx = c.getContext("2d");
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

                pageBox.appendChild(tag);
                pageBox.appendChild(c);
                continuousWrapper.appendChild(pageBox);

                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;
            }
        } catch (err) {
            console.warn("Continuous render error:", err);
        }

        updateUIIndicators();
    };

    // ==================== GÉNÉRATEUR ACADÉMIQUE MULTI-PAGES HAUTE FIDÉLITÉ (DOCUMENTS EXEMPLES) ====================
    const mockPagesContent = [
        {
            num: 1,
            subtitle: "Partie I : Énoncé Officiel & Structures Fondamentales",
            sections: [
                {
                    title: "Exercice 1 — Théorie des Graphes & Plus Court Chemin (6 points)",
                    text: `Soit un graphe orienté et pondéré G = (V, E, W) représentant le réseau fédérateur interconnectant les campus universitaires de Lomé et Kara. On désigne par V = {A, B, C, D, E, F} l'ensemble des nœuds de routage.<br><br>
                    1. Écrire la matrice d'adjacence pondérée du graphe.<br>
                    2. Appliquer l'algorithme de Dijkstra pas à pas à partir du sommet source A. Détailler l'état du vecteur des distances minimales et des prédécesseurs à chaque itération.<br>
                    3. Quelle est la complexité asymptotique de cet algorithme en utilisant une file de priorité min-heap ?`
                },
                {
                    title: "Extrait de Code — Structure de Données Adjacence (C / Python)",
                    code: `typedef struct Arc {\n    int destination;\n    double poids;\n    struct Arc* suivant;\n} Arc;\n\ntypedef struct Graphe {\n    int nombreSommets;\n    Arc** listesAdjacence;\n} Graphe;`
                }
            ]
        },
        {
            num: 2,
            subtitle: "Partie II : Arbres Binaires de Recherche Équilibrés & Optimisation",
            sections: [
                {
                    title: "Exercice 2 — Arbres AVL et Rotations d'Équilibrage (7 points)",
                    text: `On considère un arbre AVL initialement vide dans lequel on insère consécutivement les clés suivantes : [45, 12, 67, 89, 34, 23, 78, 90, 10].<br><br>
                    1. Définir le facteur d'équilibre d'un nœud et la condition de balance d'un arbre AVL.<br>
                    2. Dessiner l'arbre après chaque insertion provoquant un déséquilibre. Préciser le type de rotation effectuée (Rotation Simple Gauche, Simple Droite, Double Gauche-Droite, Double Droite-Gauche).<br>
                    3. Démontrer que la hauteur h d'un arbre AVL à n nœuds vérifie h < 1.44 * log2(n + 2).`
                }
            ]
        },
        {
            num: 3,
            subtitle: "Partie III : Programmation Dynamique & Analyse Algorithmique",
            sections: [
                {
                    title: "Exercice 3 — Problème du Sac à Dos & Sous-Structure Optimale (7 points)",
                    text: `Une unité de calcul dispose d'une capacité maximale de bande passante C = 15 Gbps. On dispose de 5 flux de données à prioriser ayant chacun un poids (en Gbps) et une valeur d'utilité académique :<br>
                    • Flux 1 : (poids: 3, valeur: 12) | Flux 2 : (poids: 4, valeur: 15)<br>
                    • Flux 3 : (poids: 5, valeur: 25) | Flux 4 : (poids: 2, valeur: 8)<br>
                    • Flux 5 : (poids: 6, valeur: 28)<br><br>
                    1. Donner la relation de récurrence de Bellman pour la programmation dynamique du Sac à Dos 0/1.<br>
                    2. Construire le tableau dynamique 2D complet et expliciter le choix optimal de flux maximisant l'utilité globale.`
                }
            ]
        },
        {
            num: 4,
            subtitle: "Partie IV : Corrigé Officiel & Barème de Notation Certifié",
            sections: [
                {
                    title: "Barème Académique & Solution Synthétique",
                    text: `<strong>Exercice 1 :</strong> Initialisation correcte (1 pt) ; Tableau des itérations de Dijkstra sans erreur (3 pts) ; Complexité O((|V| + |E|) log |V|) justifiée (2 pts).<br><br>
                    <strong>Exercice 2 :</strong> Facteurs d'équilibre explicites (2 pts) ; Rotations appliquées adéquatement (3 pts) ; Démonstration de la hauteur (2 pts).<br><br>
                    <strong>Exercice 3 :</strong> Matrice DP correcte avec valeur max = 61 (4 pts) ; Rétro-traçage de la solution optimale {Flux 2, Flux 3, Flux 5} (3 pts).`
                }
            ]
        }
    ];

    const createMockPageDom = (pageData) => {
        const pageEl = document.createElement("div");
        pageEl.className = "pdf-mockup-page";
        pageEl.style.width = "100%";
        pageEl.style.maxWidth = `${Math.min(1050, Math.floor(780 * scale))}px`;
        pageEl.style.margin = "0 auto";
        pageEl.style.boxShadow = "0 10px 32px rgba(0, 0, 0, 0.12)";

        pageEl.innerHTML = `
            <div class="doc-mock-header">
                <div>
                    <span class="doc-mock-stamp">DOCUMENT OFFICIEL CERTIFIÉ · ED процессы 2026</span>
                    <h2 class="doc-mock-title" style="margin-top: 8px;">${escapeHtml(institution)}</h2>
                    <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 600;">
                        ${escapeHtml(program)} — ${escapeHtml(course)}
                    </p>
                </div>
                <div style="text-align: right; font-size: 12px; color: #64748b;">
                    <strong>Session 2025-2026</strong><br>
                    <span>Semestre ${semester} (S${semester})</span><br>
                    <span style="font-weight: 700; color: var(--primary);">Page ${pageData.num} / ${totalPages}</span>
                </div>
            </div>

            <div style="margin-bottom: 24px; padding: 12px 16px; background: #f8fafc; border-left: 4px solid #1e3a8a; border-radius: 4px;">
                <strong style="color: #1e3a8a; font-size: 14px;">${escapeHtml(pageData.subtitle)}</strong>
                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Support académique vérifié — Accès libre pour les étudiants et enseignants de la promotion.</p>
            </div>

            ${pageData.sections.map(sec => `
                <div class="doc-mock-section">
                    <h4>${escapeHtml(sec.title)}</h4>
                    ${sec.text ? `<p>${sec.text}</p>` : ''}
                    ${sec.code ? `<pre class="doc-mock-code"><code>${escapeHtml(sec.code)}</code></pre>` : ''}
                </div>
            `).join('')}

            <div style="margin-top: 40px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                <span>EduVault Lomé · Coffre-Fort Numérique Universitaire</span>
                <span>Document authentifié · Réf: ${escapeHtml(currentDoc.id)}</span>
            </div>
        `;
        return pageEl;
    };

    const renderMockSinglePage = (num) => {
        if (!canvasWrapper) return;
        canvasWrapper.innerHTML = "";
        const pageData = mockPagesContent.find(p => p.num === num) || mockPagesContent[0];
        canvasWrapper.appendChild(createMockPageDom(pageData));
        updateUIIndicators();
    };

    const renderMockContinuousView = () => {
        if (!continuousWrapper) return;
        continuousWrapper.innerHTML = "";
        mockPagesContent.forEach(pageData => {
            const container = document.createElement("div");
            container.className = "pdf-page-container";
            container.style.width = "100%";
            container.appendChild(createMockPageDom(pageData));
            continuousWrapper.appendChild(container);
        });
        updateUIIndicators();
    };

    // ==================== MISE À JOUR DES INDICATEURS ====================
    const updateUIIndicators = () => {
        if (pageIndicator) pageIndicator.textContent = `/ ${totalPages}`;
        if (pageInput) pageInput.value = pageNum;
        if (zoomIndicator) zoomIndicator.textContent = `${Math.round(scale * 100)}%`;

        if (viewMode === "continuous") {
            if (pageNavGroup) pageNavGroup.style.display = "none";
            if (continuousInfoGroup) continuousInfoGroup.style.display = "flex";
            if (continuousPageCount) {
                continuousPageCount.textContent = `Vue Navigateur (Défilement continu) · ${totalPages} pages`;
            }
            if (toggleViewText) toggleViewText.textContent = "Mode Page par Page";
            if (modeTag) modeTag.textContent = "Défilement Continu Plein Écran";
        } else {
            if (pageNavGroup) pageNavGroup.style.display = "flex";
            if (continuousInfoGroup) continuousInfoGroup.style.display = "none";
            if (toggleViewText) toggleViewText.textContent = "Vue Navigateur (Défilement continu)";
            if (modeTag) modeTag.textContent = "Mode Page par Page HD";
        }
    };

    let signedPdfUrl = null;

    // ==================== CHARGEMENT DU DOCUMENT ====================
    const loadPdfDocument = async () => {
        if (loadingIndicator) loadingIndicator.style.display = "flex";

        try {
            let fileRawData = sessionStorage.getItem(`eduvault_file_${currentDoc.id}`);
            if (!fileRawData && store) {
                fileRawData = await store.getPdfFile(currentDoc.id);
            }
            if (!fileRawData) {
                fileRawData = currentDoc.file_data || currentDoc.file_url;
            }

            let pdfSource = null;

            if (fileRawData) {
                if (typeof fileRawData === "string" && fileRawData.startsWith("data:")) {
                    rawPdfBytes = dataUrlToUint8Array(fileRawData);
                    if (rawPdfBytes) {
                        const blob = new Blob([rawPdfBytes], { type: "application/pdf" });
                        rawPdfBlobUrl = URL.createObjectURL(blob);
                        pdfSource = { data: rawPdfBytes };
                    } else {
                        pdfSource = fileRawData;
                    }
                } else if (fileRawData instanceof Uint8Array || fileRawData instanceof ArrayBuffer) {
                    const blob = new Blob([fileRawData], { type: "application/pdf" });
                    rawPdfBlobUrl = URL.createObjectURL(blob);
                    pdfSource = { data: fileRawData };
                } else if (fileRawData instanceof Blob) {
                    rawPdfBlobUrl = URL.createObjectURL(fileRawData);
                    const buf = await fileRawData.arrayBuffer();
                    pdfSource = { data: new Uint8Array(buf) };
                } else {
                    pdfSource = fileRawData;
                }
            }

            if (!pdfSource && currentDoc.id && window.pdfjsLib) {
                const config = window.EDUVAULT_CONFIG || {};
                const session = await window.EduVaultAuth?.getSession();
                const endpoint = session?.access_token
                    ? `${config.API_BASE_URL}/documents/${encodeURIComponent(currentDoc.id)}/owner-view-url`
                    : `${config.API_BASE_URL}/documents/${encodeURIComponent(currentDoc.id)}/view-url`;
                const response = await fetch(endpoint, {
                    headers: session?.access_token
                        ? { "Authorization": `Bearer ${session.access_token}` }
                        : {}
                });
                if (!response.ok) {
                    const result = await response.json().catch(() => ({}));
                    throw new Error(result.detail || `Lecture impossible (${response.status}).`);
                }
                const result = await response.json();
                signedPdfUrl = result.signed_url;
                pdfSource = signedPdfUrl;
            }

            if (!pdfSource) {
                throw new Error("Le fichier PDF original est introuvable.");
            }
            if (!window.pdfjsLib) throw new Error("Le lecteur PDF n’a pas pu être chargé.");

            const loadingTask = pdfjsLib.getDocument(pdfSource);
            pdfDoc = await loadingTask.promise;
            totalPages = pdfDoc.numPages;

            if (loadingIndicator) loadingIndicator.style.display = "none";
            await adjustFitWidth();

        } catch (err) {
            console.error("Chargement du PDF original impossible :", err);
            if (loadingIndicator) {
                loadingIndicator.style.display = "flex";
                loadingIndicator.innerHTML = `<p role="alert">${escapeHtml(err.message || "Le document ne peut pas être affiché.")}</p>`;
            }
            if (singleCanvas) singleCanvas.hidden = true;
            if (toggleViewBtn) toggleViewBtn.disabled = true;
        }
    };

    const renderCurrentMode = () => {
        if (viewMode === "continuous") {
            if (canvasWrapper) canvasWrapper.style.display = "none";
            if (continuousWrapper) continuousWrapper.style.display = "flex";
            renderContinuousView();
        } else {
            if (continuousWrapper) continuousWrapper.style.display = "none";
            if (canvasWrapper) canvasWrapper.style.display = "flex";
            renderSinglePage(pageNum);
        }
    };

    // ==================== AJUSTEMENT INTELLIGENT DE LA LARGEUR (FIT) ====================
    const adjustFitWidth = async () => {
        if (!pdfDoc || !readerViewport) return;
        const page = await pdfDoc.getPage(pageNum);
        const pageWidth = page.getViewport({ scale: 1 }).width;
        const availableWidth = readerViewport.clientWidth - 32;
        scale = Math.min(2.5, Math.max(0.25, availableWidth / pageWidth));
        renderCurrentMode();
    };

    // ==================== ÉVÉNEMENTS & INTERACTIONS ====================

    // Basculer Mode Page par Page <-> Vue Navigateur (Défilement continu)
    toggleViewBtn?.addEventListener("click", () => {
        viewMode = viewMode === "single" ? "continuous" : "single";
        renderCurrentMode();
    });

    // Plein Écran
    btnFullscreen?.addEventListener("click", () => {
        if (!document.fullscreenElement) {
            if (readerContainer?.requestFullscreen) {
                readerContainer.requestFullscreen().catch(() => {
                    readerContainer.classList.toggle("is-fullscreen");
                });
            } else {
                readerContainer?.classList.toggle("is-fullscreen");
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    });

    document.addEventListener("fullscreenchange", () => {
        const isFs = Boolean(document.fullscreenElement);
        readerContainer?.classList.toggle("is-fullscreen", isFs);
        if (fullscreenText) fullscreenText.textContent = isFs ? "Quitter plein écran" : "Plein écran";
        setTimeout(adjustFitWidth, 150);
    });

    // Pleine Largeur du lecteur
    btnExpandWidth?.addEventListener("click", () => {
        const readerMain = document.querySelector(".reader-main");
        readerMain?.classList.toggle("is-full-width");
        const isExpanded = readerMain?.classList.contains("is-full-width");
        if (expandWidthText) {
            expandWidthText.textContent = isExpanded ? "Largeur standard" : "Pleine largeur";
        }
        setTimeout(adjustFitWidth, 100);
    });

    // Navigation page par page
    document.querySelector("#previous-page")?.addEventListener("click", () => {
        if (pageNum <= 1) return;
        pageNum--;
        renderSinglePage(pageNum);
    });

    document.querySelector("#next-page")?.addEventListener("click", () => {
        if (pageNum >= totalPages) return;
        pageNum++;
        renderSinglePage(pageNum);
    });

    pageInput?.addEventListener("change", () => {
        const val = parseInt(pageInput.value, 10);
        if (val >= 1 && val <= totalPages) {
            pageNum = val;
            renderSinglePage(pageNum);
        } else {
            pageInput.value = pageNum;
        }
    });

    pageInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") pageInput.blur();
    });

    // Zoom
    document.querySelector("#zoom-in")?.addEventListener("click", () => {
        if (scale < 3.0) {
            scale = Math.round((scale + 0.15) * 100) / 100;
            renderCurrentMode();
        }
    });

    document.querySelector("#zoom-out")?.addEventListener("click", () => {
        if (scale > 0.6) {
            scale = Math.round((scale - 0.15) * 100) / 100;
            renderCurrentMode();
        }
    });

    document.querySelector("#zoom-reset")?.addEventListener("click", () => {
        scale = 1.35;
        renderCurrentMode();
    });

    document.querySelector("#zoom-fit")?.addEventListener("click", adjustFitWidth);

    // Télécharger le document
    document.querySelector("#download-document")?.addEventListener("click", async () => {
        const fileName = currentDoc.file_name || `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
        try {
            const data = rawPdfBytes || (pdfDoc ? await pdfDoc.getData() : null);
            if (!data) throw new Error("Le PDF original n’est pas disponible au téléchargement.");
            const downloadUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        } catch (error) {
            console.error("Téléchargement du PDF original impossible :", error);
            window.EduVaultAuth?.showToast(error.message || "Le PDF ne peut pas être téléchargé.", "error");
        }
    });

    // Imprimer
    document.querySelector("#print-document")?.addEventListener("click", () => {
        window.print();
    });

    // Navigation au clavier
    window.addEventListener("keydown", (e) => {
        if (document.activeElement?.tagName === "INPUT") return;
        if (e.key === "ArrowLeft" && viewMode === "single") {
            if (pageNum > 1) {
                pageNum--;
                renderSinglePage(pageNum);
            }
        } else if (e.key === "ArrowRight" && viewMode === "single") {
            if (pageNum < totalPages) {
                pageNum++;
                renderSinglePage(pageNum);
            }
        } else if (e.key === "f" || e.key === "F") {
            btnFullscreen?.click();
        }
    });

    // Démarrage initial
    await loadPdfDocument();
})();