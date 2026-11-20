/* Configuration publique d'EduVault.
 *
 * SUPABASE_URL et SUPABASE_ANON_KEY : « Project URL » et « Publishable key » du projet
 * Supabase (Project Settings → Data API / API Keys). Ces deux valeurs sont publiques.
 * Ne mettez JAMAIS la « Secret key » (service_role) ici : ce fichier est servi au navigateur.
 *
 * Les données passent directement par Supabase (scripts/supabase-api.js). Une API HTTP
 * externe n'est utilisée que si VITE_API_BASE_URL est défini au moment du build.
 */
window.EDUVAULT_CONFIG = {
    API_BASE_URL: window.EDUVAULT_API_URL || "",
    API_AVAILABLE: Boolean(window.EDUVAULT_API_URL),
    SUPABASE_URL: "https://VOTRE-PROJECT-REF.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_VOTRE_CLE"
};
