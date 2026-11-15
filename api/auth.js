// Acceso al panel con usuario y contraseña propios.
// Si son correctos, devuelve a la pantalla de acceso (/admin/) el permiso de GitHub guardado en Vercel.
// Variables en Vercel (Settings › Environment Variables), nunca en el código:
//   PANEL_USUARIO       nombre de usuario
//   PANEL_CLAVE_HASH    huella de la contraseña (se crea con crear-clave-panel.command)
//   PANEL_GITHUB_TOKEN  clave de GitHub limitada a este repositorio (Contents: lectura y escritura)
import { scryptSync, timingSafeEqual } from 'node:crypto';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const igual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

function claveCorrecta(clave, guardada) {
  const [tipo, sal, huella] = String(guardada || '').split('$');
  if (tipo !== 'scrypt' || !sal || !huella) return false;
  const calc = scryptSync(String(clave), Buffer.from(sal, 'base64'), 64);
  const ref = Buffer.from(huella, 'base64');
  return ref.length === calc.length && timingSafeEqual(calc, ref);
}

async function leerFormulario(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let datos = typeof req.body === 'string' ? req.body : '';
  if (!datos) {
    for await (const trozo of req) {
      datos += trozo;
      if (datos.length > 4096) break;
    }
  }
  return Object.fromEntries(new URLSearchParams(datos));
}

function responder(res, estado, datos) {
  res.statusCode = estado;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(datos));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { error: 'Método no permitido.' });

  // Solo se acepta desde la pantalla de acceso de esta misma web.
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origen = req.headers.origin;
  if (origen && new URL(origen).host !== host) return responder(res, 403, { error: 'Origen no permitido.' });

  const { PANEL_USUARIO, PANEL_CLAVE_HASH, PANEL_GITHUB_TOKEN } = process.env;
  if (!PANEL_USUARIO || !PANEL_CLAVE_HASH || !PANEL_GITHUB_TOKEN)
    return responder(res, 503, { error: 'El panel aún no está configurado en Vercel.' });

  const { usuario = '', clave = '' } = await leerFormulario(req);
  const okUsuario = igual(String(usuario).trim(), PANEL_USUARIO);
  const okClave = claveCorrecta(clave, PANEL_CLAVE_HASH);
  if (!(okUsuario && okClave)) {
    await esperar(2000); // frena a quien intente adivinar la contraseña
    return responder(res, 401, { error: 'Usuario o contraseña incorrectos.' });
  }
  return responder(res, 200, { token: PANEL_GITHUB_TOKEN });
}
