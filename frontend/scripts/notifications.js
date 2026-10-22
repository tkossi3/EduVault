/* Synchronise le compteur de notifications dans la topbar sur toutes les pages */
(() => {
    const store = window.EduVaultStore;
    const refresh = () => {
        store?.updateBadgeUI();
    };

    const trigger = document.querySelector(".notification-link");
    const actions = trigger?.parentElement;
    if (trigger && actions) {
        const popup = document.createElement("section");
        const pagePrefix = location.pathname.includes("/pages/") ? "" : "pages/";
        popup.className = "notification-popover";
        popup.id = "notification-popover";
        popup.hidden = true;
        popup.setAttribute("role", "dialog");
        popup.setAttribute("aria-label", "Notifications récentes");
        popup.innerHTML = `
            <div class="notification-popover-heading">
                <strong>Notifications</strong>
                <a href="${trigger.getAttribute("href")}">Tout voir</a>
            </div>
            <div class="notification-popover-list" aria-live="polite"></div>`;
        actions.appendChild(popup);
        trigger.setAttribute("aria-controls", popup.id);
        trigger.setAttribute("aria-haspopup", "dialog");
        trigger.setAttribute("aria-expanded", "false");

        const renderPopup = () => {
            const list = popup.querySelector(".notification-popover-list");
            const notifications = (store?.getNotifications?.() || []).filter((item) => !item.is_demo);
            const recent = notifications.slice(0, 4);
            if (!recent.length) {
                list.textContent = "Aucune notification pour le moment.";
                return;
            }
            list.replaceChildren(...recent.map((item) => {
                const entry = document.createElement("a");
                entry.className = `notification-popover-item${item.is_read ? "" : " is-unread"}`;
                entry.href = item.document_id
                    ? `${pagePrefix}document-view.html?id=${encodeURIComponent(item.document_id)}&title=${encodeURIComponent(item.title || "")}`
                    : trigger.getAttribute("href");
                const title = document.createElement("strong");
                title.textContent = item.title || "Nouvelle notification";
                const date = document.createElement("small");
                date.textContent = item.created_at
                    ? new Date(item.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                    : "Récemment";
                entry.append(title, date);
                entry.addEventListener("click", () => {
                    if (!item.is_read) store?.markNotificationAsRead?.(item.id);
                    closePopup();
                });
                return entry;
            }));
        };

        const closePopup = () => {
            popup.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        };

        trigger.addEventListener("click", (event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            if (popup.hidden) {
                renderPopup();
                popup.hidden = false;
                trigger.setAttribute("aria-expanded", "true");
            } else {
                closePopup();
            }
        });
        document.addEventListener("click", (event) => {
            if (!actions.contains(event.target)) closePopup();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closePopup();
        });
    }

    document.addEventListener("DOMContentLoaded", refresh);
    document.addEventListener("eduvault:auth", refresh);
    window.EduVaultNotifications = { refresh };
})();