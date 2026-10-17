/* Curseur suiveur interpolé — toujours visible au-dessus des popups et dialogs */
(() => {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    if (!dot || !ring || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    document.documentElement.classList.add("has-custom-cursor");

    // Toujours placer le curseur en dernier élément du body pour qu'il soit au-dessus de tout
    const ensureCursorOnTop = () => {
        if (dot.parentElement !== document.body || document.body.lastElementChild !== ring) {
            document.body.appendChild(dot);
            document.body.appendChild(ring);
        }
    };

    const updateDialogState = () => {
        document.documentElement.classList.toggle("has-open-dialog", Boolean(document.querySelector("dialog[open]")));
    };

    // Observer les mutations pour maintenir le curseur au-dessus des contenus, mais pas des fenêtres modales natives.
    try {
        const observer = new MutationObserver(() => {
            if (document.body.lastElementChild !== ring) {
                document.body.appendChild(dot);
                document.body.appendChild(ring);
            }
            updateDialogState();
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
    } catch (e) {
        console.warn("Cursor observer:", e);
    }
    updateDialogState();

    let pointerX = -100;
    let pointerY = -100;
    let ringX = pointerX;
    let ringY = pointerY;

    window.addEventListener("pointermove", (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (document.documentElement.classList.contains("has-open-dialog")) return;
        dot.classList.add("is-visible");
        ring.classList.add("is-visible");
        dot.style.transform = `translate3d(${pointerX - 3}px, ${pointerY - 3}px, 0)`;
        ensureCursorOnTop();
    }, { passive: true });

    const animate = () => {
        ringX += (pointerX - ringX) * 0.16;
        ringY += (pointerY - ringY) * 0.16;
        ring.style.transform = `translate3d(${ringX - 16}px, ${ringY - 16}px, 0)`;
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    document.addEventListener("pointerover", (event) => {
        if (event.target.closest("a, button, input, select, textarea, [role='button'], label")) {
            ring.classList.add("is-hovering");
        }
    });

    document.addEventListener("pointerout", (event) => {
        if (event.target.closest("a, button, input, select, textarea, [role='button'], label")) {
            ring.classList.remove("is-hovering");
        }
    });

    document.addEventListener("pointerleave", () => {
        dot.classList.remove("is-visible");
        ring.classList.remove("is-visible");
    });
})();