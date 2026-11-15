// Arma el HTML final de cada página a partir de las plantillas y de los datos editables.
import fs from 'node:fs';
import path from 'node:path';

const leer = (r) => fs.readFileSync(path.join(process.cwd(), 'src', r), 'utf8');
const json = (r) => JSON.parse(leer(r));
const I = json('plantillas/items.json');
const SHELLS = json('plantillas/shells.json');
const SEO_PAG = json('plantillas/_seo.json');
const seo = json('data/seo.json');
const portada = json('data/portada.json');
const { anunciantes } = json('data/anunciantes.json');
const anunciate = json('data/anunciate.json');
const apariencia = json('data/apariencia.json');
const { paginas: seoPaginas } = json('data/paginas.json');
const pagina = (k) => leer(`plantillas/paginas/${k}.html`);

const SITE = seo.url.replace(/\/$/, '');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (t, m) => t.replace(/\{\{([\w-]+)\}\}/g, (a, k) => (k in m ? m[k] : a));
const fechaTxt = (d) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
const SECS = I.secs;
const HERRAMIENTAS = [
  { ruta: '/recursos/herramientas/calculadora-descanso/', titulo: 'Calculadora de horas de descanso' },
  { ruta: '/recursos/herramientas/conversor-unidades/', titulo: 'Conversor de unidades marítimas' },
];
const subDe = (sec, sub) => SECS[sec].subs.find((s) => s.key === sub) ?? { key: sub, nombre: sub };

export function preparar(entradas) {
  return entradas
    .filter((e) => e.data.publicado !== false)
    .map((e) => {
      const d = e.data;
      const [seccion, subseccion] = d.categoria.split('/');
      const palabras = (e.body ?? '').split(/\s+/).filter(Boolean).length;
      return {
        ...d, slug: e.id, html: e.rendered?.html ?? '', headings: e.rendered?.metadata?.headings ?? [],
        seccion, subseccion, ruta: `/${seccion}/${subseccion}/${e.id}/`,
        fechaTxt: fechaTxt(d.fecha), iso: d.fecha.toISOString().slice(0, 10),
        min: d.minutos || Math.max(1, Math.ceil(palabras / 200)),
        sec: SECS[seccion], subLabel: subDe(seccion, subseccion).nombre,
      };
    })
    .sort((a, b) => b.fecha - a.fecha);
}

const NIVELES = { mas: ['.42', '.56'], menos: ['.84', '.92'] };
const cssApariencia = () => {
  const n = NIVELES[apariencia.translucidez];
  if (!n) return '';
  const fondo = `linear-gradient(150deg, rgba(255,255,255,.05), rgba(255,255,255,.01)), linear-gradient(160deg, rgba(10,40,72,${n[0]}), rgba(6,26,45,${n[1]}))`;
  return `<style>.ad-slide .ad-card-body, .value, .tool, .side-card, .refcard { background: ${fondo} !important; }</style>`;
};
const verificacion = () => (seo.verificacionGoogle ? `<meta name="google-site-verification" content="${esc(seo.verificacionGoogle)}">` : '') + (seo.verificacionBing ? `<meta name="msvalidate.01" content="${esc(seo.verificacionBing)}">` : '');
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const NOINDEX = '<meta name="robots" content="noindex">';

const envolver = (tipo, meta, main, analytics, extra = '') => {
  const s = SHELLS[tipo];
  const out = s.doc + verificacion() + meta + fill(s.tail + cssApariencia() + extra, { SITE }) + '</head>' + fill(s.pre, { SITE }) + main + fill(s.post, { SITE, ANALYTICS: analytics });
  return out;
};
const reemplazaValor = (m, viejo, nuevo) => (viejo === nuevo ? m : m.split(`"${esc(viejo)}"`).join(`"${esc(nuevo)}"`).split(`>${esc(viejo)}<`).join(`>${esc(nuevo)}<`));
const seoDe = (ruta) => seoPaginas.find((p) => p.ruta === ruta);
const metaPagina = (ruta) => {
  const o = SEO_PAG[ruta]; const e = seoDe(ruta);
  let m = o.meta.split('{{SITE}}').join(SITE);
  if (e) { m = reemplazaValor(m, o.titulo, e.titulo || o.titulo); m = reemplazaValor(m, o.descripcion, e.descripcion || o.descripcion); }
  return m;
};
const anal = (ruta) => SEO_PAG[ruta].analytics;

const imgA = (p) => (p.imagenAncho ? `alt="" width="${p.imagenAncho}" height="${p.imagenAlto}"` : `alt="${esc(p.titulo)}"`);

