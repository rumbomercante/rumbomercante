/* Blog: buscador + filtro por sección + filtro por etiqueta (se combinan) */
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

  var state = { cat: "all", tag: null, q: "" };

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }
  posts.forEach(function (p) { p._s = norm(p.dataset.search); });

  function apply() {
    var words = norm(state.q).split(/\s+/).filter(Boolean);
    var shown = 0;
    posts.forEach(function (p) {
      var ok = (state.cat === "all" || p.dataset.cat === state.cat) &&
               (!state.tag || p.dataset.tag === state.tag) &&
               words.every(function (w) { return p._s.indexOf(w) > -1; });
      p.hidden = !ok;
      if (ok) { shown++; p.classList.add("is-visible"); }
    });
    if (empty) empty.hidden = shown > 0;
    var filtered = state.cat !== "all" || state.tag || words.length;
    if (status) status.textContent = filtered ? shown + (shown === 1 ? " publicación" : " publicaciones") : "";
    secs.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === state.cat)); });
    tags.forEach(function (t) { t.setAttribute("aria-pressed", String(t.dataset.tag === state.tag)); });
  }

  function toList() {
    var list = document.querySelector(".blog-main");
    if (list && list.getBoundingClientRect().top < 0) {
      var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      list.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  secs.forEach(function (b) {
    b.addEventListener("click", function () { state.cat = b.dataset.filter; apply(); toList(); });
  });
  tags.forEach(function (t) {
    t.addEventListener("click", function () {
      state.tag = state.tag === t.dataset.tag ? null : t.dataset.tag; apply(); toList();
    });
  });
  if (input) {
    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = input.value; apply(); }, 120);
    });
  }
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); state.q = input.value; apply(); toList(); });
  if (reset) reset.addEventListener("click", function () {
    state = { cat: "all", tag: null, q: "" };
    if (input) input.value = "";
    apply();
  });
  apply();
})();
