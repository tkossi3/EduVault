/* L'URL de l'API est publique; ne placez jamais la clé Supabase service_role dans le frontend. */
(() => {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    // En production (Vercel), aucune API Python n'est déployée : on n'appelle pas /api
    // (chaque appel renvoyait un 404 et ralentissait les pages). Pour brancher une API,
    // définissez VITE_API_BASE_URL au moment du build.
    const apiBaseUrl = window.EDUVAULT_API_URL || (isLocalhost ? "http://localhost:8000/api" : "");
    const NO_API_PREFIX = "/__eduvault_no_api__";

    window.EDUVAULT_CONFIG = {
        API_BASE_URL: apiBaseUrl || NO_API_PREFIX,
        API_AVAILABLE: Boolean(apiBaseUrl),
        SUPABASE_URL: "https://lxywdipkwkgnuooouvoi.supabase.co",
        SUPABASE_ANON_KEY: "sb_publishable_ilLjyZ_hStVUg_w-8WjZPQ_WKwRH18P"
    };

    if (!apiBaseUrl && !window.__eduvaultFetchGuard) {
        // Les appels vers l'API absente échouent immédiatement (sans requête réseau);
        // les scripts basculent alors sur les données locales comme avant.
        const nativeFetch = window.fetch.bind(window);
        window.fetch = (input, init) => {
            const url = typeof input === "string" ? input : input?.url || "";
            if (url.startsWith(NO_API_PREFIX)) {
                return Promise.reject(new Error("API EduVault non configurée."));
            }
            return nativeFetch(input, init);
        };
        window.__eduvaultFetchGuard = true;
    }
})();
