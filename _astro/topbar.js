/* Barra superior: redes sociales + cambio de idioma (ES / EN) */
(function () {
  // ▼ Enlaces de tus redes. Deja "" en una red para ocultar su ícono.
  var REDES = {
    facebook:  "",
    youtube:   "",
    instagram: "https://www.instagram.com/rumbomercante/",
    linkedin:  "",
    tiktok:    "",
    whatsapp:  ""   // ej: "https://wa.me/584121234567"
  };

  document.querySelectorAll(".topbar-social a[data-red]").forEach(function (a) {
    var url = REDES[a.dataset.red];
    if (!url) { a.parentElement.remove(); return; }
    a.href = url;
    if (url !== "#") { a.target = "_blank"; a.rel = "noopener"; }
  });

  /* ================= Idioma ================= */
  var SRC = "es";
  var html = document.documentElement;
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".lang-btn"));
  if (!buttons.length) return;

  var busy = false;
  var gtPromise = null;

  // --- Cookie "googtrans" (Google la lee al cargar cada página) ---
  function cookieDomains() {
    var h = location.hostname, list = [""];
    if (h.indexOf(".") > -1 && !/^[\d.]+$/.test(h)) {
      list.push(";domain=" + h, ";domain=." + h);
      var parts = h.split(".");
      if (parts.length > 2) list.push(";domain=." + parts.slice(-2).join("."));
    }
    return list;
  }
  function writeCookie(lang) {
    cookieDomains().forEach(function (d) {
      if (lang === SRC) {
        document.cookie = "googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT" + d;
      } else {
        document.cookie = "googtrans=/" + SRC + "/" + lang + ";path=/;max-age=31536000" + d;
      }
    });
    try { localStorage.setItem("rm-lang", lang); } catch (e) {}
  }
  function wantedLang() {
    var m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
    if (m) {
      var v = decodeURIComponent(m[1]).split("/").pop();
      if (v && v !== SRC) return v;
    }
    return SRC;
  }

  // --- Estado real de la página ---
  function isTranslated() {
    return html.classList.contains("translated-ltr") || html.classList.contains("translated-rtl");
  }
  function paint(lang) {
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
  }
  function setBusy(v) {
    busy = v;
    buttons.forEach(function (b) { b.disabled = v; });
    html.classList.toggle("lang-busy", v);
  }

  // --- Carga del traductor (una sola vez, solo cuando hace falta) ---
  function loadTranslator() {
    if (gtPromise) return gtPromise;
    gtPromise = new Promise(function (resolve, reject) {
      var holder = document.createElement("div");
      holder.id = "gt-el";
      holder.className = "gt-hidden";
      document.body.appendChild(holder);

      var timer = setTimeout(function () { reject(new Error("timeout")); }, 12000);
      window.rmTranslateInit = function () {
        try {
          new google.translate.TranslateElement(
            { pageLanguage: SRC, includedLanguages: "en,es", autoDisplay: false }, "gt-el");
        } catch (e) { clearTimeout(timer); reject(e); return; }
        waitFor(function () {
          var c = document.querySelector("select.goog-te-combo");
          return c && c.options.length > 1 ? c : null;
        }, 10000).then(function (c) { clearTimeout(timer); resolve(c); }, reject);
      };
      var s = document.createElement("script");
      s.src = "https://translate.google.com/translate_a/element.js?cb=rmTranslateInit";
      s.async = true;
      s.onerror = function () { clearTimeout(timer); reject(new Error("load")); };
      document.head.appendChild(s);
    });
    gtPromise.catch(function () { gtPromise = null; });
    return gtPromise;
  }

  function waitFor(test, ms) {
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function tick() {
        var r = test();
        if (r) return resolve(r);
        if (Date.now() - t0 > ms) return reject(new Error("timeout"));
        setTimeout(tick, 100);
      })();
    });
  }

  function pick(combo, lang) {
    combo.value = lang;
    combo.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // --- Cambiar idioma ---
  function toEnglish() {
    writeCookie("en");
    return loadTranslator().then(function (combo) {
      if (isTranslated()) return;
      pick(combo, "en");
      // Google a veces ignora el primer cambio: reintenta una vez.
      return waitFor(isTranslated, 2500).catch(function () {
        pick(combo, "en");
        return waitFor(isTranslated, 6000);
      });
    });
  }

  function toSpanish() {
    writeCookie(SRC);
    if (!isTranslated()) return Promise.resolve();
    var combo = document.querySelector("select.goog-te-combo");
    if (combo) {
      pick(combo, SRC);
      return waitFor(function () { return !isTranslated(); }, 2500)
        .catch(function () { location.reload(); return new Promise(function () {}); });
    }
    location.reload();
    return new Promise(function () {});
  }

  function switchTo(lang) {
    if (busy) return;
    var current = isTranslated() ? "en" : SRC;
    if (lang === current) { paint(lang); return; }
    setBusy(true);
    paint(lang);
    (lang === SRC ? toSpanish() : toEnglish())
      .catch(function () {
        // No se pudo traducir (sin internet, bloqueado, etc.): volver al español.
        writeCookie(SRC);
        paint(SRC);
        flash("No se pudo cargar la traducción. Revisa tu conexión e inténtalo de nuevo.");
      })
      .then(function () { setBusy(false); paint(isTranslated() ? "en" : SRC); });
  }

  function flash(msg) {
    var n = document.createElement("div");
    n.className = "lang-toast notranslate";
    n.setAttribute("role", "status");
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 4500);
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () { switchTo(b.dataset.lang); });
  });

  // Mantener los botones en sincronía si Google cambia el estado por su cuenta.
  new MutationObserver(function () {
    if (!busy) paint(isTranslated() ? "en" : SRC);
  }).observe(html, { attributes: true, attributeFilter: ["class"] });

  // Al abrir una página: si el visitante eligió inglés antes, traducir.
  var start = wantedLang();
  if (start === SRC) {
    try { if (localStorage.getItem("rm-lang") === "en") start = "en"; } catch (e) {}
  }
  paint(SRC);
  if (start === "en") switchTo("en");
})();