const tarjeta = (p) => fill(I.card, {
  IMGA: imgA(p),
  H: p.ruta, ICON: p.sec.icon, ACCENT: p.sec.accent, IMG: p.imagen, TITULO: esc(p.titulo), DESC: esc(p.descripcion),
  SUBLABEL: esc(p.subLabel), FECHATXT: p.fechaTxt, MIN: p.min,
  TAGS: fill(I.tag, { T: esc(p.tipo) }) + (p.descargaUrl ? I.tagDescarga : ''),
});

function articulo(p, posts) {
  const url = SITE + p.ruta;
  const otros = posts.filter((x) => x.seccion === p.seccion && x.slug !== p.slug);
  const rel = [...otros.filter((x) => x.subseccion === p.subseccion), ...otros.filter((x) => x.subseccion !== p.subseccion)].slice(0, 3).map(tarjeta).join('');
  const toc = p.headings.filter((h) => h.depth === 2).map((h) => fill(I.tocLi, { ID: `#${h.slug}`, TXT: esc(h.text) })).join('');
  let acciones = '';
  if (p.imprimible) acciones = I.actPrint;
  if (p.descargaUrl) acciones = I.actRaw.replace('/descargas/registro-horas-descanso.csv', esc(p.descargaUrl)).replace('Descargar plantilla (CSV / Excel)', esc(p.descargaTexto || 'Descargar'));
  const main = fill(I.art, {
    SITE, PATH: p.ruta, ACCENT: p.sec.accent, SEC: p.seccion, SUB: p.subseccion, SUBLABEL: esc(p.subLabel), CORTA: esc(p.sec.corta), TIPO: esc(p.tipo),
    TITULO: esc(p.titulo), DESC: esc(p.descripcion), MIN: p.min, FECHATXT: p.fechaTxt, IMG: p.imagen, COVERA: p.imagenAncho ? `alt="${esc(p.imagenAlt)}" width="${p.imagenAncho}" height="${p.imagenAlto}"` : (p.imagenAlt ? `alt="${esc(p.imagenAlt)}"` : 'alt'),
    WA: encodeURIComponent(`${p.titulo} ${url}`), ACTIONS: acciones, BODY: p.html, TOC: toc,
    TAGS: p.etiquetas.map((t) => fill(I.tagHash, { T: esc(t) })).join(''), REL: rel,
  });
  const t = p.seo?.titulo || `${p.titulo} | ${seo.nombre}`;
  const d = p.seo?.descripcion || p.descripcion;
  const img = p.seo?.imagen || p.imagen;
  const meta = fill(I.artMeta, { OGW: p.seo?.imagen ? 1200 : (p.imagenAncho || 1200), OGH: p.seo?.imagen ? 630 : (p.imagenAlto || 630), SITE, PATH: p.ruta, OGIMG: img.startsWith('http') ? img : SITE + img, SEOT: esc(t), SEOD: esc(d), ALT_OG: esc(p.titulo), FECHA: p.iso });
  const analytics = `<vercel-analytics data-props="{}" data-params="${esc(JSON.stringify({ categoria: p.seccion, sub: p.subseccion, slug: p.slug }))}" data-pathname="${p.ruta}"></vercel-analytics>`;
  const autor = { '@type': 'Person', name: 'Jhonny Castorani', url: `${SITE}/nosotros/` };
  const datos = ld({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', headline: p.titulo, description: d, datePublished: p.iso, image: img.startsWith('http') ? img : SITE + img, author: autor, publisher: { '@type': 'Organization', name: seo.nombre, url: SITE }, mainEntityOfPage: url, inLanguage: 'es' },
    { '@type': 'BreadcrumbList', itemListElement: [['Inicio', '/'], [p.sec.corta, `/${p.seccion}/`], [p.subLabel, `/${p.seccion}/${p.subseccion}/`], [p.titulo, p.ruta]].map(([name, r], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + r })) },
  ] });
  return envolver('articulo', (p.seo?.noindex ? NOINDEX : '') + meta, main, analytics, datos);
}

function seccion(k, posts) {
  const s = SECS[k]; const del = posts.filter((p) => p.seccion === k);
  const subs = s.subs.map((u) => {
    const lista = k === 'recursos' && u.key === 'herramientas' ? HERRAMIENTAS : del.filter((p) => p.subseccion === u.key);
    const H = `/${k}/${u.key}/`;
    if (!lista.length) return fill(I.subSoon, { H, N: esc(u.nombre), D: esc(u.desc), V: esc(u.ver) });
    return fill(I.sub, { H, N: esc(u.nombre), C: lista.length, D: esc(u.desc), V: esc(u.ver), LIS: lista.map((p) => fill(I.subLi, { H: p.ruta, T: esc(p.titulo) })).join('') });
  }).join('');
  return fill(pagina(k), { SITE, SUBS: subs, CARDS: del.map(tarjeta).join('') });
}

