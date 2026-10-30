from pathlib import Path
path = Path(r'.\frontend\scripts\theme.js')
s = path.read_text(encoding='utf-8')
old = """    document.addEventListener(\"DOMContentLoaded\", () => {
        updateButtons(document.documentElement.dataset.theme || \"light\");
        
        document.querySelectorAll(\"[data-theme-toggle]\").forEach((button) => {
            button.addEventListener(\"click\", () => {
                const current = document.documentElement.dataset.theme === \"dark\" ? \"dark\" : \"light\";
                const next = current === \"dark\" ? \"light\" : \"dark\";
                applyTheme(next);
            });
        });
    });

    // Exposition globale
    window.EduVaultTheme = { applyTheme, getTheme: () => document.documentElement.dataset.theme || \"light\" };
})();"""
new = """    const initThemeControls = () => {
        updateButtons(document.documentElement.dataset.theme || \"light\");

        document.querySelectorAll(\"[data-theme-toggle]\").forEach((button) => {
            button.addEventListener(\"click\", () => {
                const current = document.documentElement.dataset.theme === \"dark\" ? \"dark\" : \"light\";
                const next = current === \"dark\" ? \"light\" : \"dark\";
                applyTheme(next);
            });
        });
    };

    if (document.readyState === \"loading\") {
        document.addEventListener(\"DOMContentLoaded\", initThemeControls);
    } else {
        initThemeControls();
    }

    // Exposition globale
    window.EduVaultTheme = { applyTheme, getTheme: () => document.documentElement.dataset.theme || \"light\" };
})();"""
assert old in s, 'pattern not found'
path.write_text(s.replace(old, new), encoding='utf-8')
print('patched theme.js')
