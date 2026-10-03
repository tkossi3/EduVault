/* Client Supabase Auth & Gestionnaire d'identité EduVault */
(() => {
    const config = window.EDUVAULT_CONFIG;
    const sdk = window.supabase;
    const dialog = document.querySelector("#auth-dialog");
    const store = window.EduVaultStore;
    let client = null;
    let isSignUp = false;
    let requestedAction = null;

    if (sdk?.createClient && config?.SUPABASE_URL && !config.SUPABASE_URL.includes("your-project")) {
        client = sdk.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    }

    const getSession = async () => (await client?.auth.getSession())?.data.session ?? null;

    const open = (message = "Connectez-vous pour accéder à votre espace.", action = null) => {
        requestedAction = action;
        const text = document.querySelector("#auth-message");
        if (!dialog) {
            window.location.assign("../index.html?auth=1");
            return;
        }
        if (text) text.textContent = message;
        dialog?.showModal();
    };

    const updateAccount = async (session) => {
        const label = document.querySelector("#account-initials");
        const button = document.querySelector("#account-button");
        
        let initial = "K";
        let email = "etudiant@eduvault.tg";

        if (session?.user?.email) {
            email = session.user.email;
            initial = email.slice(0, 1).toUpperCase();
        } else if (store) {
            const profile = store.getCurrentUserProfile();
            initial = (profile.name || "K").slice(0, 1).toUpperCase();
            email = profile.email || "etudiant@eduvault.tg";
        }

        if (label) label.textContent = initial;
        if (button) {
            button.setAttribute("aria-label", `Espace membre (${email})`);
            button.classList.add("has-user");
        }
        document.dispatchEvent(new CustomEvent("eduvault:auth", { detail: { session } }));
    };

    document.querySelector("#auth-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const feedback = document.querySelector("#auth-feedback");
        const email = document.querySelector("#auth-email").value.trim();
        const password = document.querySelector("#auth-password").value;

        if (!client) {
            // Mode simulation locale
            if (store) {
                store.saveUserProfile({ email, name: email.split("@")[0] });
            }
            if (feedback) {
                feedback.className = "form-feedback is-success";
                feedback.textContent = "Connexion réussie en mode local !";
            }
            setTimeout(() => {
                updateAccount(null);
                dialog?.close();
                requestedAction?.(null);
                requestedAction = null;
            }, 600);
            return;
        }

        if (feedback) feedback.textContent = "";
        const result = isSignUp
            ? await client.auth.signUp({ email, password })
            : await client.auth.signInWithPassword({ email, password });

        if (result.error) {
            if (feedback) feedback.textContent = result.error.message;
            return;
        }

        if (isSignUp && !result.data.session) {
            if (feedback) feedback.textContent = "Vérifiez votre boîte e-mail pour confirmer votre inscription.";
            return;
        }

        const session = result.data.session ?? await getSession();
        await updateAccount(session);
        dialog?.close();
        requestedAction?.(session);
        requestedAction = null;
    });

    document.querySelector("#google-sign-in")?.addEventListener("click", async () => {
        if (!client) {
            dialog?.close();
            return;
        }
        await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
    });

    document.querySelector("#auth-mode-toggle")?.addEventListener("click", (event) => {
        isSignUp = !isSignUp;
        const title = document.querySelector("#auth-title");
        const submitBtn = document.querySelector("#auth-form button[type='submit']");
        const passwordInput = document.querySelector("#auth-password");

        if (title) title.textContent = isSignUp ? "Créer votre compte EduVault" : "Connexion à EduVault";
        if (submitBtn) submitBtn.textContent = isSignUp ? "Créer mon compte" : "Se connecter";
        event.currentTarget.textContent = isSignUp ? "J’ai déjà un compte (Se connecter)" : "Créer un nouveau compte";
        if (passwordInput) passwordInput.autocomplete = isSignUp ? "new-password" : "current-password";
        const feedback = document.querySelector("#auth-feedback");
        if (feedback) feedback.textContent = "";
    });

    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
        button.addEventListener("click", () => dialog?.close());
    });

    dialog?.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });

    // Écoute de l'état initial
    getSession().then((session) => {
        updateAccount(session);
    });

    window.EduVaultAuth = { client, getSession, open, updateAccount };
})();