// Revisión antes de construir la web. Si algo esencial falta o está mal escrito,
// la construcción se detiene y la web publicada sigue como estaba.
import { readFileSync, readdirSync } from 'node:fs';

const errores = [];
const leer = (ruta) => {
  try { return JSON.parse(readFileSync(ruta, 'utf8')); }
  catch (e) { errores.push(`${ruta}: no se puede leer (${e.message})`); return null; }
};

// 1) vercel.json debe conservar lo que el panel no edita
const v = leer('vercel.json');
if (v) {
  if (v.framework !== 'astro') errores.push('vercel.json: falta "framework": "astro"');
  if (v.outputDirectory !== 'dist') errores.push('vercel.json: falta "outputDirectory": "dist"');
  if (!v.buildCommand) errores.push('vercel.json: falta "buildCommand"');
  if (!Array.isArray(v.headers) || !v.headers.some((h) => h.source === '/admin/(.*)'))
    errores.push('vercel.json: faltan las reglas de seguridad del panel (/admin/)');
  for (const r of v.redirects ?? []) {
    if (!r.source?.startsWith('/')) errores.push(`Redirección inválida: la dirección antigua "${r.source}" debe empezar por /`);
    if (!r.destination?.startsWith('/') && !/^https?:\/\//.test(r.destination ?? ''))
      errores.push(`Redirección inválida: la dirección nueva "${r.destination}" debe empezar por / o por http`);
  }
}

// 2) Los archivos de datos deben ser JSON válido
for (const f of readdirSync('src/data').filter((f) => f.endsWith('.json'))) leer(`src/data/${f}`);

// 3) El panel debe seguir protegido
const admin = readFileSync('public/admin/index.html', 'utf8');
if (!/integrity="sha384-/.test(admin) || !/Content-Security-Policy/.test(admin))
  errores.push('public/admin/index.html: falta la huella o las reglas de seguridad');

if (errores.length) {
  console.error('\n✖ Revisión fallida. No se publica nada:\n  - ' + errores.join('\n  - ') + '\n');
  process.exit(1);
}
console.log('✔ Revisión de configuración correcta');
