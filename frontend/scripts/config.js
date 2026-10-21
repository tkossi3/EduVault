/* L'URL de l'API est publique; ne placez jamais la clé Supabase service_role dans le frontend. */
window.EDUVAULT_CONFIG = {
    API_BASE_URL: window.EDUVAULT_API_URL || (
        ["localhost", "127.0.0.1"].includes(window.location.hostname)
            ? "http://localhost:8000/api"
            : "/api"
    ),
    SUPABASE_URL: "https://your-project.supabase.co",
    SUPABASE_ANON_KEY: "your-supabase-anon-key"
};
