/* Curseur suiveur interpolé, désactivé sur les écrans tactiles, compatible modales & popups (Top Layer) */
(() => {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    if (!dot || !ring || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    document.documentElement.classList.add("has-custom-cursor");
    let pointerX = -100;
    let pointerY = -100;
    let ringX = pointerX;
    let ringY = pointerY;

    // S'assure que le curseur est visible au-dessus des dialogues natifs HTML5 (Top Layer)
    const syncCursorLayer = () => {
        const activeDialog = document.querySelector("dialog[open]");
        if (activeDialog) {
            if (dot.parentElement !== activeDialog) {
                activeDialog.appendChild(dot);
                activeDialog.appendChild(ring);
            }
        } else {
            if (dot.parentElement !== document.body) {
                document.body.appendChild(dot);
                document.body.appendChild(ring);
            }
        }
    };

    // Observer pour détecter immédiatement l'ouverture / fermeture d'une modale/popup
    try {
        const observer = new MutationObserver(syncCursorLayer);
        observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["open"] });
    } catch (e) {
        console.warn("Cursor observer:", e);
    }

    window.addEventListener("pointermove", (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        dot.classList.add("is-visible");
        ring.classList.add("is-visible");
        dot.style.transform = `translate3d(${pointerX - 3.5}px, ${pointerY - 3.5}px, 0)`;
        syncCursorLayer();
    }, { passive: true });

    const animate = () => {
        ringX += (pointerX - ringX) * 0.16;
        ringY += (pointerY - ringY) * 0.16;
        ring.style.transform = `translate3d(${ringX - 17}px, ${ringY - 17}px, 0)`;
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    document.addEventListener("pointerover", (event) => {
        if (event.target.closest("a, button, input, select, textarea, [role='button']")) {
            ring.classList.add("is-hovering");
        }
    });

    document.addEventListener("pointerout", (event) => {
        if (event.target.closest("a, button, input, select, textarea, [role='button']")) {
            ring.classList.remove("is-hovering");
        }
    });

    document.addEventListener("pointerleave", () => {
        dot.classList.remove("is-visible");
        ring.classList.remove("is-visible");
    });
})();