/* Rosa de los vientos del hero: la tarjeta gira hacia el rumbo que marca el puntero
   (como una aguja que busca), oscila un poco en reposo y las letras siempre quedan derechas.
   Un solo reloj: gsap.ticker. En teléfono o con movimiento reducido queda fija y GSAP no se descarga. */
(function () {
  var wrap = document.querySelector('.hero-rose');
  var card = wrap && wrap.querySelector('[data-rose-card]');
  if (!card) return;
  var hero = wrap.closest('.hero');
  var out = wrap.querySelector('[data-heading]');
  var labels = Array.prototype.slice.call(card.querySelectorAll('.rr-nums text, .rr-cardinal text')).map(function (t) {
    var m = /rotate\(([-\d.]+)/.exec(t.getAttribute('transform') || '');
    return { el: t, a: m ? +m[1] : 0, x: +t.getAttribute('x'), y: +t.getAttribute('y') };
  });
  var fixed = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
              window.matchMedia('(max-width: 700px)').matches;
  var start = 214, target = start, heading = fixed ? start : start - 70; // entra girando y se asienta
  var last = '';

  function fmt(b) { var n = ((Math.round(b) % 360) + 360) % 360; return ('00' + n).slice(-3) + '°'; }
  function draw(h) {
    card.setAttribute('transform', 'rotate(' + (-h).toFixed(2) + ' 200 200)');
    for (var i = 0; i < labels.length; i++) { // letras y números siempre legibles
      var l = labels[i];
      l.el.setAttribute('transform', 'rotate(' + l.a + ' 200 200) rotate(' + (h - l.a).toFixed(2) + ' ' + l.x + ' ' + (l.y - 7) + ')');
    }
    var t = fmt(h);
    if (out && t !== last) { out.textContent = t; last = t; }
  }

  draw(heading);
  if (fixed) return;

  function animate() {
    if (hero) {
      hero.addEventListener('pointermove', function (e) {
        var r = wrap.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        target = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360; // rumbo hacia el puntero
      });
      hero.addEventListener('pointerleave', function () { target = start; });
    }

    gsap.ticker.add(function (time) {
      var d = ((target - heading + 540) % 360) - 180; // camino más corto
      heading += d * 0.06;                            // la tarjeta se asienta con inercia
      var idle = Math.sin(time * 0.9) * 1.6;           // reposo: oscila como un compás real
      draw(heading + idle);
    });
  }

  var s = document.createElement('script');
  s.src = '/_astro/vendor/gsap.min.js';
  s.onload = animate;
  s.onerror = function () { draw(start); };
  document.head.appendChild(s);
})();
