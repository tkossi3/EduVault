/* Gestion interactive et réactive de la page des notifications EduVault */
(() => {
    const root = document.querySelector("#notifications-list");
    if (!root) return;

    const store = window.EduVaultStore;
    const icons = window.EduVaultIcons;
    let currentTab = "all"; // 'all' ou 'unread'

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ 
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" 
    })[char]);

    const formatDate = (isoString) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
        } catch {
            return "Récemment";
        }
    };

    const render = () => {
        const allNotifs = store ? store.getNotifications() : [];
        const unreadCount = allNotifs.filter((n) => !n.is_read).length;

        // Mise à jour des compteurs d'onglets
        const countAll = document.querySelector("#count-all");
        const countUnread = document.querySelector("#count-unread");
        if (countAll) countAll.textContent = allNotifs.length;
        if (countUnread) countUnread.textContent = unreadCount;

        const filtered = currentTab === "unread" 
            ? allNotifs.filter((n) => !n.is_read) 
            : allNotifs;

        if (!filtered.length) {
            root.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        ${icons?.bell || ''}
                    </div>
                    <h3>${currentTab === "unread" ? "Aucune notification non lue" : "Aucune notification"}</h3>
                    <p>Vous recevrez des alertes dès qu'un nouveau document est partagé dans votre établissement.</p>
                </div>`;
            return;
        }

        root.innerHTML = filtered.map((item) => {
            const isApproval = item.type === "approval" || item.type === "upload_success";
            const iconSvg = isApproval 
                ? (icons?.checkCircle || icons?.check) 
                : (icons?.fileText || icons?.bell);
            
            return `
            <article class="notification-card ${item.is_read ? "" : "is-unread"}" data-id="${item.id}">
                <div class="notification-icon ${isApproval ? 'icon-approval' : ''}">
                    ${iconSvg}
                </div>
                <div class="notification-body">
                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${formatDate(item.created_at)}</small>
                </div>
                <div class="notification-actions">
                    ${item.document_id ? `
                        <a class="button button-outline button-sm" href="document-view.html?id=${encodeURIComponent(item.document_id)}&title=${encodeURIComponent(item.title)}">
                            ${icons?.eye || ''}
                            <span>Consulter</span>
                        </a>` : ''}
                    ${item.is_read ? '' : `
                        <button class="button button-outline button-sm btn-mark-read" type="button" data-id="${item.id}" title="Marquer comme lu">
                            ${icons?.check || ''}
                            <span>Lu</span>
                        </button>`}
                    <button class="icon-button btn-delete-notif" type="button" data-id="${item.id}" title="Supprimer cette alerte" style="width: 32px; height: 32px;">
                        ${icons?.trash || '×'}
                    </button>
                </div>
            </article>`;
        }).join("");

        // Attachement des écouteurs sur chaque bouton de carte
        root.querySelectorAll(".btn-mark-read").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                store.markNotificationAsRead(id);
                render();
            });
        });

        root.querySelectorAll(".btn-delete-notif").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                store.deleteNotification(id);
                render();
            });
        });
    };

    // Gestion des onglets
    const tabAll = document.querySelector("#tab-all");
    const tabUnread = document.querySelector("#tab-unread");

    tabAll?.addEventListener("click", () => {
        currentTab = "all";
        tabAll.classList.add("is-active");
        tabUnread?.classList.remove("is-active");
        render();
    });

    tabUnread?.addEventListener("click", () => {
        currentTab = "unread";
        tabUnread.classList.add("is-active");
        tabAll?.classList.remove("is-active");
        render();
    });

    // Bouton tout marquer comme lu
    document.querySelector("#mark-all-read-btn")?.addEventListener("click", () => {
        store.markAllNotificationsAsRead();
        render();
    });

    // Chargement initial
    render();
})();