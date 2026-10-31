/* Visionneuse HD et Lecteur de Documents PDF — EduVault 2026
   Supporte le Mode Page par Page et la Vue Navigateur (Défilement Continu Plein Écran) */
(async () => {
    const params = new URLSearchParams(location.search);
    const documentId = params.get("id");
    const store = window.EduVaultStore;
    const currentAcademicYear = () => {
        const year = new Date().getFullYear();
        return `${year}-${year + 1}`;
    };

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
            institution: params.get("institution") || "École Polytechnique de Lomé (EPL)",
            program: params.get("program") || "Génie Logiciel (GL)",
            semester: parseInt(params.get("semester") || "3", 10),
            category: params.get("category") || "Support de Cours",
            academic_year: params.get("year") || currentAcademicYear(),
            file_name: "document.pdf"
        };
    }

    const title = currentDoc.title || "Document Académique";
    const course = currentDoc.course || "Cours Universitaire";
    const institution = currentDoc.institution || "Établissement Universitaire";
    const program = currentDoc.program || "Filière Académique";
    const semester = currentDoc.semester || 1;
    const category = currentDoc.category || "Support de Cours";
    const year = currentDoc.academic_year || currentAcademicYear();

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
    document.title = `${title} — EduVault`;

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
    let rawPdfBytes = null;

    const showReaderError = (message) => {
        if (loadingIndicator) {
            const errorMessage = document.createElement("p");
            errorMessage.setAttribute("role", "alert");
            errorMessage.textContent = message;
            loadingIndicator.replaceChildren(errorMessage);
            loadingIndicator.style.display = "flex";
        }
        if (canvasWrapper) canvasWrapper.style.display = "none";
        if (continuousWrapper) continuousWrapper.style.display = "none";
        if (toggleViewBtn) toggleViewBtn.disabled = true;
        for (const button of [
            document.querySelector("#download-document"),
            document.querySelector("#print-document"),
            document.querySelector("#previous-page"),
            document.querySelector("#next-page"),
            document.querySelector("#zoom-in"),
            document.querySelector("#zoom-out"),
            document.querySelector("#zoom-reset"),
            document.querySelector("#zoom-fit"),
            pageInput
        ]) {
            if (button) button.disabled = true;
        }
        if (modeTag) modeTag.textContent = "Document indisponible";
    };

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
            console.error("Single page render error:", err);
            showReaderError("Cette page du document PDF n’a pas pu être affichée.");
            return;
        }

        updateUIIndicators();
    };

    // ==================== RENDU VUE NAVIGATEUR (DÉFILEMENT CONTINU PLEIN ÉCRAN) ====================
    const renderContinuousView = async () => {
        if (!continuousWrapper) return;
        const targetPageNum = pageNum;
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
            console.error("Continuous render error:", err);
            showReaderError("Le document PDF n’a pas pu être affiché en entier.");
            return;
        }

        const targetPage = continuousWrapper.querySelector(`#page-container-${targetPageNum}`);
        if (targetPage && readerViewport) {
            const viewportTop = readerViewport.getBoundingClientRect().top;
            const pageTop = targetPage.getBoundingClientRect().top;
            readerViewport.scrollTop += pageTop - viewportTop - 12;
            readerViewport.scrollLeft = 0;
        }
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
            if (toggleViewText) toggleViewText.textContent = "Lecture page par page";
            if (modeTag) modeTag.textContent = "Défilement continu";
        } else {
            if (pageNavGroup) pageNavGroup.style.display = "flex";
            if (continuousInfoGroup) continuousInfoGroup.style.display = "none";
            if (toggleViewText) toggleViewText.textContent = "Défilement continu";
            if (modeTag) modeTag.textContent = "Lecture page par page";
        }
    };

    // ==================== CHARGEMENT DU DOCUMENT ====================
    const loadPdfDocument = async () => {
        if (loadingIndicator) loadingIndicator.style.display = "flex";

        try {
            if (!documentId) {
                throw new Error("Aucun document n’a été sélectionné.");
            }
            if (!window.pdfjsLib) {
                throw new Error("Le lecteur PDF n’a pas pu être chargé.");
            }

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
                        pdfSource = { data: rawPdfBytes };
                    } else {
                        pdfSource = fileRawData;
                    }
                } else if (fileRawData instanceof Uint8Array || fileRawData instanceof ArrayBuffer) {
                    pdfSource = { data: fileRawData };
                } else if (fileRawData instanceof Blob) {
                    const buf = await fileRawData.arrayBuffer();
                    pdfSource = { data: new Uint8Array(buf) };
                } else {
                    pdfSource = fileRawData;
                }
            }

            if (!pdfSource && currentDoc.id) {
                const config = window.EDUVAULT_CONFIG || {};
                const session = await window.EduVaultAuth?.getSession();
                if (!config.API_BASE_URL) {
                    throw new Error("L’adresse de l’API n’est pas configurée.");
                }
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
                pdfSource = result.signed_url;
            }

            if (!pdfSource) {
                throw new Error("Le fichier PDF original est introuvable.");
            }

            const loadingTask = pdfjsLib.getDocument(pdfSource);
            pdfDoc = await loadingTask.promise;
            totalPages = pdfDoc.numPages;

            if (loadingIndicator) loadingIndicator.style.display = "none";
            await adjustFitWidth();

        } catch (err) {
            console.error("Impossible de charger le document PDF demandé :", err);
            pdfDoc = null;
            showReaderError(
                err instanceof Error
                    ? `Impossible de lire le document fourni : ${err.message}`
                    : "Impossible de lire le document fourni."
            );
        }
    };

    const renderCurrentMode = () => {
        if (!pdfDoc) return;

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

    let scrollUpdateScheduled = false;
    readerViewport?.addEventListener("scroll", () => {
        if (viewMode !== "continuous" || scrollUpdateScheduled) return;
        scrollUpdateScheduled = true;
        requestAnimationFrame(() => {
            scrollUpdateScheduled = false;
            const viewportTop = readerViewport.getBoundingClientRect().top;
            const pageContainers = continuousWrapper?.querySelectorAll(".pdf-page-container") || [];
            for (const pageContainer of pageContainers) {
                if (pageContainer.getBoundingClientRect().bottom > viewportTop + 12) {
                    const visiblePage = Number(pageContainer.id.replace("page-container-", ""));
                    if (Number.isInteger(visiblePage) && visiblePage >= 1 && visiblePage <= totalPages) {
                        pageNum = visiblePage;
                        updateUIIndicators();
                    }
                    break;
                }
            }
        });
    }, { passive: true });

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
            if (data) {
                const downloadUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            } else {
                throw new Error("Le fichier PDF original n’est pas disponible au téléchargement.");
            }
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