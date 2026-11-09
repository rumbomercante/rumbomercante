/* Portada (estilo Designmodo): pestañas del hero y carrusel de publicaciones */
(function () {
  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.warn('home-dm:', e); } }

  safe(function tabs() {
    var list = document.querySelector('.dm-tabs');
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var pane = document.getElementById(t.getAttribute('aria-controls'));
        if (pane) pane.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  safe(function carousel() {
    var track = document.querySelector('.dm-track');
    if (!track) return;
    var btns = document.querySelectorAll('.dm-arrow');
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      btns.forEach(function (b) {
        var d = +b.getAttribute('data-dir');
        b.disabled = d < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= max;
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var slide = track.querySelector('.dm-slide');
        var step = slide ? slide.getBoundingClientRect().width + 20 : track.clientWidth;
        track.scrollBy({ left: step * +b.getAttribute('data-dir'), behavior: 'smooth' });
      });
    });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
