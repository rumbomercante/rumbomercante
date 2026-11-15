// Bloques especiales para el editor de artículos (como los bloques de Gutenberg en WordPress).
// Cada bloque se guarda en el artículo con un formato fijo que la web sabe mostrar.
(() => {
  const CMS = window.CMS;
  if (!CMS) return;
  const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const desesc = (s = '') => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  // ---------- Recuadro de aviso ----------
  const TIPOS = { info: 'Información', consejo: 'Consejo', peligro: 'Importante / seguridad' };
  CMS.registerEditorComponent({
    id: 'aviso',
    label: 'Recuadro de aviso',
    icon: 'campaign',
    fields: [
      { name: 'tipo', label: 'Tipo', widget: 'select', default: 'consejo', options: Object.entries(TIPOS).map(([value, label]) => ({ value, label })) },
      { name: 'texto', label: 'Texto', widget: 'text', hint: 'Puedes usar **negrita** y [enlaces](https://...).' },
    ],
    pattern: /^<div class="aviso aviso-(info|consejo|peligro)">\n\n([\s\S]*?)\n\n<\/div>$/m,
    fromBlock: (m = []) => ({ tipo: m[1] || 'consejo', texto: (m[2] || '').trim() }),
    toBlock: ({ tipo = 'consejo', texto = '' } = {}) => `<div class="aviso aviso-${TIPOS[tipo] ? tipo : 'consejo'}">\n\n${String(texto).trim()}\n\n</div>`,
    toPreview: ({ tipo = 'consejo', texto = '' } = {}) => `> **${TIPOS[tipo] || 'Aviso'}:** ${texto}`,
  });

  // ---------- Botón ----------
  CMS.registerEditorComponent({
    id: 'boton',
    label: 'Botón',
    icon: 'smart_button',
    fields: [
      { name: 'texto', label: 'Texto del botón', widget: 'string' },
      { name: 'url', label: 'Enlace', widget: 'string', hint: 'Por ejemplo /contacto/ o https://...' },
      { name: 'nueva', label: 'Abrir en otra pestaña', widget: 'boolean', default: false, required: false },
    ],
    pattern: /^<p class="boton-articulo"><a class="btn btn-brass" href="([^"]*)"( target="_blank" rel="noopener")?>([^<]*)<\/a><\/p>$/m,
    fromBlock: (m = []) => ({ url: desesc(m[1] || ''), nueva: !!m[2], texto: desesc(m[3] || '') }),
    toBlock: ({ texto = '', url = '', nueva = false } = {}) =>
      `<p class="boton-articulo"><a class="btn btn-brass" href="${esc(url)}"${nueva ? ' target="_blank" rel="noopener"' : ''}>${esc(texto)}</a></p>`,
    toPreview: ({ texto = '', url = '' } = {}) => `**[${texto || 'Botón'} →](${url || '#'})**`,
  });

  // ---------- Vídeo de YouTube ----------
  const idYoutube = (u = '') => {
    const m = String(u).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/) || String(u).match(/^([\w-]{11})$/);
    return m ? m[1] : '';
  };
  CMS.registerEditorComponent({
    id: 'youtube',
    label: 'Vídeo de YouTube',
    icon: 'smart_display',
    fields: [
      { name: 'url', label: 'Dirección del vídeo', widget: 'string', hint: 'Pega el enlace de YouTube, por ejemplo https://www.youtube.com/watch?v=...' },
      { name: 'titulo', label: 'Título del vídeo', widget: 'string', hint: 'Para personas que usan lectores de pantalla.' },
    ],
    pattern: /^<div class="video-articulo"><iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})" title="([^"]*)"[^>]*><\/iframe><\/div>$/m,
    fromBlock: (m = []) => ({ url: m[1] ? `https://www.youtube.com/watch?v=${m[1]}` : '', titulo: desesc(m[2] || '') }),
    toBlock: ({ url = '', titulo = '' } = {}) => {
      const id = idYoutube(url);
      if (!id) return '';
      return `<div class="video-articulo"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(titulo || 'Vídeo')}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
    },
    toPreview: ({ url = '', titulo = '' } = {}) => `▶ **Vídeo de YouTube:** ${titulo || ''} (${url})`,
  });

  // ---------- Lista con casillas (checklist) ----------
  CMS.registerEditorComponent({
    id: 'checklist',
    label: 'Lista con casillas',
    icon: 'checklist',
    fields: [{ name: 'items', label: 'Elementos', widget: 'list', hint: 'Un elemento por línea. Los lectores podrán marcarlos.' }],
    pattern: /^(?:- \[[ xX]\] .*(?:\n|$))+/m,
    fromBlock: (m = []) => ({ items: String(m[0] || '').trim().split('\n').map((l) => l.replace(/^- \[[ xX]\] /, '')).filter(Boolean) }),
    toBlock: ({ items = [] } = {}) => (Array.isArray(items) ? items : []).filter((i) => String(i).trim()).map((i) => `- [ ] ${String(i).trim()}`).join('\n'),
    toPreview: ({ items = [] } = {}) => (Array.isArray(items) ? items : []).map((i) => `- ☐ ${i}`).join('\n'),
  });
})();
