/* Blog: buscador + filtro por sección + filtro por etiqueta (se combinan) + paginación de 10 en 10 */
(function () {
  var posts = Array.prototype.slice.call(document.querySelectorAll(".post-std"));
  if (!posts.length) return;
  var secs = document.querySelectorAll(".sec-btn");
  var tags = document.querySelectorAll(".tag-chip");
  var form = document.querySelector(".blog-search");
  var input = document.getElementById("blog-q");
  var empty = document.querySelector(".post-empty");
  var status = document.querySelector(".blog-status");
  var reset = document.querySelector(".link-reset");

  var POR_PAGINA = 10;
  var state = { cat: "all", tag: null, q: "", page: 1 };
  var listEl = document.querySelector(".post-list");
  var pager = document.createElement("nav");
  pager.className = "blog-pager";
  pager.setAttribute("aria-label", "Páginas del blog");
  if (listEl) listEl.parentNode.insertBefore(pager, listEl.nextSibling);

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }
  posts.forEach(function (p) { p._s = norm(p.dataset.search); });

  function apply() {
    var words = norm(state.q).split(/\s+/).filter(Boolean);
    var matches = [];
    posts.forEach(function (p) {
      var ok = (state.cat === "all" || p.dataset.cat === state.cat) &&
               (!state.tag || p.dataset.tag === state.tag) &&
               words.every(function (w) { return p._s.indexOf(w) > -1; });
      if (ok) matches.push(p);
      p.hidden = true;
    });
    var shown = matches.length;
    var pages = Math.max(1, Math.ceil(shown / POR_PAGINA));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;
    var desde = (state.page - 1) * POR_PAGINA;
    matches.slice(desde, desde + POR_PAGINA).forEach(function (p) { p.hidden = false; p.classList.add("is-visible"); });
    if (empty) empty.hidden = shown > 0;
    var filtered = state.cat !== "all" || state.tag || words.length;
    if (status) status.textContent = filtered ? shown + (shown === 1 ? " publicación" : " publicaciones") : "";
    secs.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === state.cat)); });
    tags.forEach(function (t) { t.setAttribute("aria-pressed", String(t.dataset.tag === state.tag)); });
    pintarPaginas(pages);
    guardarEnUrl();
  }

  function pintarPaginas(pages) {
    pager.innerHTML = "";
    pager.hidden = pages <= 1;
    if (pages <= 1) return;
    function boton(txt, page, opts) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pg" + (opts && opts.cls ? " " + opts.cls : "");
      b.innerHTML = txt;
      if (opts && opts.label) b.setAttribute("aria-label", opts.label);
      if (page === state.page && !(opts && opts.flecha)) { b.setAttribute("aria-current", "page"); }
      if (opts && opts.disabled) b.disabled = true;
      else b.addEventListener("click", function () { state.page = page; apply(); toList(true); });
      pager.appendChild(b);
    }
    boton("&larr;", state.page - 1, { cls: "pg-flecha", flecha: true, label: "Página anterior", disabled: state.page === 1 });
    for (var i = 1; i <= pages; i++) boton(String(i), i, { label: "Página " + i });
    boton("&rarr;", state.page + 1, { cls: "pg-flecha", flecha: true, label: "Página siguiente", disabled: state.page === pages });
  }

  function guardarEnUrl() {
    try {
      var u = new URL(location.href);
      if (state.page > 1) u.searchParams.set("pagina", state.page); else u.searchParams.delete("pagina");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  function toList(siempre) {
    var list = document.querySelector(".blog-main");
    if (list && (siempre || list.getBoundingClientRect().top < 0)) {
      var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      list.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  secs.forEach(function (b) {
    b.addEventListener("click", function () { state.cat = b.dataset.filter; state.page = 1; apply(); toList(); });
  });
  tags.forEach(function (t) {
    t.addEventListener("click", function () {
      state.tag = state.tag === t.dataset.tag ? null : t.dataset.tag; state.page = 1; apply(); toList();
    });
  });
  if (input) {
    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = input.value; state.page = 1; apply(); }, 120);
    });
  }
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); state.q = input.value; state.page = 1; apply(); toList(); });
  if (reset) reset.addEventListener("click", function () {
    state = { cat: "all", tag: null, q: "", page: 1 };
    if (input) input.value = "";
    apply();
  });
  // Búsqueda que llega desde otra página: /blog/?q=palabra
  try {
    var q0 = new URLSearchParams(location.search).get("q");
    if (q0 && input) { input.value = q0; state.q = q0; }
    var p0 = parseInt(new URLSearchParams(location.search).get("pagina"), 10);
    if (p0 > 1) state.page = p0;
  } catch (e) {}
  apply();
})();
