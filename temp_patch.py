from pathlib import Path
root = Path(r'.')
replacements = {
    'frontend/scripts/theme.js': (
        '''    document.addEventListener("DOMContentLoaded", () => {
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
})();''',
        '''    const initThemeControls = () => {
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
})();'''
    ),
    'frontend/scripts/auth.js': (
        '''    // Initialisation
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
})();''',
        '''    const initializeAuthUI = () => {
        ensureDialogsInDOM();
        setupEventListeners();
        updateAccountUI();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeAuthUI);
    } else {
        initializeAuthUI();
    }

    window.EduVaultAuth = {
        client,
        getSession,
        open: openAuthDialog,
        openAccountPopup,
        updateAccount: updateAccountUI,
        showToast
    };
})();'''
    )
}
for path, (old, new) in replacements.items():
    p = root / path
    s = p.read_text(encoding='utf-8')
    if old not in s:
        raise SystemExit(f'pattern not found in {path}')
    p.write_text(s.replace(old, new), encoding='utf-8')
    print(f'patched {path}')
