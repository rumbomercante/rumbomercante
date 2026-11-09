/* Asigna --i a cada .reveal según su posición entre hermanos .reveal,
   para escalonar la entrada de listas y cuadrículas (máx. 6 pasos).
   Corre antes del observador del sitio, que añade .is-visible. */
(function () {
  var MAX = 6;
  var seen = new Set();
  document.querySelectorAll(".reveal").forEach(function (el) {
    var parent = el.parentElement;
    if (!parent || seen.has(parent)) return;
    seen.add(parent);
    var i = 0;
    Array.prototype.forEach.call(parent.children, function (child) {
      if (child.classList.contains("reveal")) {
        child.style.setProperty("--i", Math.min(i++, MAX));
      }
    });
  });
})();
