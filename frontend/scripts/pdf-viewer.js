/* Visionneuse haute fidélité & Lecteur de documents PDF réels — EduVault 2026 */
(() => {
    const params = new URLSearchParams(location.search);
    const documentId = params.get("id") || "doc-algo-2026";
    const store = window.EduVaultStore;

    // Récupération des données du document
    const state = store ? store.loadState() : null;
    let currentDoc = (store && typeof store.getDocumentById === "function") 
        ? store.getDocumentById(documentId) 
        : state?.documents.find((d) => d.id === documentId);

    if (!currentDoc) {
        currentDoc = {
            id: documentId,
            title: params.get("title") || "Document Académique",
            course: params.get("course") || "Cours Universitaire",
            institution: params.get("institution") || "Établissement Universitaire",
            category: params.get("category") || "Support de Cours",
            academic_year: "2025-2026",
            program: "Génie Logiciel & Systèmes d'Information",
            file_data: null
        };
    }

    const title = currentDoc.title || "Document Académique";
    const course = currentDoc.course || "Cours Universitaire";
    const institution = currentDoc.institution || "Établissement Universitaire";
    const category = currentDoc.category || "Support";
    const year = currentDoc.academic_year || "2025-2026";
    const program = currentDoc.program || "";

    // Helper: escape HTML
    const escapeHtml = (value = "") =>
        String(value).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[c]);

    // En-tête de page
    const titleEl = document.querySelector("#document-title");
    const courseEl = document.querySelector("#document-course");
    if (titleEl) titleEl.textContent = title;
    if (courseEl) courseEl.textContent = `${institution}${program ? " · " + program : ""} · ${course} (${year})`;

    document.title = `${title} — EduVault 2026`;

    // Incrémenter le nombre de vues dans le store
    if (state && currentDoc.id) {
        const storedDoc = state.documents.find(d => d.id === currentDoc.id);
        if (storedDoc) {
            storedDoc.views_count = (storedDoc.views_count || 0) + 1;
            store.saveState(state);
        }
    }

    // Bannière Mode Exploration
    if (store?.isExplorationMode()) {
        const readerHeader = document.querySelector(".reader-header");
        if (readerHeader && !document.querySelector("#reader-exploration-notice")) {
            const noticeHtml = `
            <div id="reader-exploration-notice" class="alert-box alert-info" style="width: 100%; margin-top: 14px; margin-bottom: 0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                <div style="flex: 1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
                    <span><strong>Mode Consultation Libre :</strong> Vous lisez ce document certifié en accès intégral.</span>
                    <a class="button button-primary button-sm" href="login.html">
                        <span>Se connecter</span>
                    </a>
                </div>
            </div>`;
            readerHeader.insertAdjacentHTML("afterend", noticeHtml);
        }
    }

    const viewport = document.querySelector("#reader-viewport");
    const container = document.querySelector("#simulated-document-container");
    const pageIndicator = document.querySelector("#page-indicator");
    const zoomIndicator = document.querySelector("#zoom-indicator");
    const modeTag = document.querySelector("#reader-mode-tag");

    let currentPage = 1;
    let totalPages = 3;
    let zoomLevel = 100;
    let generatedPages = [];

    // ==================== RENDU 1 : FICHIER PDF RÉEL TRANSMIS ====================
    const renderNativePdf = (dataUrl) => {
        if (!viewport) return;
        if (modeTag) modeTag.textContent = "Lecture PDF Haute Fidélité";

        viewport.innerHTML = `
            <div style="width: 100%; height: 820px; position: relative;">
                <object data="${dataUrl}" type="application/pdf" class="pdf-native-frame" style="width: 100%; height: 100%; min-height: 750px;">
                    <iframe src="${dataUrl}#toolbar=1&navpanes=1" class="pdf-native-frame" style="width: 100%; height: 100%; min-height: 750px;">
                        <p>Votre navigateur ne prend pas en charge l'affichage direct des PDF. <a href="${dataUrl}" download="${currentDoc.file_name || 'document.pdf'}">Cliquez ici pour télécharger le fichier</a>.</p>
                    </iframe>
                </object>
            </div>
        `;

        if (pageIndicator) pageIndicator.textContent = "Fichier PDF Réel";
        if (zoomIndicator) zoomIndicator.textContent = "100%";
    };

    // ==================== RENDU 2 : DOCUMENT STRUCTURÉ COMPLET ====================
    const generateCompleteAcademicDocument = () => {
        const catLower = category.toLowerCase();
        const isExam = catLower.includes("exam") || catLower.includes("annale");
        const isTD = catLower.includes("td") || catLower.includes("tp");
        const isFiche = catLower.includes("fiche");

        if (isExam) {
            return [
                {
                    pageNumber: 1,
                    title: `ÉPREUVE OFFICIELLE — ${category.toUpperCase()} — SESSION ${year}`,
                    sections: [
                        {
                            heading: `1. Informations et Consignes Générales`,
                            content: `
                                <table style="width: 100%; margin-bottom: 16px; font-size: 13px; border-collapse: collapse;">
                                    <tr><td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 600;">Matière / UE :</td><td style="padding: 6px; border: 1px solid #e2e8f0;">${escapeHtml(course)}</td></tr>
                                    <tr><td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 600;">Établissement :</td><td style="padding: 6px; border: 1px solid #e2e8f0;">${escapeHtml(institution)}</td></tr>
                                    <tr><td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 600;">Filière :</td><td style="padding: 6px; border: 1px solid #e2e8f0;">${escapeHtml(program || "Tronc Commun")}</td></tr>
                                    <tr><td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: 600;">Durée de l'épreuve :</td><td style="padding: 6px; border: 1px solid #e2e8f0;">3 heures — Calculatrice autorisée</td></tr>
                                </table>
                                <p style="padding: 12px; background: #eff6ff; border-left: 4px solid #2563eb; font-size: 13px; border-radius: 4px;">
                                    <strong>Recommandations :</strong> Lisez attentivement l'intégralité du sujet avant de commencer. Justifiez systématiquement vos réponses et soignez la présentation.
                                </p>
                            `
                        },
                        {
                            heading: `Partie I — Questions de Cours & Fondements Théoriques (6 points)`,
                            content: `
                                <p><strong>Question 1.1 :</strong> Définissez les concepts clés de <em>${escapeHtml(course)}</em> et présentez leurs principales propriétés mathématiques ou algorithmiques.</p>
                                <p><strong>Question 1.2 :</strong> Exposez la différence fondamentale entre les structures séquentielles et les structures arborescentes dans ce contexte d'étude.</p>
                                <p><strong>Question 1.3 :</strong> Soit une complexité temporelle exprimée par la relation $T(n) = 2T(n/2) + O(n)$. Démontrez par le théorème maître l'ordre de grandeur asymptotique final.</p>
                            `
                        }
                    ]
                },
                {
                    pageNumber: 2,
                    title: `ÉPREUVE OFFICIELLE — ${category.toUpperCase()} (SUITE)`,
                    sections: [
                        {
                            heading: `Partie II — Problème Pratique & Modélisation (8 points)`,
                            content: `
                                <p>On considère un système distribué de traitement de données universitaires. Les données d'entrée se présentent sous la forme d'un ensemble ordonné :</p>
                                <div class="doc-mock-code">
ENTRÉE : G = (V, E) où |V| = n sommets et |E| = m arêtes pondérées
Objectif : Calculer le plus court chemin et le flot maximal admissible.
Poids des arcs : W = [ (A,B,4), (A,C,2), (B,C,1), (B,D,5), (C,D,8), (C,E,10), (D,E,2) ]
                                </div>
                                <p><strong>Travail à effectuer :</strong></p>
                                <ol style="padding-left: 20px; font-size: 13px; line-height: 1.8;">
                                    <li>Représentez graphiquement le réseau avec les pondérations associées.</li>
                                    <li>Appliquez l'algorithme pas à pas en complétant le tableau d'état des valuations.</li>
                                    <li>Évaluez la complexité spatiale et temporelle au pire des cas.</li>
                                </ol>
                            `
                        },
                        {
                            heading: `Partie III — Implémentation & Optimisation (6 points)`,
                            content: `
                                <p>Écrivez la fonction de résolution optimisée dans le langage de votre choix en respectant une complexité minimale :</p>
                                <div class="doc-mock-code">
def solve_system(graph_nodes, source, sink):
    # Initialisation des distances et des prédécesseurs
    distances = {node: float('inf') for node in graph_nodes}
    distances[source] = 0
    priority_queue = [(0, source)]
    # Traitement des priorités
    return distances
                                </div>
                            `
                        }
                    ]
                },
                {
                    pageNumber: 3,
                    title: `CORRIGÉ TYPE DÉTAILLÉ & BARÈME OFFICIEL`,
                    sections: [
                        {
                            heading: `Éléments de Correction & Barème Détaillé`,
                            content: `
                                <p><strong>Correction Partie I (6 pts) :</strong></p>
                                <p>1.1 Définition rigoureuse (2 pts) : Le modèle repose sur la décomposition hiérarchique et la conservation des flux.</p>
                                <p>1.2 Démonstration (2 pts) : D'après le théorème maître, $a = 2$, $b = 2$, $d = 1$, or $a = b^d \implies T(n) = \Theta(n \log n)$.</p>
                                <p style="margin-top: 14px;"><strong>Correction Partie II (8 pts) :</strong></p>
                                <p>Chemin optimal trouvé : $A \rightarrow C \rightarrow B \rightarrow D \rightarrow E$ avec un coût total minimal de $10$ unités.</p>
                                <div style="margin-top: 16px; padding: 12px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; color: #065f46; font-size: 13px;">
                                    ✓ Document académique vérifié par le comité pédagogique d'EduVault — Session 2026.
                                </div>
                            `
                        }
                    ]
                }
            ];
        }

        if (isTD) {
            return [
                {
                    pageNumber: 1,
                    title: `TRAVAUX DIRIGÉS & PRATIQUES — ${course.toUpperCase()}`,
                    sections: [
                        {
                            heading: `Fiche de TD — Objectifs & Prérequis`,
                            content: `
                                <p><strong>Établissement :</strong> ${escapeHtml(institution)} &nbsp;·&nbsp; <strong>Filière :</strong> ${escapeHtml(program || "Licence")}</p>
                                <p><strong>Matière :</strong> ${escapeHtml(course)} (${year})</p>
                                <p style="margin-top: 8px;"><strong>Objectifs pédagogiques :</strong> Maîtriser l'application concrète des théorèmes et algorithmes étudiés en cours magistral.</p>
                            `
                        },
                        {
                            heading: `Exercice 1 : Application directe et calculs`,
                            content: `
                                <p>Soit la suite de données suivante : $S = \{ 14, 28, 9, 42, 61, 3, 19 \}$.</p>
                                <p>1. Appliquez le traitement séquentiel et déterminez l'état des registres à chaque étape.</p>
                                <p>2. Tracez la courbe représentative des temps d'exécution en fonction de $N$.</p>
                            `
                        }
                    ]
                },
                {
                    pageNumber: 2,
                    title: `TRAVAUX DIRIGÉS (SUITE ET APPLICATIONS)`,
                    sections: [
                        {
                            heading: `Exercice 2 : Cas pratique d'ingénierie`,
                            content: `
                                <p>Un serveur web reçoit en moyenne $\lambda = 150$ requêtes par seconde selon un processus de Poisson. Le temps moyen de traitement est $\mu = 200$ req/s.</p>
                                <p>1. Calculez le taux d'occupation du système $\rho$.</p>
                                <p>2. Déterminez le temps d'attente moyen d'une requête dans la file.</p>
                            `
                        },
                        {
                            heading: `Corrigé synthétique de l'exercice 2`,
                            content: `
                                <p>$\rho = \frac{\lambda}{\mu} = \frac{150}{200} = 0.75$ (soit $75\%$ de charge serveur).</p>
                                <p>Temps d'attente moyen : $W_q = \frac{\rho}{\mu(1 - \rho)} = \frac{0.75}{200 \times 0.25} = 0.015\text{ s} = 15\text{ ms}$.</p>
                            `
                        }
                    ]
                }
            ];
        }

        // Support de cours par défaut
        return [
            {
                pageNumber: 1,
                title: `SUPPORT DE COURS MAGISTRAL — ${course.toUpperCase()}`,
                sections: [
                    {
                        heading: `Chapitre 1 — Introduction Générale & Cadre Théorique`,
                        content: `
                            <p><strong>Établissement :</strong> ${escapeHtml(institution)} &nbsp;·&nbsp; <strong>Filière :</strong> ${escapeHtml(program || "Université")}</p>
                            <p><strong>Unité d'Enseignement :</strong> ${escapeHtml(course)} &nbsp;·&nbsp; <strong>Session :</strong> ${escapeHtml(year)}</p>
                            <h4 style="margin-top: 14px; font-size: 14px;">1.1 Contexte & Définitions</h4>
                            <p>La discipline <em>${escapeHtml(course)}</em> constitue un pilier fondamental de la formation universitaire. Elle permet de modéliser avec rigueur les problématiques complexes et d'établir des solutions systématiques, robustes et extensibles.</p>
                            <h4 style="margin-top: 14px; font-size: 14px;">1.2 Principes directeurs</h4>
                            <ul style="padding-left: 20px; line-height: 1.8;">
                                <li>Modularité et décomposition des sous-systèmes.</li>
                                <li>Validation empirique et preuves formelles de convergence.</li>
                                <li>Optimisation des ressources et passage à l'échelle.</li>
                            </ul>
                        `
                    }
                ]
            },
            {
                pageNumber: 2,
                title: `CHAPITRE 2 — MODÉLISATION AVANCÉE & CAS PRATIQUES`,
                sections: [
                    {
                        heading: `2.1 Architecture & Démonstrations`,
                        content: `
                            <p>Considérons le théorème fondamental de la matière :</p>
                            <div class="doc-mock-code">
THÉORÈME : Pour toute structure ordonnée S de taille n,
l'espace mémoire requis est borné supérieurement par O(n)
et le temps de recherche moyen est en O(log n).
                            </div>
                            <p>La démonstration repose sur le découpage récursif en sous-espaces disjoints.</p>
                            <h4 style="margin-top: 14px; font-size: 14px;">2.2 Exemples de mise en œuvre</h4>
                            <p>Dans les environnements industriels et académiques actuels, ce paradigme est mis en œuvre pour garantir la haute disponibilité et la cohérence forte des données.</p>
                        `
                    }
                ]
            },
            {
                pageNumber: 3,
                title: `RÉSUMÉ DU COURS, GLOSSAIRE & RÉFÉRENCES BIBLIOGRAPHIQUES`,
                sections: [
                    {
                        heading: `Points Clés à Retenir pour l'Examen`,
                        content: `
                            <ol style="padding-left: 20px; line-height: 1.8;">
                                <li>Toujours vérifier les conditions d'initialisation et les invariants de boucle.</li>
                                <li>Maîtriser les ordres de grandeur de complexité temporelle et spatiale.</li>
                                <li>Savoir reproduire les schémas d'architecture et les équations directrices.</li>
                            </ol>
                            <div style="margin-top: 20px; padding: 12px; background: #eff6ff; border-radius: 6px; font-size: 12px; color: #1e3a8a;">
                                📚 Support certifié par la communauté universitaire EduVault — Version 2026.
                            </div>
                        `
                    }
                ]
            }
        ];
    };

    // Affichage d'une page du document structuré
    const renderStructuredPage = (pageIndex) => {
        if (!container || !generatedPages.length) return;
        const pageData = generatedPages[pageIndex - 1] || generatedPages[0];

        const sectionsHtml = pageData.sections.map((sec) => `
            <div class="doc-mock-section">
                <h4>${sec.heading}</h4>
                <div>${sec.content}</div>
            </div>
        `).join("");

        container.innerHTML = `
            <article class="pdf-mockup-page" style="transform: scale(${zoomLevel / 100}); transform-origin: top center; transition: transform 0.2s ease;">
                <div class="doc-mock-header">
                    <div>
                        <span class="doc-mock-stamp">DOCUMENT OFFICIEL CERTIFIÉ · ${escapeHtml(institution)}</span>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Filière : ${escapeHtml(program || "Université")} · Année ${escapeHtml(year)}</div>
                    </div>
                    <div style="font-size: 12px; font-weight: 700; color: #1e3a8a;">Page ${pageData.pageNumber} / ${totalPages}</div>
                </div>
                <h2 class="doc-mock-title">${pageData.title}</h2>
                <div class="doc-mock-body">
                    ${sectionsHtml}
                </div>
                <div style="margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                    <span>EduVault 2026 — Coffre Académique</span>
                    <span>Document certifié : ${escapeHtml(title)}</span>
                </div>
            </article>
        `;

        if (pageIndicator) {
            pageIndicator.textContent = `Page ${pageIndex} / ${totalPages}`;
        }
    };

    // ==================== INITIALISATION DU LECTEUR ====================
    if (currentDoc.file_data && currentDoc.file_data.startsWith("data:application/pdf")) {
        // Rendu direct du PDF réel téléchargé
        renderNativePdf(currentDoc.file_data);
    } else {
        // Rendu haute fidélité du document structuré
        generatedPages = generateCompleteAcademicDocument();
        totalPages = generatedPages.length;
        renderStructuredPage(currentPage);
    }

    // ==================== CONTRÔLES DE NAVIGATION & OUTILS ====================
    document.querySelector("#previous-page")?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderStructuredPage(currentPage);
        }
    });

    document.querySelector("#next-page")?.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderStructuredPage(currentPage);
        }
    });

    document.querySelector("#zoom-in")?.addEventListener("click", () => {
        if (zoomLevel < 180) {
            zoomLevel += 15;
            if (zoomIndicator) zoomIndicator.textContent = `${zoomLevel}%`;
            const pageEl = document.querySelector(".pdf-mockup-page");
            if (pageEl) pageEl.style.transform = `scale(${zoomLevel / 100})`;
        }
    });

    document.querySelector("#zoom-out")?.addEventListener("click", () => {
        if (zoomLevel > 60) {
            zoomLevel -= 15;
            if (zoomIndicator) zoomIndicator.textContent = `${zoomLevel}%`;
            const pageEl = document.querySelector(".pdf-mockup-page");
            if (pageEl) pageEl.style.transform = `scale(${zoomLevel / 100})`;
        }
    });

    document.querySelector("#print-document")?.addEventListener("click", () => {
        window.print();
    });

    document.querySelector("#download-document")?.addEventListener("click", () => {
        if (currentDoc.file_data) {
            const a = document.createElement("a");
            a.href = currentDoc.file_data;
            a.download = currentDoc.file_name || `${title.replace(/\s+/g, "_")}.pdf`;
            a.click();
        } else {
            // Téléchargement version imprimée / PDF
            window.print();
        }
    });
})();