// Arma el HTML final de cada página a partir de las plantillas y de los datos editables.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

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

// Medidas de una imagen local (WebP, JPEG o PNG) leídas de su cabecera, para declarar width/height
// en las imágenes subidas desde el panel y evitar saltos de la página mientras cargan.
function medidasImagen(src) {
  if (!src || !src.startsWith('/')) return null;
  let b;
  try { b = fs.readFileSync(path.join(process.cwd(), 'public', decodeURIComponent(src))); } catch { return null; }
  if (b.length < 30) return null;
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const t = b.toString('ascii', 12, 16);
    if (t === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (t === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (t === 'VP8L') { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
    return null;
  }
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

// Fecha de hoy en Venezuela (UTC−4): los artículos con fecha futura quedan programados y no se publican
// hasta ese día (la web se reconstruye sola cada noche, ver api/publicar-programados.js).
const HOY_VE = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);

export function preparar(entradas) {
  return entradas
    .filter((e) => e.data.publicado !== false)
    .filter((e) => e.data.fecha.toISOString().slice(0, 10) <= HOY_VE)
    .map((e) => {
      const d = e.data;
      const [seccion, subseccion] = d.categoria.split('/');
      const palabras = (e.body ?? '').split(/\s+/).filter(Boolean).length;
      const med = d.imagenAncho ? null : medidasImagen(d.imagen);
      return {
        ...d, ...(med ? { imagenAncho: med.w, imagenAlto: med.h } : {}), slug: e.id, html: e.rendered?.html ?? '', headings: e.rendered?.metadata?.headings ?? [],
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

// ---------- Menú superior y pie de página (editables en el panel) ----------
const menu = json('data/menu.json');
const pie = json('data/pie.json');
const PIE = leer('plantillas/pie.html');
const EXTERNO = leer('plantillas/pie-externo.svg');
const CN = ' data-astro-cid-nen7h5rs';
const CF = ' data-astro-cid-jo6i4kqk';
const navHtml = (ruta) => `<ul id="nav-list"${CN}>` +
  menu.enlaces.map((e) => `<li${CN}><a href="${esc(e.url)}"${e.url === ruta ? ' aria-current="page"' : ''}${CN}>${esc(e.texto)}</a></li>`).join('') +
  (menu.boton?.texto ? `<li class="nav-cta"${CN}><a href="${esc(menu.boton.url)}" class="btn btn-brass btn-sm"${CN}>${esc(menu.boton.texto)}</a></li>` : '') + '</ul>';
const ICONOS_REDES = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  whatsapp: '<path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.5c0 3.6 2.9 6.5 6.5 6.5l1-1.6-2-1-1 1a4.5 4.5 0 0 1-2.4-2.4l1-1-1-2z"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3a5 5 0 0 0 5 5"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  x: '<path d="M4 4l16 16M20 4L4 20"/>',
  telegram: '<path d="M21 4L3 11l6 2 2 6 3-4 5 4z"/><path d="M9 13l8-6"/>',
  correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
};
const NOMBRE_RED = { instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', youtube: 'YouTube', tiktok: 'TikTok', linkedin: 'LinkedIn', x: 'X', telegram: 'Telegram', correo: 'Correo' };
const redesHtml = () => {
  const redes = (pie.redes ?? []).filter((r) => r.url && ICONOS_REDES[r.red]);
  if (!redes.length) return '';
  return `<ul class="footer-redes" aria-label="Redes sociales"${CF}>` + redes.map((r) => {
    const externo = /^https?:/.test(r.url);
    return `<li${CF}><a href="${esc(r.url)}"${externo ? ' target="_blank" rel="noopener"' : ''} aria-label="${esc(NOMBRE_RED[r.red])}"${CF}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS_REDES[r.red]}</svg></a></li>`;
  }).join('') + '</ul>';
};
const pieHtml = () => fill(PIE, {
  LEMA: esc(pie.lema), FIRMA: esc(pie.firma), REDES: redesHtml(), REDES_TITULO: esc(pie.redesTitulo ?? 'Conéctate a Nuestro Rumbo'), COPY: esc(pie.copyright),
  LEGALES: (pie.legales ?? []).map((l) => `<a href="${esc(l.url)}"${CF}>${esc(l.texto)}</a>`).join(''),
  COLUMNAS: pie.columnas.map((c) => `<div${CF}><h3${CF}>${esc(c.titulo)}</h3><ul${CF}>` + c.enlaces.map((e) =>
    `<li${CF}><a href="${esc(e.url)}"${e.externo ? ' target="_blank" rel="noopener"' : ''}${CF}>${esc(e.texto)}${e.externo ? ' ' + EXTERNO : ''}</a></li>`).join('') + '</ul></div>').join(''),
});

// ---------- Fotos de artículos a su tamaño (srcset) ----------
// scripts/miniaturas.mjs crea /img/mini/<nombre>-<ancho>.webp; aquí se ofrecen al navegador con el
// tamaño real al que se muestra cada tipo de tarjeta, para que no descargue la foto de 1600 px.
const TAMANOS = {
  card: '(max-width: 700px) calc(100vw - 42px), 314px',
  post: '(max-width: 700px) calc(100vw - 60px), 630px',
  recent: '42px',
  start: '(max-width: 700px) 110px, 170px',
  slide: '285px',
  art: '(max-width: 860px) calc(100vw - 70px), 611px',
};
for (const k of Object.keys(TAMANOS)) if (typeof I[k] === 'string') I[k] = I[k].replace('src="{{IMG}}"', `src="{{IMG}}" {{SRCSET_${k}}}`);
const srcsetDe = (src, tipo) => {
  const m = /^\/img\/articulos\/([^/]+)\.(?:jpe?g|png|webp)$/i.exec(src);
  if (!m) return '';
  const partes = [200, 400, 700, 1000]
    .filter((w) => fs.existsSync(path.join(process.cwd(), 'public/img/mini', `${m[1]}-${w}.webp`)))
    .map((w) => `/img/mini/${m[1]}-${w}.webp ${w}w`);
  if (!partes.length) return '';
  const med = medidasImagen(src);
  if (med) partes.push(`${src} ${med.w}w`);
  return `srcset="${partes.join(', ')}" sizes="${TAMANOS[tipo]}"`;
};
const ponerSrcset = (html) => html.replace(/src="([^"]+)" \{\{SRCSET_(\w+)\}\}/g, (_, src, tipo) => `src="${src}" ${srcsetDe(src, tipo)}`.trimEnd());

// ---------- Hojas de estilo unidas ----------
// Cada tipo de página cargaba 6-8 hojas de estilo por separado antes de mostrarse. Se unen, en el mismo
// orden (incluido el bloque <style> intermedio), en un solo archivo con huella en el nombre.
const ESTILOS = {}; // tipo -> { tail, href, css }
function estilosUnidos(tipo, tail) {
  if (ESTILOS[tipo]) return ESTILOS[tipo].tail;
  const trozos = [...tail.matchAll(/<link rel="stylesheet" href="([^"]+)">|<style>([\s\S]*?)<\/style>/g)];
  const links = trozos.filter((t) => t[1]);
  if (links.length < 2) return (ESTILOS[tipo] = { tail }).tail;
  const inicio = links[0].index;
  const fin = links.at(-1).index + links.at(-1)[0].length;
  const dentro = trozos.filter((t) => t.index >= inicio && t.index < fin);
  const resto = dentro.reduce((s, t) => s.replace(t[0], ''), tail.slice(inicio, fin));
  if (resto.trim()) return (ESTILOS[tipo] = { tail }).tail; // hay otras etiquetas en medio: no se toca
  const css = dentro.map((t) => t[1]
    ? `/* ${t[1]} */\n` + fs.readFileSync(path.join(process.cwd(), 'public', t[1].split('?')[0]), 'utf8')
    : `/* bloque de la plantilla */\n${t[2]}`).join('\n');
  const huella = createHash('sha256').update(css).digest('hex').slice(0, 10);
  const href = `/_astro/estilos-${tipo}-${huella}.css`;
  ESTILOS[tipo] = { href, css, tail: tail.slice(0, inicio) + `<link rel="stylesheet" href="${href}">` + tail.slice(fin) };
  return ESTILOS[tipo].tail;
}

const envolver = (tipo, meta, main, analytics, extra = '', ruta = '') => {
  const s = { ...SHELLS[tipo], tail: estilosUnidos(tipo, SHELLS[tipo].tail) };
  const pre = fill(s.pre, { SITE }).replace(/<ul id="nav-list"[\s\S]*?<\/ul>/, () => navHtml(ruta));
  const post = fill(s.post, { SITE, ANALYTICS: analytics }).replace(/<footer[\s\S]*?<\/footer>/, () => pieHtml());
  const cabeza = meta.replace('<link rel="icon" type="image/svg+xml" href="/favicon.svg">', '$&<link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">');
  const out = s.doc + verificacion() + cabeza + fill(s.tail + cssApariencia() + extra, { SITE }) + '</head>' + pre + ponerSrcset(main) + post;
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

// Tablas cuya primera celda de encabezado está vacía (la primera columna nombra cada fila):
// la primera celda de cada fila pasa a ser encabezado de fila, para que los lectores de pantalla la anuncien.
const encabezadosDeFila = (html) => html.replace(/<table>[\s\S]*?<\/table>/g, (tabla) => {
  const primera = tabla.match(/<thead>\s*<tr>\s*<th[^>]*>([\s\S]*?)<\/th>/);
  if (!primera || primera[1].trim()) return tabla;
  return tabla.replace(/<tbody>[\s\S]*?<\/tbody>/, (cuerpo) =>
    cuerpo.replace(/<tr>(\s*)<td([^>]*)>([\s\S]*?)<\/td>/g, '<tr>$1<th scope="row"$2>$3</th>'));
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
    WA: encodeURIComponent(`${p.titulo} ${url}`), ACTIONS: acciones, BODY: encabezadosDeFila(p.html), TOC: toc,
    TAGS: p.etiquetas.map((t) => fill(I.tagHash, { T: esc(t) })).join(''), REL: rel,
  });
  const t = p.seo?.titulo || `${p.titulo} | ${seo.nombre}`;
  const d = p.seo?.descripcion || p.descripcion;
  const img = p.seo?.imagen || p.imagen;
  const meta = fill(I.artMeta, { OGW: p.seo?.imagen ? 1200 : (p.imagenAncho || 1200), OGH: p.seo?.imagen ? 630 : (p.imagenAlto || 630), SITE, PATH: p.ruta, OGIMG: img.startsWith('http') ? img : SITE + img, SEOT: esc(t), SEOD: esc(d), ALT_OG: esc(p.titulo), FECHA: p.iso });
  const analytics = ''; // Estadística de Vercel retirada (no estaba activada y daba error 404)
  const autor = { '@type': 'Person', name: AUTOR, url: `${SITE}/nosotros/` };
  const datos = ld({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', headline: p.titulo, description: d, datePublished: p.iso, image: img.startsWith('http') ? img : SITE + img, author: autor, publisher: { '@type': 'Organization', name: seo.nombre, url: SITE }, mainEntityOfPage: url, inLanguage: 'es' },
    { '@type': 'BreadcrumbList', itemListElement: [['Inicio', '/'], [p.sec.corta, `/${p.seccion}/`], [p.subLabel, `/${p.seccion}/${p.subseccion}/`], [p.titulo, p.ruta]].map(([name, r], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + r })) },
  ] });
  return envolver('articulo', (p.seo?.noindex ? NOINDEX : '') + meta, main, analytics, datos, p.ruta);
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
  const TX = {};
  for (const [g, campos] of Object.entries(portada.textos ?? {})) for (const [k, v] of Object.entries(campos)) TX[`TX_${g}_${k}`] = esc(v);
  return fill(h, { SITE, START, SLIDES, ADS, ...TX });
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

// ---------- Nosotros y páginas legales (Markdown editable en el panel) ----------
const PZ = json('plantillas/nosotros-piezas.json');
const CW = ' data-astro-cid-w6fzp2su';
function nosotrosPag(e) {
  const d = e.data;
  const foto = d.foto
    ? `<img src="${esc(d.foto)}" fetchpriority="high" alt="${esc(d.nombre)}" width="600" height="600"${CW}>`
    : PZ.foto.replace('alt="Jhonny Castorani"', `alt="${esc(d.nombre)}"`);
  const DATOS = (d.datos ?? []).map((x, i) => `<li${CW}>${PZ.iconosDatos[i % PZ.iconosDatos.length]} ${esc(x)}</li>`).join('');
  const VALORES = (d.valores ?? []).map((v, i) => `<div class="value reveal"${CW}>${PZ.iconosValores[i % PZ.iconosValores.length]}<h3${CW}>${esc(v.titulo)}</h3><p${CW}>${esc(v.texto)}</p></div>`).join('');
  return fill(pagina('nosotros'), {
    SITE, N_TITULO: esc(d.titulo), N_FOTO: foto, N_NOMBRE: esc(d.nombre), N_CARGO: esc(d.cargo), N_DATOS: DATOS,
    N_HISTORIA: e.rendered?.html ?? '', N_CIERRE: esc(d.cierre), N_FIRMA: esc(d.firma),
    N_VALORES_TITULO: esc(d.valoresTitulo), N_VALORES: VALORES, N_CTA_TITULO: esc(d.ctaTitulo), N_CTA_BOTON: esc(d.ctaBoton),
  });
}
const legalPag = (clave, e) => fill(pagina(clave), {
  SITE, TITULO: esc(e.data.titulo), ETIQUETA: esc(e.data.etiqueta ?? 'Información legal'),
  ACTUALIZADO: e.data.actualizado ? fechaTxt(e.data.actualizado) : '', CUERPO: e.rendered?.html ?? '',
});
// La tarjeta de autor y la firma de los artículos usan los datos de Nosotros.
function aplicarAutor(n) {
  if (!n) return;
  const cambios = [['Jhonny Castorani', esc(n.nombre)], ['2do Oficial de Máquinas', esc(n.cargo)], ['Graduado hace 8 años, con experiencia consolidada a bordo de buques de pasajeros.', esc(n.resumenAutor)]];
  for (const k of Object.keys(I)) if (typeof I[k] === 'string') for (const [a, b] of cambios) if (b) I[k] = I[k].split(a).join(b);
  AUTOR = n.nombre;
}
let AUTOR = 'Jhonny Castorani';

// Las fotos de cabecera del blog y de contacto son fondos CSS: el navegador no las descubre hasta tarde.
// Se le avisan desde el principio (con la versión de móvil en pantallas pequeñas) para que la cabecera cargue antes.
const precargaFondo = (movil, escritorio) =>
  `<link rel="preload" as="image" href="${movil}" type="image/webp" media="(max-width: 700px)" fetchpriority="high">` +
  `<link rel="preload" as="image" href="${escritorio}" type="image/webp" media="(min-width: 701px)" fetchpriority="high">`;
const PRECARGA = {
  blog: precargaFondo('/img/crucero-blog-sm.webp', '/img/crucero-blog.webp'),
  contacto: precargaFondo('/img/portacontenedores-contacto-sm.webp', '/img/portacontenedores-contacto.webp'),
};

export function paginas(posts, pags = []) {
  const PAG = Object.fromEntries(pags.map((e) => [e.id, e]));
  aplicarAutor(PAG.nosotros?.data);
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
    else if (ruta === '/nosotros/' && PAG.nosotros) main = nosotrosPag(PAG.nosotros);
    else if (PAG[seg[0]] && seg.length === 1 && info.tipo === 'legal') main = legalPag(seg[0], PAG[seg[0]]);
    else main = fill(pagina(seg.join('__') || 'home'), { SITE });
    const vacia = info.tipo === 'sub' && !posts.some((p) => p.seccion === seg[0] && p.subseccion === seg[1]) && seg[1] !== 'herramientas';
    const sinIndice = seoDe(ruta)?.noindex || vacia || info.tipo === 'nf';
    if (info.tipo === 'contacto') main = seo.correoContacto
      ? main.split('contacto@rumbomercante.com').join(esc(seo.correoContacto))
      : main.replace(/<p class="direct"[\s\S]*?<\/p>/, ''); // sin correo público: no se muestra la línea
    const datos = info.tipo === 'home' ? ld({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Organization', name: seo.nombre, url: SITE, logo: `${SITE}/apple-touch-icon.png` }, { '@type': 'WebSite', name: seo.nombre, url: SITE, inLanguage: 'es' }] }) : '';
    let cabeza = (sinIndice ? NOINDEX : '') + metaPagina(ruta) + (PRECARGA[info.tipo] ?? '');
    if (info.tipo === 'nf') cabeza = cabeza.replace(/<link rel="canonical"[^>]*>/, '');
    add(salida, envolver(info.tipo, cabeza, main, anal(ruta), datos, ruta));
    if (!sinIndice) mapa.push({ ruta, fecha: hoy });
  }
  for (const p of posts) {
    add(`${p.ruta.slice(1)}index.html`, articulo(p, posts));
    if (!p.seo?.noindex) mapa.push({ ruta: p.ruta, fecha: p.iso });
  }
  mapa.sort((a, b) => a.ruta.localeCompare(b.ruta));
  add('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mapa.map((u) => `  <url><loc>${SITE}${u.ruta}</loc><lastmod>${u.fecha}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  for (const e of Object.values(ESTILOS)) if (e.css) add(e.href.slice(1), e.css);
  add('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  return R;
}
