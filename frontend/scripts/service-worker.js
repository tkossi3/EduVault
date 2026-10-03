/* Enregistre le service worker depuis toutes les pages de l’application. */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker indisponible", error)));
}