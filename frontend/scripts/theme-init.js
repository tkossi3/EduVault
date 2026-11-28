/* Applique le thème sauvegardé avant le chargement des feuilles de style. */
(() => {
    try {
        const theme = localStorage.getItem("eduvault-theme");
        document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
    } catch (error) {
        console.warn("Préférence du thème inaccessible.", error);
        document.documentElement.dataset.theme = "light";
    }
})();
