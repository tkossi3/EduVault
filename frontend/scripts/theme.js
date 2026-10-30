/* Gestion du thÃ¨me clair par dÃ©faut avec bascule dynamique et icÃ´nes SVG */
(() => {
    const key = "eduvault-theme";
    // ThÃ¨me clair par dÃ©faut explicite
    const saved = localStorage.getItem(key) || "light";
    document.documentElement.dataset.theme = saved;

    const updateButtons = (theme) => {
        const icons = window.EduVaultIcons;
        const iconSvg = theme === "dark" 
            ? (icons?.sun || '<span aria-hidden="true">â˜¼</span>') 
            : (icons?.moon || '<span aria-hidden="true">â˜¾</span>');
        
        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            button.innerHTML = iconSvg;
            button.setAttribute("title", theme === "dark" ? "Passer au thÃ¨me clair" : "Passer au thÃ¨me sombre");
            button.setAttribute("aria-label", theme === "dark" ? "Passer au thÃ¨me clair" : "Passer au thÃ¨me sombre");
        });
    };

    const applyTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(key, theme);
        updateButtons(theme);
    };

    const initThemeControls = () => {
        updateButtons(document.documentElement.dataset.theme || "light");

        document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
            button.addEventListener("click", () => {
                const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
                const next = current === "dark" ? "light" : "dark";
                applyTheme(next);
            });
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initThemeControls);
    } else {
        initThemeControls();
    }

    // Exposition globale
    window.EduVaultTheme = { applyTheme, getTheme: () => document.documentElement.dataset.theme || "light" };
})();
