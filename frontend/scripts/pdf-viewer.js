/* Visionneuse haute fidélité de documents académiques — EduVault 2026 */
(() => {
    const params = new URLSearchParams(location.search);
    const documentId = params.get("id") || "doc-algo-2026";
    const store = window.EduVaultStore;

    // Récupération des données du document
    const state = store ? store.loadState() : null;
    const docFromStore = state?.documents.find((d) => d.id === documentId);

    const title = params.get("title") || docFromStore?.title || "Algorithmique Avancée & Graphes — Examen Corrigé 2026";
    const course = params.get("course") || docFromStore?.course || "Algorithmique Avancée & Structures de Données";
    const institution = params.get("institution") || docFromStore?.institution || "ENP Campus Lomé";
    const category = params.get("category") || docFromStore?.category || "Examen & Annales";
    const year = docFromStore?.academic_year || "2025-2026";

    // Mise à jour de l'en-tête
    const titleEl = document.querySelector("#document-title");
    const courseEl = document.querySelector("#document-course");
    if (titleEl) titleEl.textContent = title;
    if (courseEl) courseEl.textContent = `${institution} · ${course} (${year})`;

    if (store?.isExplorationMode()) {
        const readerHeader = document.querySelector(".reader-header");
        if (readerHeader && !document.querySelector("#reader-exploration-notice")) {
            const noticeHtml = `
            <div id="reader-exploration-notice" class="alert-box alert-info" style="width: 100%; margin-top: 14px; margin-bottom: 0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                <div style="flex: 1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
                    <span><strong>Mode Exploration :</strong> Vous consultez ce document en accès libre et illimité.</span>
                    <button class="button button-primary button-sm" type="button" onclick="window.EduVaultAuth?.open('login')">
                        <span>Se connecter</span>
                    </button>
                </div>
            </div>`;
            readerHeader.insertAdjacentHTML("afterend", noticeHtml);
        }
    }

    let currentPage = 1;
    const totalPages = 3;
    let zoomLevel = 100;

    const pagesData = [
        {
            pageNumber: 1,
            title: "ÉPREUVE OFFICIELLE — SESSION 2026",
            sections: [
                {
                    heading: "Exercice 1 : Analyse de Complexité & Arbres AVL (6 points)",
                    content: `
                        <p>1. Soit un arbre binaire de recherche auto-équilibré (Arbre AVL) contenant <em>n</em> nœuds. Démontrez que la hauteur maximale <em>h</em> satisfait la relation <em>h &le; 1.44 log<sub>2</sub>(n + 2)</em>.</p>
                        <p>2. Donnez l'algorithme de rééquilibrage suite à une insertion dans le sous-arbre droit du fils gauche (Rotation Gauche-Droite).</p>
                        <div class="doc-mock-code">
// Algorithme de rotation Double Gauche-Droite
Noeud* rotationGaucheDroite(Noeud* A) {
    A->gauche = rotationGauche(A->gauche);
    return rotationDroite(A);
}
                        </div>
                    `
                },
                {
                    heading: "Exercice 2 : Théorie des Graphes & Algorithme de Dijkstra (7 points)",
                    content: `
                        <p>On considère le réseau de communication modélisé par un graphe orienté pondéré <em>G = (V, E)</em> où chaque sommet représente un nœud de calcul et chaque arête un lien de transmission à latence positive.</p>
                        <p>1. Rappelez la condition nécessaire pour l'application de l'algorithme de Dijkstra.</p>
                        <p>2. Déterminez le chemin de latence minimale reliant le serveur racine <strong>S0</strong> à l'ensemble des serveurs du campus.</p>
                    `
                }
            ]
        },
        {
            pageNumber: 2,
            title: "ÉPREUVE (SUITE) & CORRIGÉ DÉTAILLÉ",
            sections: [
                {
                    heading: "Exercice 3 : Programmation Dynamique — Sac à Dos 0/1 (7 points)",
                    content: `
                        <p>Soit <em>n</em> ressources de poids <em>w<sub>i</sub></em> et d'utilité <em>v<sub>i</sub></em> à stocker dans une partition de capacité maximale <em>W = 50 Go</em>.</p>
                        <p>1. Formulez la relation de récurrence de la sous-structure optimale <em>dp[i][w]</em>.</p>
                        <div class="doc-mock-code">
dp[i][w] = max(dp[i-1][w], dp[i-1][w - w[i]] + v[i])  // si w >= w[i]
dp[i][w] = dp[i-1][w]                                   // sinon
                        </div>
                    `
                },
                {
                    heading: "CORRIGÉ DÉTAILLÉ — EXERCICE 1",
                    content: `
                        <p><strong>Question 1 :</strong> Un arbre AVL de hauteur <em>h</em> possède un nombre minimal de nœuds <em>N(h) = N(h-1) + N(h-2) + 1</em> avec <em>N(0)=1</em> et <em>N(1)=2</em>. Par induction avec la suite de Fibonacci, on établit <em>N(h) = Fib(h+2) - 1 &ge; &Phi;<sup>h</sup> / &radic;5</em> d'où <em>h = O(log n)</em>. <strong>[2.5 pts]</strong></p>
                        <p><strong>Question 2 :</strong> La rotation Gauche-Droite rétablit le facteur d'équilibre à 0 en effectuant d'abord une rotation simple gauche sur le fils gauche, puis une rotation droite sur la racine. <strong>[3.5 pts]</strong></p>
                    `
                }
            ]
        },
        {
            pageNumber: 3,
            title: "CORRIGÉ (SUITE) & GRILLE D'ÉVALUATION",
            sections: [
                {
                    heading: "CORRIGÉ DÉTAILLÉ — EXERCICE 2 & 3",
                    content: `
                        <p><strong>Exercice 2 :</strong> L'algorithme de Dijkstra garantit l'optimalité car toutes les pondérations (latences) sont strictement positives (&ge; 0). Avec une file de priorité min-heap, la complexité temporelle est <em>O((|V| + |E|) log |V|)</em>. <strong>[7 pts]</strong></p>
                        <p><strong>Exercice 3 :</strong> Tableau de programmation dynamique 2D complété avec valeur optimale maximale = <strong>148 unités d'utilité</strong> pour un temps d'exécution en <em>O(n &times; W)</em>. <strong>[7 pts]</strong></p>
                    `
                },
                {
                    heading: "Barème & Remarques du Correcteur (EduVault 2026)",
                    content: `
                        <ul>
                            <li><strong>Rigueur des démonstrations mathématiques :</strong> 4 points</li>
                            <li><strong>Exactitude des pseudo-codes :</strong> 10 points</li>
                            <li><strong>Optimisation et analyse de complexité asymptotique :</strong> 6 points</li>
                        </ul>
                        <p style="color: var(--accent); font-weight: 700; margin-top: 12px;">Document certifié conforme au programme officiel des grandes écoles universitaires du Togo (Session 2026).</p>
                    `
                }
            ]
        }
    ];

    const renderCurrentPage = () => {
        const container = document.querySelector("#simulated-document-container");
        const pageIndicator = document.querySelector("#page-indicator");
        const prevBtn = document.querySelector("#previous-page");
        const nextBtn = document.querySelector("#next-page");
        const zoomIndicator = document.querySelector("#zoom-indicator");

        if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} / ${totalPages}`;
        if (prevBtn) prevBtn.disabled = currentPage <= 1;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
        if (zoomIndicator) zoomIndicator.textContent = `${zoomLevel}%`;

        const data = pagesData[currentPage - 1];

        if (container) {
            container.innerHTML = `
                <article class="pdf-mockup-page" style="transform: scale(${zoomLevel / 100}); transform-origin: top center; transition: transform 0.2s ease;">
                    <div class="doc-mock-header">
                        <div>
                            <span style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.05em;">
                                ${escapeHtml(institution)}
                            </span>
                            <h2 style="margin: 4px 0 0; font-family: 'Manrope', sans-serif; font-size: 16px; color: #0f172a;">
                                ${escapeHtml(course)}
                            </h2>
                        </div>
                        <div style="text-align: right;">
                            <span class="doc-mock-stamp">Certifié EduVault 2026</span>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Session ${escapeHtml(year)}</div>
                        </div>
                    </div>

                    <h3 class="doc-mock-title">${escapeHtml(data.title)}</h3>

                    ${data.sections.map((sec) => `
                        <div class="doc-mock-section">
                            <h4>${sec.heading}</h4>
                            ${sec.content}
                        </div>
                    `).join("")}

                    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                        <span>EduVault — Le coffre-fort académique des étudiants</span>
                        <span>Page ${currentPage} sur ${totalPages}</span>
                    </div>
                </article>
            `;
        }
    };

    // Événements de navigation
    document.querySelector("#previous-page")?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderCurrentPage();
            window.scrollTo({ top: 120, behavior: "smooth" });
        }
    });

    document.querySelector("#next-page")?.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderCurrentPage();
            window.scrollTo({ top: 120, behavior: "smooth" });
        }
    });

    // Zoom
    document.querySelector("#zoom-in")?.addEventListener("click", () => {
        if (zoomLevel < 150) {
            zoomLevel += 15;
            renderCurrentPage();
        }
    });

    document.querySelector("#zoom-out")?.addEventListener("click", () => {
        if (zoomLevel > 70) {
            zoomLevel -= 15;
            renderCurrentPage();
        }
    });

    // Impression
    document.querySelector("#print-document")?.addEventListener("click", () => {
        window.print();
    });

    // Téléchargement
    document.querySelector("#download-document")?.addEventListener("click", () => {
        const textContent = `=== EDUVAULT ACADEMIC VAULT 2026 ===\nDocument : ${title}\nÉtablissement : ${institution}\nCours : ${course}\nAnnée : ${year}\nCatégorie : ${category}\n\nCe document a été certifié et téléchargé depuis EduVault (https://eduvault.tg).\n\nConsultez l'ensemble de vos ressources académiques sur EduVault.`;
        const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_EduVault_2026.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    renderCurrentPage();
})();