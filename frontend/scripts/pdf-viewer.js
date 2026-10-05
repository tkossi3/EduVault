/* Lecteur & Visionneuse de documents PDF réels — EduVault 2026 */
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
            institution: params.get("institution") || "ENP Campus Lomé",
            program: params.get("program") || "Génie Logiciel & Systèmes d'Information",
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

    // Helper: escape HTML
    const escapeHtml = (value = "") =>
        String(value).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[c]);

    // 1. Mise à jour de l'en-tête et du titre
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

    // Éléments UI
    const loadingIndicator = document.querySelector("#pdf-loading-indicator");
    const canvasWrapper = document.querySelector("#pdf-canvas-wrapper");
    const canvas = document.querySelector("#pdf-canvas");
    const nativeWrapper = document.querySelector("#pdf-native-wrapper");
    const pageIndicator = document.querySelector("#page-indicator");
    const pageInput = document.querySelector("#page-input");
    const zoomIndicator = document.querySelector("#zoom-indicator");
    const modeTag = document.querySelector("#reader-mode-tag");
    const toggleViewBtn = document.querySelector("#toggle-view-mode");
    const toggleViewText = document.querySelector("#toggle-view-text");

    let pdfDoc = null;
    let pageNum = 1;
    let totalPages = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let scale = 1.35;
    let rawPdfBlobUrl = null;
    let rawPdfBytes = null;
    let isNativeView = false;

    // Conversion DataURL Base64 -> Uint8Array
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

    // ==================== RENDU EXACT VIA PDF.JS ====================
    const renderPage = async (num) => {
        if (!pdfDoc || !canvas) return;
        pageRendering = true;

        try {
            const page = await pdfDoc.getPage(num);
            const dpr = window.devicePixelRatio || 1.5;
            const viewport = page.getViewport({ scale: scale });

            canvas.width = Math.floor(viewport.width * dpr);
            canvas.height = Math.floor(viewport.height * dpr);
            canvas.style.width = `${Math.floor(viewport.width)}px`;
            canvas.style.height = `${Math.floor(viewport.height)}px`;

            const ctx = canvas.getContext("2d");
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            pageRendering = false;

            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        } catch (err) {
            console.warn("PDF Page render error:", err);
            pageRendering = false;
        }

        // Mise à jour indicateurs
        if (pageIndicator) pageIndicator.textContent = `/ ${totalPages}`;
        if (pageInput) pageInput.value = num;
        if (zoomIndicator) zoomIndicator.textContent = `${Math.round(scale * 100)}%`;
        if (modeTag) modeTag.textContent = "Document Original Intégral";
    };

    const queueRenderPage = (num) => {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    };

    // ==================== CHARGEMENT DU FICHIER PDF EXACT ====================
    const loadPdfDocument = async () => {
        if (loadingIndicator) loadingIndicator.style.display = "flex";

        try {
            // 1. Recherche du fichier dans les différents caches
            let fileRawData = sessionStorage.getItem(`eduvault_file_${currentDoc.id}`);
            
            if (!fileRawData && currentDoc.id) {
                const activePdf = sessionStorage.getItem("eduvault_active_pdf");
                if (activePdf) {
                    fileRawData = activePdf;
                }
            }

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

            if (!pdfSource) {
                throw new Error("Fichier introuvable");
            }

            // Chargement PDF.js
            const loadingTask = pdfjsLib.getDocument(pdfSource);
            pdfDoc = await loadingTask.promise;
            totalPages = pdfDoc.numPages;

            if (loadingIndicator) loadingIndicator.style.display = "none";
            if (canvasWrapper) canvasWrapper.style.display = "flex";

            pageNum = 1;
            renderPage(pageNum);

        } catch (err) {
            console.warn("Erreur chargement PDF.js:", err);

            // Si le fichier existe sous forme d'URL Blob, afficher directement dans l'iframe
            if (rawPdfBlobUrl && nativeWrapper) {
                if (loadingIndicator) loadingIndicator.style.display = "none";
                nativeWrapper.style.display = "block";
                nativeWrapper.innerHTML = `
                    <iframe src="${rawPdfBlobUrl}#toolbar=1" style="width: 100%; height: 850px; border: none; border-radius: var(--radius-sm);" title="${escapeHtml(title)}"></iframe>
                `;
                return;
            }

            if (loadingIndicator) {
                loadingIndicator.innerHTML = `
                    <div style="text-align: center; padding: 24px;">
                        <p style="font-weight: 700; color: var(--text); font-size: 16px;">Lecture du document</p>
                        <p style="font-size: 13px; color: var(--muted); margin: 8px 0 16px;">Le fichier est prêt dans votre espace.</p>
                        <button class="button button-primary" id="btn-reload-pdf">
                            <span>Recharger la page</span>
                        </button>
                    </div>
                `;
                document.querySelector("#btn-reload-pdf")?.addEventListener("click", () => location.reload());
            }
        }
    };

    // ==================== CONTRÔLES & INTERACTIONS ====================

    // Page précédente
    document.querySelector("#previous-page")?.addEventListener("click", () => {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPage(pageNum);
    });

    // Page suivante
    document.querySelector("#next-page")?.addEventListener("click", () => {
        if (pageNum >= totalPages) return;
        pageNum++;
        queueRenderPage(pageNum);
    });

    // Saisie directe de page
    pageInput?.addEventListener("change", () => {
        const val = parseInt(pageInput.value, 10);
        if (val >= 1 && val <= totalPages) {
            pageNum = val;
            queueRenderPage(pageNum);
        } else {
            pageInput.value = pageNum;
        }
    });

    pageInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            pageInput.blur();
        }
    });

    // Zoom +
    document.querySelector("#zoom-in")?.addEventListener("click", () => {
        if (scale < 3.0) {
            scale += 0.15;
            queueRenderPage(pageNum);
        }
    });

    // Zoom -
    document.querySelector("#zoom-out")?.addEventListener("click", () => {
        if (scale > 0.5) {
            scale -= 0.15;
            queueRenderPage(pageNum);
        }
    });

    // Reset Zoom
    document.querySelector("#zoom-reset")?.addEventListener("click", () => {
        scale = 1.35;
        queueRenderPage(pageNum);
    });

    // Ajuster à la largeur
    document.querySelector("#zoom-fit")?.addEventListener("click", () => {
        const containerWidth = canvasWrapper ? canvasWrapper.clientWidth - 40 : 800;
        if (pdfDoc) {
            pdfDoc.getPage(pageNum).then((page) => {
                const unscaledViewport = page.getViewport({ scale: 1.0 });
                scale = Math.min(2.5, Math.max(0.6, containerWidth / unscaledViewport.width));
                queueRenderPage(pageNum);
            });
        }
    });

    // Basculer mode vue Navigateur / Lecteur Canvas
    toggleViewBtn?.addEventListener("click", () => {
        isNativeView = !isNativeView;
        if (isNativeView) {
            if (canvasWrapper) canvasWrapper.style.display = "none";
            if (nativeWrapper) {
                nativeWrapper.style.display = "block";
                const sourceUrl = rawPdfBlobUrl || currentDoc.file_url;
                nativeWrapper.innerHTML = `
                    <iframe src="${sourceUrl}#toolbar=1&navpanes=1" style="width: 100%; height: 850px; border: none; border-radius: var(--radius-sm);" title="${escapeHtml(title)}"></iframe>
                `;
            }
            if (toggleViewText) toggleViewText.textContent = "Vue Lecteur HD";
            if (modeTag) modeTag.textContent = "Mode Navigateur Intégré";
        } else {
            if (nativeWrapper) {
                nativeWrapper.style.display = "none";
                nativeWrapper.innerHTML = "";
            }
            if (canvasWrapper) canvasWrapper.style.display = "flex";
            if (toggleViewText) toggleViewText.textContent = "Vue Navigateur";
            if (modeTag) modeTag.textContent = "Document Original Intégral";
            queueRenderPage(pageNum);
        }
    });

    // Télécharger le PDF EXACT
    document.querySelector("#download-document")?.addEventListener("click", () => {
        const fileName = currentDoc.file_name || `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
        const urlToDownload = rawPdfBlobUrl || currentDoc.file_data;

        if (urlToDownload) {
            const a = document.createElement("a");
            a.href = urlToDownload;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            window.print();
        }
    });

    // Imprimer le document
    document.querySelector("#print-document")?.addEventListener("click", () => {
        window.print();
    });

    // Navigation au clavier (Flèches gauche / droite)
    window.addEventListener("keydown", (e) => {
        if (document.activeElement?.tagName === "INPUT") return;
        if (e.key === "ArrowLeft") {
            if (pageNum > 1) {
                pageNum--;
                queueRenderPage(pageNum);
            }
        } else if (e.key === "ArrowRight") {
            if (pageNum < totalPages) {
                pageNum++;
                queueRenderPage(pageNum);
            }
        }
    });

    // Démarrage
    await loadPdfDocument();
})();