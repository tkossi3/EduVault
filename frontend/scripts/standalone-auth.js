/* Authentication for the dedicated login and registration pages. */
(() => {
    const config = window.EDUVAULT_CONFIG || {};
    const sdk = window.supabase;
    const store = window.EduVaultStore;
    const form = document.querySelector("#standalone-login-form, #standalone-register-form");
    const feedback = document.querySelector("#login-feedback, #register-feedback");
    const googleButton = document.querySelector("#login-google-btn, #signup-google-btn");

    if (!form || !feedback) return;

    let client = null;
    if (sdk?.createClient && config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
        try {
            client = sdk.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
        } catch (error) {
            console.error("Initialisation de l’authentification Supabase impossible.", error);
        }
    }

    const isSignup = form.id === "standalone-register-form";
    const showFeedback = (message, isSuccess = false) => {
        feedback.className = isSuccess ? "form-feedback is-success" : "form-feedback";
        feedback.textContent = message;
    };
    const requireClient = () => {
        if (client) return true;
        showFeedback("Connexion indisponible : vérifiez la configuration publique Supabase.");
        return false;
    };
    const saveAuthenticatedProfile = (user, fallback = {}) => {
        if (!store || !user) return;
        const metadata = user.user_metadata || {};
        store.loginUser({
            id: user.id,
            email: user.email || fallback.email || "",
            name: metadata.name || metadata.full_name || fallback.name || user.email?.split("@")[0] || "Étudiant",
            institution: metadata.institution || fallback.institution,
            program: metadata.program || fallback.program,
            level: metadata.level || fallback.level
        });
    };
    const setBusy = (busy) => {
        form.querySelector('button[type="submit"]')?.toggleAttribute("disabled", busy);
        if (googleButton) googleButton.disabled = busy;
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!requireClient()) return;

        const values = new FormData(form);
        const email = String(values.get("email") || "").trim();
        const password = String(values.get("password") || "");
        const profile = {
            name: String(values.get("name") || email.split("@")[0]).trim(),
            email,
            institution: String(values.get("institution") || ""),
            program: String(values.get("program") || ""),
            level: String(values.get("level") || "")
        };
        setBusy(true);
        showFeedback("");

        try {
            const result = isSignup
                ? await client.auth.signUp({
                    email,
                    password,
                    options: { data: profile }
                })
                : await client.auth.signInWithPassword({ email, password });

            if (result.error) {
                showFeedback(result.error.message);
                return;
            }

            if (isSignup && !result.data.session) {
                showFeedback("Compte créé. Vérifiez vos e-mails pour confirmer l’inscription.", true);
                return;
            }

            saveAuthenticatedProfile(result.data.user, profile);
            showFeedback(isSignup ? "Compte créé. Redirection…" : "Connexion réussie. Redirection…", true);
            window.setTimeout(() => {
                window.location.assign(new URL("profile.html", window.location.href).href);
            }, 350);
        } catch (error) {
            console.error("Échec de l’authentification.", error);
            showFeedback(error instanceof Error ? error.message : "La connexion a échoué. Réessayez.");
        } finally {
            setBusy(false);
        }
    });

    googleButton?.addEventListener("click", async () => {
        if (!requireClient()) return;
        setBusy(true);
        showFeedback("");

        try {
            const { error } = await client.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: new URL("profile.html", window.location.href).href
                }
            });
            if (error) showFeedback(error.message);
        } catch (error) {
            console.error("La connexion Google a échoué.", error);
            showFeedback(error instanceof Error ? error.message : "La connexion Google a échoué. Réessayez.");
        } finally {
            setBusy(false);
        }
    });
})();