function subseccion(k, u, posts) {
  const lista = posts.filter((p) => p.seccion === k && p.subseccion === u);
  const contenido = lista.length ? `${I.gridOpen}${lista.map(tarjeta).join('')}</div>` : fill(I.empty, { N: esc(subDe(k, u).nombre) });
  return fill(pagina(`${k}__${u}`), { SITE, LISTA: contenido });
}

function blog(posts) {
  const n = { all: posts.length }; for (const k of Object.keys(SECS)) n[k] = posts.filter((p) => p.seccion === k).length;
  const tipos = [...new Set(posts.map((p) => p.tipo))].sort((a, b) => a.localeCompare(b, 'es'));
  const POSTS = posts.map((p) => { const cat = `${p.sec.corta} · ${p.subLabel}`; return fill(I.post, { IMGA: imgA(p), H: p.ruta, SEC: p.seccion, TIPO: esc(p.tipo), ACCENT: p.sec.accent, IMG: p.imagen, TITULO: esc(p.titulo), DESC: esc(p.descripcion), FECHATXT: p.fechaTxt, CATTXT: esc(cat), MIN: p.min, SEARCH: esc(`${p.titulo} ${p.descripcion} ${cat} ${p.tipo}`.toLowerCase()) }); }).join('');
  const RECENTS = posts.slice(0, 5).map((p) => fill(I.recent.replace('alt=""', 'alt=""{{DIM}}'), { DIM: p.imagenAncho ? ` width="${p.imagenAncho}" height="${p.imagenAlto}"` : '', H: p.ruta, ACCENT: p.sec.accent, IMG: p.imagen, TITULO: esc(p.titulo), FECHATXT: p.fechaTxt })).join('');
  const m = { SITE, POSTS: `${POSTS}</div>`, RECENTS, CHIPS: tipos.map((t) => fill(I.chip, { T: esc(t) })).join('') };
  for (const k in n) m[`N_${k}`] = n[k];
  return fill(pagina('blog'), m);
}

const dupAd = (s) => s.replace('<li class="ad-slide"', '<li class="ad-slide" aria-hidden="true"').replace(/ alt="[^"]*"/, ' alt=""').replace(/(class="ad-card-go"[^>]*?)>/, '$1 tabindex="-1">');
function anuncio(a) {
  if (a.hueco) {
    return I.adEmptyRaw.replace('Tu categoría · Tu web o red social', esc(a.etiqueta)).split('Coloca tu marca aquí').join(esc(a.nombre)).replace('Describe tu negocio y sácale el mayor provecho de estar aquí publicado.', esc(a.frase)).replace('href="/anunciate/"', `href="${esc(a.url)}"`);
  }
  return fill(I.adFull, { FORMATO: a.formato || 'wide', LOGO: esc(a.logo), ALT: esc(a.alt || a.nombre), K: esc(a.etiqueta), N: esc(a.nombre), Q: esc(a.frase), URL: esc(a.url) });
}

const nombreBase = (s) => String(s).split('/').pop().replace(/\.md$/, '');

function portadaHtml(posts) {
  const porSlug = Object.fromEntries(posts.map((p) => [p.slug, p]));
  const START = portada.destacados.map((s) => porSlug[nombreBase(s)]).filter(Boolean).map((p) => fill(I.start, { H: p.ruta, TITULO: esc(p.titulo), DESC: esc(p.descripcion), IMG: p.imagen, META: esc(`${p.sec.corta} · ${p.subLabel} · ${p.min} min de lectura`) })).join('');
  const SLIDES = posts.slice(0, 8).map((p) => fill(I.slide, { IMGA: imgA(p), H: p.ruta, IMG: p.imagen, TITULO: esc(p.titulo), TIPO: esc(p.tipo), FECHATXT: p.fechaTxt, MIN: p.min })).join('');
  const base = anunciantes.map(anuncio);
  const ADS = base.join('') + base.map(dupAd).join('');
  let h = pagina('home');
  if (portada.fotoPortada) h = h.replace(/(<picture class="hero-img"[^>]*>)[\s\S]*?<img src="[^"]*"/, `$1<img src="${esc(portada.fotoPortada)}"`);
  const quita = (marca) => { const r = new RegExp(`<section (?:(?!<section )[\\s\\S])*?${marca}[\\s\\S]*?</section>`); h = h.replace(r, ''); };
  if (portada.mostrarSecciones === false) quita('class="dm-features"');
  if (portada.mostrarDestacados === false) quita('class="dm-startlist"');
  if (portada.mostrarUltimas === false) quita('class="dm-track"');
  if (portada.mostrarHerramientas === false) quita('class="dm-tools"');
  if (portada.mostrarAnunciantes === false) quita('class="ad-marquee"');
  h = anunciate.promoVisible === false ? h.replace(/<div class="promo"[\s\S]*?<\/div>/, '') : h.replace('Anúnciate gratis<', `${esc(anunciate.promoTitulo)}<`).replace('Durante el lanzamiento, los espacios para anunciantes no tienen coste.', esc(anunciate.promoTexto));
  return fill(h, { SITE, START, SLIDES, ADS });
}

