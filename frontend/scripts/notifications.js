/* Synchronise le compteur de notifications dans la topbar sur toutes les pages */
(() => {
    const refresh = () => {
        if (window.EduVaultStore) {
            window.EduVaultStore.updateBadgeUI();
        }
    };

    document.addEventListener("DOMContentLoaded", refresh);
    document.addEventListener("eduvault:auth", refresh);
    window.EduVaultNotifications = { refresh };
})();