/**
 * iframe-resize.js
 * Inclui este script na página onde o iframe está embebido,
 * OU usa o snippet de embed gerado pelo painel admin que já o inclui.
 *
 * O iframe envia a sua altura via postMessage sempre que o conteúdo muda;
 * este script redimensiona o iframe automaticamente sem scroll interno.
 */
(function () {
    "use strict";
    window.addEventListener("message", function (event) {
        if (!event.data || event.data.type !== "supportFormHeight") return;
        var iframes = document.querySelectorAll("iframe[data-support-resize]");
        iframes.forEach(function (iframe) {
            if (iframe.contentWindow === event.source) {
                iframe.style.height = event.data.height + "px";
            }
        });
    });
})();
