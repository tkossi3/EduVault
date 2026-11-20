/* Espace modérateur : vérifier, approuver ou refuser les documents déposés. */
(() => {
    const api = window.EduVaultApi;
    const auth = window.EduVaultAuth;
    const gate = document.querySelector("#moderation-gate");
    const app = document.querySelector("#moderation-app");
    const list = document.querySelector("#moderation-list");
    if (!gate || !app || !list) return;

    let currentStatus = "pending";

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
    const formatSize = (bytes) => (bytes ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo` : "PDF");
    const formatDate = (value) => {
        try {
            return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
        } catch {
            return "";
        }
    };

    const showGate = (title, message, action = "") => {
        app.hidden = true;
        gate.hidden = false;
        gate.innerHTML = `
            <div class="empty-state" style="display: block;">
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(message)}</p>
                ${action}
            </div>`;
    };

    const actionsFor = (status) => {
        const approve = `<button class="button button-sm button-primary" type="button" data-action="approve">Approuver</button>`;
        const reject = `<button class="button button-sm button-danger" type="button" data-action="reject">Refuser</button>`;
        const reset = `<button class="button button-sm button-outline" type="button" data-action="reset">Remettre en attente</button>`;
        if (status === "pending") return approve + reject;
        if (status === "approved") return reject + reset;
        return approve + reset;
    };

    const render = (payload) => {
        Object.entries(payload.counts || {}).forEach(([status, count]) => {
            const counter = document.querySelector(`[data-count="${status}"]`);
            if (counter) counter.textContent = count;
        });

        if (!payload.documents.length) {
            const emptyText = {
                pending: "Aucun document en attente. Tout est à jour !",
                approved: "Aucun document approuvé pour le moment.",
                rejected: "Aucun document refusé."
            }[payload.status];
            list.innerHTML = `<div class="empty-state" style="display: block;"><p>${emptyText}</p></div>`;
            return;
        }

        list.innerHTML = payload.documents.map((doc) => {
            const params = new URLSearchParams({
                id: doc.id,
                title: doc.title,
                course: doc.course,
                institution: doc.institution,
                program: doc.program,
                semester: doc.semester,
                category: doc.category,
                year: doc.academic_year
            });
            return `
            <article class="moderation-card" data-doc-id="${escapeHtml(doc.id)}">
                <div class="moderation-card-main">
                    <div class="moderation-card-badges">
                        <span class="badge badge-primary">${escapeHtml(doc.category)}</span>
                        <span class="badge badge-accent">Semestre ${escapeHtml(doc.semester)} (S${escapeHtml(doc.semester)})</span>
                        <span class="badge badge-outline">${escapeHtml(doc.academic_year)}</span>
                    </div>
                    <h3>${escapeHtml(doc.title)}</h3>
                    <p class="moderation-card-meta">
                        <strong>Matière :</strong> ${escapeHtml(doc.course)}<br>
                        ${escapeHtml(doc.institution)} · ${escapeHtml(doc.program)}
                    </p>
                    <p class="moderation-card-author">
                        Déposé par <strong>${escapeHtml(doc.uploader_name)}</strong> le ${escapeHtml(formatDate(doc.created_at))} · ${formatSize(doc.file_size)}
                    </p>
                </div>
                <div class="moderation-card-actions">
                    <a class="button button-sm button-outline" href="document-view.html?${params}" target="_blank" rel="noopener">Voir le PDF</a>
                    ${actionsFor(payload.status)}
                </div>
            </article>`;
        }).join("");
    };

    const load = async () => {
        list.innerHTML = `<p class="loading-state">Chargement des documents…</p>`;
        const response = await api.fetch(`/moderation/documents?status=${encodeURIComponent(currentStatus)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            list.innerHTML = `<div class="empty-state" style="display: block;"><p>${escapeHtml(payload.detail || "Chargement impossible.")}</p></div>`;
            return;
        }
        render(payload);
    };

    list.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const card = button.closest("[data-doc-id]");
        const action = button.dataset.action;
        if (action === "reject" && !confirm("Refuser ce document ? Il ne sera pas visible dans la bibliothèque.")) return;

        card.querySelectorAll("button").forEach((item) => { item.disabled = true; });
        const response = await api.fetch(`/moderation/documents/${encodeURIComponent(card.dataset.docId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            auth?.showToast(result.detail || "La décision n'a pas pu être enregistrée.", "error");
            card.querySelectorAll("button").forEach((item) => { item.disabled = false; });
            return;
        }
        auth?.showToast({
            approve: "Document approuvé : il est maintenant visible dans la bibliothèque.",
            reject: "Document refusé.",
            reset: "Document remis en attente."
        }[action], "success");
        await load();
    });

    document.querySelectorAll("[data-status]").forEach((tab) => {
        tab.addEventListener("click", () => {
            currentStatus = tab.dataset.status;
            document.querySelectorAll("[data-status]").forEach((item) => {
                const active = item === tab;
                item.classList.toggle("is-active", active);
                item.setAttribute("aria-selected", String(active));
            });
            load();
        });
    });
    document.querySelector("#moderation-refresh")?.addEventListener("click", load);

    const init = async () => {
        if (!api?.client) {
            showGate("Service indisponible", "Supabase n'est pas configuré.");
            return;
        }
        const { data } = await api.client.auth.getSession();
        if (!data?.session) {
            showGate("Connexion requise", "Connectez-vous avec un compte modérateur pour accéder à cet espace.",
                `<a class="button button-primary" href="login.html" style="margin-top: 14px;">Se connecter</a>`);
            return;
        }
        if (!(await api.isModerator())) {
            showGate("Accès réservé", "Cet espace est réservé aux modérateurs EduVault.");
            return;
        }
        gate.hidden = true;
        app.hidden = false;
        load();
    };

    init();
})();
