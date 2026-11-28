/* Synchronise le compteur de notifications dans la topbar sur toutes les pages */
(() => {
    const store = window.EduVaultStore;
    const api = window.EduVaultApi;
    const setBadgeCount = (notifications) => {
        const unreadCount = notifications.filter((notification) => !notification.is_demo && !notification.is_read).length;
        document.querySelectorAll("#notification-count, .notification-count").forEach((badge) => {
            badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
            badge.hidden = unreadCount === 0;
            badge.style.display = unreadCount ? "grid" : "none";
        });
    };
    const load = async () => {
        if (api?.fetch) {
            try {
                const response = await api.fetch("/notifications");
                if (response.ok) return { notifications: await response.json(), remote: true };
                if (response.status !== 401) {
                    const result = await response.json().catch(() => ({}));
                    console.error("Chargement des notifications distantes impossible :", result.detail || response.status);
                }
            } catch (error) {
                console.error("Chargement des notifications distantes impossible :", error);
            }
        }
        return { notifications: store?.getNotifications?.() || [], remote: false };
    };
    const refresh = async () => {
        store?.updateBadgeUI();
        const { notifications } = await load();
        setBadgeCount(notifications);
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

        const renderPopup = async () => {
            const list = popup.querySelector(".notification-popover-list");
            list.textContent = "Chargement des notifications…";
            const { notifications: loadedNotifications, remote } = await load();
            if (popup.hidden) return;
            const notifications = loadedNotifications.filter((item) => !item.is_demo);
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
                entry.addEventListener("click", async () => {
                    if (!item.is_read) {
                        if (remote) {
                            try {
                                const response = await api.fetch(`/notifications/${encodeURIComponent(item.id)}/read`, { method: "PATCH" });
                                if (!response.ok) throw new Error(`Réponse API ${response.status}`);
                            } catch (error) {
                                console.error("Mise à jour de la notification impossible :", error);
                                window.EduVaultAuth?.showToast("La notification n'a pas pu être mise à jour.", "error");
                            }
                        }
                        store?.markNotificationAsRead?.(item.id);
                        refresh();
                    }
                    closePopup();
                });
                return entry;
            }));
        };

        const closePopup = () => {
            popup.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        };

        const positionMobilePopup = () => {
            if (!window.matchMedia("(max-width: 600px)").matches) return;
            const triggerRect = trigger.getBoundingClientRect();
            popup.style.setProperty("--notification-popover-top", `${triggerRect.bottom + 10}px`);
        };

        trigger.addEventListener("click", async (event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            if (popup.hidden) {
                positionMobilePopup();
                popup.hidden = false;
                trigger.setAttribute("aria-expanded", "true");
                await renderPopup();
            } else {
                closePopup();
            }
        });
        window.addEventListener("resize", () => {
            if (!popup.hidden) positionMobilePopup();
        });
        document.addEventListener("click", (event) => {
            if (!actions.contains(event.target)) closePopup();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closePopup();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", refresh);
    } else {
        refresh();
    }
    document.addEventListener("eduvault:auth", refresh);
    document.addEventListener("eduvault:auth_state_changed", refresh);
    window.EduVaultNotifications = { load, refresh };
})();