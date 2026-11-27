/* Dialogues accessibles et cohérents pour les interactions EduVault. */
(() => {
    if (window.EduVaultDialog) return;

    const dialog = document.createElement("dialog");
    dialog.className = "eduvault-dialog";
    dialog.setAttribute("aria-labelledby", "eduvault-dialog-title");
    dialog.innerHTML = `
        <form class="eduvault-dialog-card">
            <h2 class="eduvault-dialog-title" id="eduvault-dialog-title"></h2>
            <div class="eduvault-dialog-content"></div>
            <div class="eduvault-dialog-actions"></div>
        </form>`;
    document.body.append(dialog);

    const form = dialog.querySelector("form");
    const title = dialog.querySelector(".eduvault-dialog-title");
    const content = dialog.querySelector(".eduvault-dialog-content");
    const actions = dialog.querySelector(".eduvault-dialog-actions");
    const queue = [];
    let activeRequest = null;

    const closeWith = (result) => {
        if (!activeRequest || !dialog.open) return;
        activeRequest.result = result;
        dialog.close();
    };

    const createButton = (label, className, value) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `button ${className}`;
        button.textContent = label;
        button.addEventListener("click", () => closeWith(typeof value === "function" ? value() : value));
        return button;
    };

    const openNext = () => {
        if (activeRequest || !queue.length) return;

        activeRequest = queue.shift();
        const request = activeRequest;
        title.textContent = request.type === "prompt" ? "Votre saisie"
            : request.type === "confirm" ? "Confirmation" : "Information";
        content.replaceChildren();
        actions.replaceChildren();

        if (request.type === "prompt") {
            const label = document.createElement("label");
            label.className = "field-label eduvault-dialog-label";
            label.htmlFor = "eduvault-dialog-input";
            label.textContent = request.message;

            const input = document.createElement("input");
            input.className = "field-control";
            input.id = "eduvault-dialog-input";
            input.type = "text";
            input.value = request.defaultValue;
            input.autocomplete = "off";
            input.maxLength = 200;
            content.append(label, input);
            request.input = input;

            actions.append(
                createButton("Annuler", "button-outline", null),
                createButton("Valider", "button-primary", () => input.value)
            );
        } else {
            const message = document.createElement("p");
            message.className = "eduvault-dialog-message";
            message.textContent = request.message;
            content.append(message);
            actions.append(request.type === "confirm"
                ? createButton("Annuler", "button-outline", false)
                : createButton("Compris", "button-primary", true));
            if (request.type === "confirm") {
                actions.append(createButton("Confirmer", "button-primary", true));
            }
        }

        dialog.showModal();
        requestAnimationFrame(() => (request.input || actions.querySelector("button:last-child"))?.focus());
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (activeRequest?.type === "prompt") closeWith(activeRequest.input.value);
    });

    dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeWith(activeRequest?.type === "confirm" ? false : null);
    });

    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            closeWith(activeRequest?.type === "confirm" ? false : null);
        }
    });

    dialog.addEventListener("close", () => {
        const request = activeRequest;
        activeRequest = null;
        if (request) request.resolve(request.result);
        openNext();
    });

    const enqueue = (type, message, defaultValue = "") => new Promise((resolve) => {
        queue.push({ type, message: String(message ?? ""), defaultValue: String(defaultValue ?? ""), resolve });
        openNext();
    });

    window.EduVaultDialog = {
        prompt: (message, defaultValue = "") => enqueue("prompt", message, defaultValue),
        confirm: (message) => enqueue("confirm", message),
        alert: (message) => enqueue("alert", message)
    };
})();
