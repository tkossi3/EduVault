/* Gestion du thème clair par défaut avec bascule dynamique et icônes SVG */
(() => {
    const key = "eduvault-theme";
    // Thème clair par défaut explicite
    const saved = localStorage.getItem(key) || "light";
    document.documentElement.dataset.theme = saved;

    const updateButtons = (theme) => {
        const icons = window.EduVaultIcons;
        const iconSvg = theme === "dark" 
            ? (icons?.sun || '<span aria-hidden="true">☼</span>') 
            : (icons?.moon || '<span aria-hidden="true">☾</span>');
        
        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            button.innerHTML = iconSvg;
            button.setAttribute("title", theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre");
            button.setAttribute("aria-label", theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre");
        });
    };

    const applyTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(key, theme);
        updateButtons(theme);
    };

    document.addEventListener("DOMContentLoaded", () => {
        updateButtons(document.documentElement.dataset.theme || "light");
        
        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            button.addEventListener("click", () => {
                const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
                const next = current === "dark" ? "light" : "dark";
                applyTheme(next);
            });
        });
    });

    // Exposition globale
    window.EduVaultTheme = { applyTheme, getTheme: () => document.documentElement.dataset.theme || "light" };
})();