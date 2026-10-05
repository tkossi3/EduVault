/* Gestionnaire d'Authentification et d'Identité EduVault 2026 */
(() => {
    const config = window.EDUVAULT_CONFIG || {};
    const sdk = window.supabase;
    const store = window.EduVaultStore;
    
    let client = null;
    let requestedAction = null;
    let currentAuthTab = "login"; // 'login' | 'signup'

    if (sdk?.createClient && config?.SUPABASE_URL && !config.SUPABASE_URL.includes("your-project")) {
        try {
            client = sdk.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
        } catch (e) {
            console.warn("Supabase init error:", e);
        }
    }

    const getSession = async () => {
        if (!client) return null;
        try {
            return (await client.auth.getSession())?.data.session ?? null;
        } catch {
            return null;
        }
    };

    // Création / injection dynamique des modales d'authentification et popup compte si absentes
    const ensureDialogsInDOM = () => {
        // 1. Dialogue Auth (Connexion / Inscription)
        if (!document.querySelector("#auth-dialog")) {
            const authDialogHtml = `
            <dialog class="auth-dialog" id="auth-dialog" aria-labelledby="auth-modal-heading">
                <button class="dialog-close icon-button" data-close-auth-dialog aria-label="Fermer la boîte de dialogue" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                
                <div class="auth-tabs" role="tablist">
                    <button class="auth-tab is-active" id="tab-auth-login" type="button" role="tab" aria-selected="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                        <span>Connexion</span>
                    </button>
                    <button class="auth-tab" id="tab-auth-signup" type="button" role="tab" aria-selected="false">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                        <span>Inscription</span>
                    </button>
                </div>

                <div class="auth-body">
                    <p class="eyebrow" id="auth-eyebrow">ESPACE ÉTUDIANT & UNIVERSITAIRE</p>
                    <h2 id="auth-modal-heading">Connexion à EduVault</h2>
                    <p id="auth-modal-message">Accédez à votre coffre académique, téléchargez vos supports et partagez vos documents.</p>

                    <button class="button button-outline google-button" id="google-sign-in" type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                        <span>Continuer avec Google</span>
                    </button>

                    <div class="dialog-divider"><span>ou avec votre e-mail</span></div>

                    <form id="auth-main-form">
                        <div id="signup-fields" style="display: none;">
                            <div class="field-group">
                                <label class="field-label" for="auth-fullname">Nom complet ou pseudonyme</label>
                                <input class="field-control" id="auth-fullname" name="name" type="text" placeholder="Ex. Kossi Tech" autocomplete="name">
                            </div>
                            <div class="field-group" style="margin-top: 10px;">
                                <label class="field-label" for="auth-institution">Établissement / Université</label>
                                <select class="field-control" id="auth-institution" name="institution">
                                    <option value="ENP Campus Lomé">ENP Campus Lomé</option>
                                    <option value="Université de Lomé">Université de Lomé (FDS, FASEG)</option>
                                    <option value="Université de Kara">Université de Kara</option>
                                    <option value="École Supérieure des Affaires (ESA)">École Supérieure des Affaires (ESA)</option>
                                    <option value="IAEC Université">IAEC Université</option>
                                </select>
                            </div>
                        </div>

                        <div class="field-group" style="margin-top: 10px;">
                            <label class="field-label" for="auth-email">Adresse e-mail universitaire</label>
                            <input class="field-control" id="auth-email" name="email" type="email" placeholder="etudiant@universite.tg" autocomplete="email" required>
                        </div>

                        <div class="field-group" style="margin-top: 10px;">
                            <label class="field-label" for="auth-password">Mot de passe</label>
                            <div class="password-input-wrapper">
                                <input class="field-control" id="auth-password" name="password" type="password" placeholder="••••••••" autocomplete="current-password" minlength="6" required>
                                <button type="button" class="password-toggle-btn" id="toggle-password-visibility" aria-label="Afficher ou masquer le mot de passe">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                            </div>
                        </div>

                        <div class="form-feedback" id="auth-feedback" role="status" style="margin-top: 6px;"></div>

                        <button class="button button-primary button-full" id="auth-submit-btn" type="submit" style="margin-top: 14px;">
                            <span>Se connecter</span>
                        </button>
                    </form>

                    <div class="auth-footer-actions">
                        <button class="text-button" id="auth-switch-mode-btn" type="button">Pas encore de compte ? S'inscrire</button>
                    </div>
                </div>
            </dialog>`;
            document.body.insertAdjacentHTML("beforeend", authDialogHtml);
        }

        // 2. Dialogue Quick Popup Compte
        if (!document.querySelector("#account-popup-dialog")) {
            const popupHtml = `
            <dialog class="account-popup-dialog" id="account-popup-dialog" aria-labelledby="popup-heading">
                <button class="dialog-close icon-button" data-close-account-popup aria-label="Fermer" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div class="popup-content" id="popup-content-body">
                    <!-- Rempli dynamiquement -->
                </div>
            </dialog>`;
            document.body.insertAdjacentHTML("beforeend", popupHtml);
        }

        // 3. Toast container
        if (!document.querySelector("#eduvault-toast")) {
            const toastHtml = `<div class="eduvault-toast" id="eduvault-toast" role="alert" aria-live="polite"></div>`;
            document.body.insertAdjacentHTML("beforeend", toastHtml);
        }
    };

    // Afficher une notification toast
    const showToast = (message, type = "info") => {
        const toast = document.querySelector("#eduvault-toast");
        if (!toast) return;
        toast.className = `eduvault-toast is-${type} is-visible`;
        toast.innerHTML = `
            <div class="toast-inner">
                <span>${message}</span>
            </div>
        `;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove("is-visible");
        }, 3800);
    };

    // Basculer l'onglet dans la modale d'authentification
    const setAuthTab = (tab = "login") => {
        currentAuthTab = tab;
        const tabLogin = document.querySelector("#tab-auth-login");
        const tabSignup = document.querySelector("#tab-auth-signup");
        const signupFields = document.querySelector("#signup-fields");
        const modalHeading = document.querySelector("#auth-modal-heading");
        const modalMessage = document.querySelector("#auth-modal-message");
        const submitBtn = document.querySelector("#auth-submit-btn span");
        const switchBtn = document.querySelector("#auth-switch-mode-btn");
        const eyebrow = document.querySelector("#auth-eyebrow");
        const feedback = document.querySelector("#auth-feedback");

        if (feedback) feedback.textContent = "";

        if (tab === "signup") {
            tabSignup?.classList.add("is-active");
            tabSignup?.setAttribute("aria-selected", "true");
            tabLogin?.classList.remove("is-active");
            tabLogin?.setAttribute("aria-selected", "false");
            if (signupFields) signupFields.style.display = "block";
            if (eyebrow) eyebrow.textContent = "CRÉATION DE COMPTE ÉTUDIANT";
            if (modalHeading) modalHeading.textContent = "Créer votre compte EduVault";
            if (modalMessage) modalMessage.textContent = "Rejoignez votre campus pour partager et consulter les ressources certifiées.";
            if (submitBtn) submitBtn.textContent = "Créer mon compte";
            if (switchBtn) switchBtn.textContent = "Déjà un compte ? Se connecter";
        } else {
            tabLogin?.classList.add("is-active");
            tabLogin?.setAttribute("aria-selected", "true");
            tabSignup?.classList.remove("is-active");
            tabSignup?.setAttribute("aria-selected", "false");
            if (signupFields) signupFields.style.display = "none";
            if (eyebrow) eyebrow.textContent = "ESPACE ÉTUDIANT & UNIVERSITAIRE";
            if (modalHeading) modalHeading.textContent = "Connexion à EduVault";
            if (modalMessage) modalMessage.textContent = "Accédez à votre coffre académique, téléchargez vos supports et gérez vos documents.";
            if (submitBtn) submitBtn.textContent = "Se connecter";
            if (switchBtn) switchBtn.textContent = "Pas encore de compte ? S'inscrire";
        }
    };

    // Ouvrir la modale d'authentification (Connexion ou Inscription)
    const openAuthDialog = (tab = "login", message = null, action = null) => {
        ensureDialogsInDOM();
        requestedAction = action;
        setAuthTab(tab);
        if (message) {
            const msgEl = document.querySelector("#auth-modal-message");
            if (msgEl) msgEl.textContent = message;
        }
        const dialog = document.querySelector("#auth-dialog");
        dialog?.showModal();
    };

    // Ouvrir le Popup Rapide de gestion de compte
    const openAccountPopup = () => {
        ensureDialogsInDOM();
        const popup = document.querySelector("#account-popup-dialog");
        const container = document.querySelector("#popup-content-body");
        if (!popup || !container) return;

        const isUserLoggedIn = store ? store.isLoggedIn() : false;
        const profile = store ? store.getCurrentUserProfile() : { name: "Étudiant", email: "etudiant@eduvault.tg" };
        const isInPages = window.location.pathname.includes("/pages/");
        const loginUrl = isInPages ? "login.html" : "pages/login.html";
        const registerUrl = isInPages ? "register.html" : "pages/register.html";
        const profileUrl = isInPages ? "profile.html" : "pages/profile.html";
        const uploadUrl = isInPages ? "upload.html" : "pages/upload.html";

        if (!isUserLoggedIn) {
            // Vue : NON CONNECTÉ
            container.innerHTML = `
                <div class="popup-user-header">
                    <div class="popup-avatar" style="background: var(--surface-raised); color: var(--primary);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <div class="popup-user-info">
                        <strong>Espace Étudiant</strong>
                        <small>Connectez-vous pour déposer des documents et gérer votre profil.</small>
                    </div>
                </div>
                <div class="popup-actions-list" style="margin-top: 16px;">
                    <a class="button button-primary button-full" href="${loginUrl}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                        <span>Se connecter</span>
                    </a>
                    <a class="button button-outline button-full" href="${registerUrl}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                        <span>Créer un compte</span>
                    </a>
                </div>
            `;
        } else {
            // Vue : UTILISATEUR CONNECTÉ
            const initial = (profile.name || "E").slice(0, 1).toUpperCase();

            container.innerHTML = `
                <div class="popup-user-header">
                    <div class="popup-avatar">${initial}</div>
                    <div class="popup-user-info">
                        <strong>${profile.name || "Étudiant EduVault"}</strong>
                        <small>${profile.email || "etudiant@eduvault.tg"}</small>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                            <span class="badge badge-primary" style="font-size: 10px;">${profile.institution || "ENP Campus Lomé"}</span>
                            <span class="badge badge-outline" style="font-size: 10px;">${profile.program || "Génie Logiciel"}</span>
                        </div>
                    </div>
                </div>
                <div class="popup-actions-list" style="margin-top: 16px;">
                    <a class="button button-primary button-full" href="${profileUrl}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span>Voir mon profil</span>
                    </a>
                    <a class="button button-outline button-full" href="${uploadUrl}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        <span>Déposer un document</span>
                    </a>
                    <hr class="popup-divider">
                    <button class="button button-danger button-full" id="btn-popup-logout" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        <span>Se déconnecter</span>
                    </button>
                </div>
            `;
        }

        popup.showModal();

        document.querySelector("#btn-popup-logout")?.addEventListener("click", () => {
            popup.close();
            if (store) store.logoutUser();
            updateAccountUI();
            showToast("Vous êtes maintenant déconnecté.", "info");
            document.dispatchEvent(new CustomEvent("eduvault:auth_state_changed", { detail: { isLoggedIn: false } }));
        });
    };

    // Mise à jour de l'icône de compte dans la barre supérieure
    const updateAccountUI = async () => {
        ensureDialogsInDOM();
        const isInPages = window.location.pathname.includes("/pages/");
        const loginUrl = isInPages ? "login.html" : "pages/login.html";
        const profileUrl = isInPages ? "profile.html" : "pages/profile.html";
        const isUserLoggedIn = store ? store.isLoggedIn() : false;

        // 1. Navigation : Afficher / masquer "Mon Profil"
        document.querySelectorAll(".nav-link[href*='profile.html']").forEach((link) => {
            if (isUserLoggedIn) {
                link.style.display = "";
            } else {
                link.style.display = "none";
            }
        });

        // 2. Bouton d'action supérieur droit (Top bar)
        const actionsContainer = document.querySelector(".topbar-actions");
        if (!actionsContainer) return;

        let accountSlot = document.querySelector("#account-button, .header-auth-btn");

        if (!isUserLoggedIn) {
            // Utilisateur non connecté -> Bouton "Se connecter"
            if (accountSlot) {
                accountSlot.outerHTML = `
                <a class="button button-sm button-primary header-auth-btn" id="account-button" href="${loginUrl}" aria-label="Se connecter" title="Se connecter à votre compte">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                    <span>Se connecter</span>
                </a>`;
            }
        } else {
            // Utilisateur connecté -> Cercle Avatar
            const profile = store ? store.getCurrentUserProfile() : { name: "E", email: "etudiant@eduvault.tg" };
            const initial = (profile.name || "E").slice(0, 1).toUpperCase();

            if (accountSlot) {
                accountSlot.outerHTML = `
                <a class="avatar-button has-user" id="account-button" href="${profileUrl}" aria-label="Espace étudiant (${profile.name})" title="Connecté : ${profile.name}">
                    <span id="account-initials">${initial}</span>
                </a>`;
            }
        }

        // Re-lier le clic sur le bouton de compte
        const newAccountBtn = document.querySelector("#account-button");
        if (newAccountBtn && isUserLoggedIn) {
            newAccountBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openAccountPopup();
            });
        }
    };

    // Gestionnaires d'événements globaux
    const setupEventListeners = () => {
        ensureDialogsInDOM();

        // Tabs Auth
        document.querySelector("#tab-auth-login")?.addEventListener("click", () => setAuthTab("login"));
        document.querySelector("#tab-auth-signup")?.addEventListener("click", () => setAuthTab("signup"));
        document.querySelector("#auth-switch-mode-btn")?.addEventListener("click", () => {
            setAuthTab(currentAuthTab === "login" ? "signup" : "login");
        });

        // Toggle visibilité mot de passe
        document.querySelector("#toggle-password-visibility")?.addEventListener("click", () => {
            const input = document.querySelector("#auth-password");
            if (!input) return;
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
        });

        // Fermeture des dialogues
        document.querySelectorAll("[data-close-auth-dialog]").forEach((btn) => {
            btn.addEventListener("click", () => document.querySelector("#auth-dialog")?.close());
        });

        document.querySelectorAll("[data-close-account-popup]").forEach((btn) => {
            btn.addEventListener("click", () => document.querySelector("#account-popup-dialog")?.close());
        });

        // Clic sur le backdrop pour fermer
        document.querySelector("#auth-dialog")?.addEventListener("click", (event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
        });

        document.querySelector("#account-popup-dialog")?.addEventListener("click", (event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
        });

        // Formulaire d'authentification principal
        document.querySelector("#auth-main-form")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const feedback = document.querySelector("#auth-feedback");
            const emailInput = document.querySelector("#auth-email");
            const passwordInput = document.querySelector("#auth-password");
            const nameInput = document.querySelector("#auth-fullname");
            const instSelect = document.querySelector("#auth-institution");

            const email = emailInput?.value.trim() || "";
            const password = passwordInput?.value || "";
            const name = nameInput?.value.trim() || email.split("@")[0];
            const institution = instSelect?.value || "ENP Campus Lomé";

            if (feedback) feedback.textContent = "";

            if (!client) {
                if (store) {
                    store.loginUser({ email, name, institution });
                }
                if (feedback) {
                    feedback.className = "form-feedback is-success";
                    feedback.textContent = currentAuthTab === "signup" 
                        ? "Compte créé avec succès ! Bienvenue sur EduVault." 
                        : "Connexion réussie !";
                }
                setTimeout(() => {
                    updateAccountUI();
                    document.querySelector("#auth-dialog")?.close();
                    showToast(`Bienvenue, ${name} ! Espace académique prêt.`, "success");
                    requestedAction?.(null);
                    requestedAction = null;
                    document.dispatchEvent(new CustomEvent("eduvault:auth_state_changed", { detail: { isLoggedIn: true } }));
                }, 500);
                return;
            }

            try {
                const result = currentAuthTab === "signup"
                    ? await client.auth.signUp({ email, password, options: { data: { name, institution } } })
                    : await client.auth.signInWithPassword({ email, password });

                if (result.error) {
                    if (feedback) {
                        feedback.className = "form-feedback";
                        feedback.textContent = result.error.message;
                    }
                    return;
                }

                if (currentAuthTab === "signup" && !result.data.session) {
                    if (feedback) {
                        feedback.className = "form-feedback is-success";
                        feedback.textContent = "Compte créé. Vérifiez vos e-mails pour confirmer l'inscription.";
                    }
                    return;
                }

                if (store) {
                    store.loginUser({ email, name, institution });
                }
                await updateAccountUI();
                document.querySelector("#auth-dialog")?.close();
                showToast(`Ravi de vous revoir sur EduVault !`, "success");
                requestedAction?.(result.data.session);
                requestedAction = null;
                document.dispatchEvent(new CustomEvent("eduvault:auth_state_changed", { detail: { isLoggedIn: true } }));
            } catch (err) {
                if (feedback) {
                    feedback.className = "form-feedback";
                    feedback.textContent = "Erreur de connexion. Veuillez vérifier vos identifiants.";
                }
            }
        });

        // Google sign-in
        document.querySelector("#google-sign-in")?.addEventListener("click", async () => {
            if (!client) {
                if (store) {
                    store.loginUser({ email: "etudiant.google@eduvault.tg", name: "Étudiant Google" });
                }
                updateAccountUI();
                document.querySelector("#auth-dialog")?.close();
                showToast("Connexion réussie avec Google !", "success");
                document.dispatchEvent(new CustomEvent("eduvault:auth_state_changed", { detail: { isLoggedIn: true } }));
                return;
            }
            await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
        });

        // Menu mobile hamburger sur toutes les pages
        document.querySelectorAll("#menu-toggle, .menu-toggle").forEach((btn) => {
            btn.addEventListener("click", () => {
                const nav = document.querySelector("#main-nav, .main-nav");
                if (nav) {
                    nav.classList.toggle("is-open-mobile");
                }
            });
        });

        // Écouteurs d'événements
        document.addEventListener("eduvault:auth_state_changed", () => updateAccountUI());
        document.addEventListener("eduvault:logout", () => updateAccountUI());
        document.addEventListener("eduvault:profile_updated", () => updateAccountUI());
    };

    // Initialisation
    document.addEventListener("DOMContentLoaded", () => {
        ensureDialogsInDOM();
        setupEventListeners();
        updateAccountUI();
    });

    window.EduVaultAuth = {
        client,
        getSession,
        open: openAuthDialog,
        openAccountPopup,
        updateAccount: updateAccountUI,
        showToast
    };
})();