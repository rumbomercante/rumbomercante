// Publicación programada: Vercel llama a esta función cada noche (ver "crons" en vercel.json).
// Si algún artículo tiene como fecha el día de hoy (hora de Venezuela), hace un guardado vacío
// en GitHub para que la web se reconstruya y el artículo aparezca. Si no hay ninguno, no hace nada.
// Usa PANEL_GITHUB_TOKEN (la misma clave limitada del panel).
const REPO = 'rumbomercante/rumbomercante';
const RAMA = 'main';
const CARPETA = 'src/content/articulos';

export default async function handler(req, res) {
  const responder = (estado, datos) => {
    res.statusCode = estado;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(datos));
  };
  // Si existe CRON_SECRET en Vercel, solo acepta llamadas del programador de Vercel.
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.authorization !== `Bearer ${secreto}`) return responder(401, { error: 'No autorizado' });
  const token = process.env.PANEL_GITHUB_TOKEN;
  if (!token) return responder(503, { error: 'Falta PANEL_GITHUB_TOKEN' });

  const gh = async (ruta, opciones = {}) => {
    const r = await fetch(`https://api.github.com/repos/${REPO}${ruta}`, {
      ...opciones,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    });
    if (!r.ok) throw new Error(`GitHub ${r.status} en ${ruta}`);
    return r.json();
  };

  try {
    const hoy = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10);
    const archivos = (await gh(`/contents/${CARPETA}?ref=${RAMA}`)).filter((f) => f.name.endsWith('.md'));
    const deHoy = [];
    for (const f of archivos) {
      const r = await fetch(f.download_url, { headers: { Authorization: `Bearer ${token}` } });
      const texto = await r.text();
      const cabecera = texto.split(/^---\s*$/m)[1] || '';
      const fecha = (cabecera.match(/^fecha:\s*["']?(\d{4}-\d{2}-\d{2})/m) || [])[1];
      const publicado = !/^publicado:\s*false/m.test(cabecera);
      if (fecha === hoy && publicado) deHoy.push(f.name.replace(/\.md$/, ''));
    }
    if (!deHoy.length) return responder(200, { hoy, programados: 0, mensaje: 'Nada que publicar hoy.' });

    // Evita repetir si ya se hizo hoy.
    const ref = await gh(`/git/ref/heads/${RAMA}`);
    const ultimo = await gh(`/git/commits/${ref.object.sha}`);
    const mensaje = `Publicar artículos programados del ${hoy}: ${deHoy.join(', ')}`;
    if (ultimo.message.startsWith(`Publicar artículos programados del ${hoy}`)) return responder(200, { hoy, programados: deHoy, mensaje: 'Ya se publicó hoy.' });

    const nuevo = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: mensaje, tree: ultimo.tree.sha, parents: [ref.object.sha] }) });
    await gh(`/git/refs/heads/${RAMA}`, { method: 'PATCH', body: JSON.stringify({ sha: nuevo.sha }) });
    return responder(200, { hoy, programados: deHoy, mensaje: 'Publicación lanzada.' });
  } catch (e) {
    return responder(500, { error: e.message });
  }
}
