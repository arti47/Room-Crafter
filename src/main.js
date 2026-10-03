// main.js — boot.
import { applyTheme } from "./settings.js";
import { start } from "./router.js";
import { showToast } from "./ui.js";
import { CACHE_VERSION } from "./core.js";

applyTheme();
start();

// PWA: register, and tell the player when a new version is waiting.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            showToast("Update available", {
              action: { label: "Reload", onClick: () => { sw.postMessage("skip-waiting"); location.reload(); } }
            });
          }
        });
      });
    }).catch(() => { /* offline install is optional */ });
  });
}

document.documentElement.dataset.build = CACHE_VERSION;

// Printing any screen prints its folds open — a closed <details> would leave
// notes and hidden searches off the paper — and closes them again afterwards.
let opened = [];
window.addEventListener("beforeprint", () => {
  opened = Array.from(document.querySelectorAll("#screen details:not([open])"));
  opened.forEach(d => { d.open = true; });
});
window.addEventListener("afterprint", () => { opened.forEach(d => { d.open = false; }); opened = []; });