function anunciatePag() {
  const BOXES = anunciate.modalidades.map((m, i) => fill(I.box, { ICON: I.boxIconos[i] ?? I.boxIconos[0], T: esc(m.titulo), D: esc(m.texto) })).join('');
  const STEPS = anunciate.pasos.map((p) => fill(I.step, { T: esc(p.titulo), D: esc(p.texto) })).join('');
  const base = pagina('anunciate');
  const planes = (anunciate.planes ?? []).map((m) => fill(I.box, { ICON: I.boxIconos[0], T: esc(m.nombre), D: `<strong>${esc(m.precio)}</strong> ${esc(m.descripcion)}` })).join('');
  const cab = base.match(/<section class="section"[^>]*><div class="container"[^>]*>/)[0];
  const kick = base.match(/<div class="kicker"[^>]*>/)[0];
  const grid = base.match(/<div class="grid grid-3"[^>]*>/)[0];
  const bloque = planes ? `${cab}${kick}Planes</div>${grid}${planes}</div></div></section>` : '';
  return fill(base.replace('<section class="section-tight steps-band"', `${bloque}<section class="section-tight steps-band"`), { SITE, TITULO: esc(anunciate.titulo), INTRO: esc(anunciate.introduccion), GRATIS: esc(anunciate.textoGratis), BOXES, STEPS, NOTA: esc(anunciate.nota), CTAT: esc(anunciate.ctaTitulo), CTAB: esc(anunciate.ctaBoton) });
}

export function paginas(posts) {
  const R = {};
  const mapa = [];
  const hoy = new Date().toISOString().slice(0, 10);
  const add = (salida, html) => { R[salida] = html; };
  for (const [ruta, info] of Object.entries(SEO_PAG)) {
    const salida = ruta === '/' ? 'index.html' : ruta.endsWith('.html') ? ruta.slice(1) : `${ruta.slice(1)}index.html`;
    const seg = ruta.split('/').filter(Boolean);
    let main;
    if (info.tipo === 'articulo') continue;
    if (info.tipo === 'home') main = portadaHtml(posts);
    else if (info.tipo === 'blog') main = blog(posts);
    else if (info.tipo === 'seccion') main = seccion(seg[0], posts);
    else if (info.tipo === 'sub') main = subseccion(seg[0], seg[1], posts);
    else if (info.tipo === 'anunciate') main = anunciatePag();
    else main = fill(pagina(seg.join('__') || 'home'), { SITE });
    const vacia = info.tipo === 'sub' && !posts.some((p) => p.seccion === seg[0] && p.subseccion === seg[1]) && seg[1] !== 'herramientas';
    const sinIndice = seoDe(ruta)?.noindex || vacia || info.tipo === 'nf';
    if (info.tipo === 'contacto') main = main.split('contacto@rumbomercante.com').join(esc(seo.correoContacto));
    const datos = info.tipo === 'home' ? ld({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Organization', name: seo.nombre, url: SITE, logo: `${SITE}/favicon.svg` }, { '@type': 'WebSite', name: seo.nombre, url: SITE, inLanguage: 'es' }] }) : '';
    let cabeza = (sinIndice ? NOINDEX : '') + metaPagina(ruta);
    if (info.tipo === 'nf') cabeza = cabeza.replace(/<link rel="canonical"[^>]*>/, '');
    add(salida, envolver(info.tipo, cabeza, main, anal(ruta), datos));
    if (!sinIndice) mapa.push({ ruta, fecha: hoy });
  }
  for (const p of posts) {
    add(`${p.ruta.slice(1)}index.html`, articulo(p, posts));
    if (!p.seo?.noindex) mapa.push({ ruta: p.ruta, fecha: p.iso });
  }
  mapa.sort((a, b) => a.ruta.localeCompare(b.ruta));
  add('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mapa.map((u) => `  <url><loc>${SITE}${u.ruta}</loc><lastmod>${u.fecha}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  add('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  return R;
}
