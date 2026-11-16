// Formulario de contacto: recibe el mensaje y lo envía por correo con Resend (https://resend.com).
// Variables en Vercel (Settings › Environment Variables), nunca en el código (el repositorio es público):
//   RESEND_API_KEY      clave de Resend
//   CONTACTO_DESTINO    correo donde recibes los mensajes
//   CONTACTO_REMITENTE  opcional; por defecto "Rumbo Mercante <onboarding@resend.dev>"
//                       (con dominio propio verificado en Resend: "Rumbo Mercante <web@tudominio.com>")

const LIMITES = { nombre: 100, email: 200, motivo: 80, cargo: 80, mensaje: 5000 };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const escapar = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function leerFormulario(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  let datos = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!datos) {
    for await (const trozo of req) {
      datos += trozo;
      if (datos.length > 20000) break;
    }
  }
  const tipo = String(req.headers['content-type'] || '');
  if (tipo.includes('application/json')) { try { return JSON.parse(datos); } catch { return {}; } }
  if (tipo.includes('multipart/form-data')) {
    const limite = tipo.split('boundary=')[1];
    const campos = {};
    if (limite) for (const parte of datos.split('--' + limite)) {
      const m = parte.match(/name="([^"]+)"\r?\n\r?\n([\s\S]*?)\r?\n$/);
      if (m) campos[m[1]] = m[2];
    }
    return campos;
  }
  return Object.fromEntries(new URLSearchParams(datos));
}

export default async function handler(req, res) {
  const quiereJson = String(req.headers.accept || '').includes('application/json');
  const responder = (estado, ok, mensaje) => {
    if (!quiereJson) { // sin JavaScript: vuelve a la página de contacto con el resultado
      res.statusCode = 303;
      res.setHeader('Location', `/contacto/?${ok ? 'enviado=1' : 'error=1'}#contact-form`);
      return res.end();
    }
    res.statusCode = estado;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(ok ? { ok: true } : { ok: false, error: mensaje }));
  };

  if (req.method !== 'POST') return responder(405, false, 'Método no permitido.');
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  if (req.headers.origin && new URL(req.headers.origin).host !== host) return responder(403, false, 'Origen no permitido.');

  const { RESEND_API_KEY, CONTACTO_DESTINO, CONTACTO_REMITENTE } = process.env;
  if (!RESEND_API_KEY || !CONTACTO_DESTINO) return responder(503, false, 'El formulario aún no está configurado.');

  const f = await leerFormulario(req);
  if (f._gotcha) return responder(200, true); // trampa para robots: se finge éxito y no se envía nada
  const v = {};
  for (const [k, max] of Object.entries(LIMITES)) v[k] = String(f[k] ?? '').trim().slice(0, max);
  if (!v.nombre || !v.mensaje || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) || !f.consentimiento) {
    await esperar(800);
    return responder(400, false, 'Revisa los campos obligatorios.');
  }

  const asunto = `[Rumbo Mercante] ${v.motivo || 'Mensaje'} — ${v.nombre}`.replace(/[\r\n]+/g, ' ');
  const texto = [`Nombre: ${v.nombre}`, `Correo: ${v.email}`, `Motivo: ${v.motivo || '-'}`, `Perfil: ${v.cargo || '-'}`, '', v.mensaje].join('\n');
  const html = `<p><strong>Nombre:</strong> ${escapar(v.nombre)}<br><strong>Correo:</strong> ${escapar(v.email)}<br>` +
    `<strong>Motivo:</strong> ${escapar(v.motivo || '-')}<br><strong>Perfil:</strong> ${escapar(v.cargo || '-')}</p>` +
    `<p style="white-space:pre-wrap">${escapar(v.mensaje)}</p><p style="color:#888;font-size:12px">Enviado desde el formulario de contacto de la web. Pulsa «Responder» para contestar a ${escapar(v.nombre)}.</p>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACTO_REMITENTE || 'Rumbo Mercante <onboarding@resend.dev>',
        to: [CONTACTO_DESTINO],
        reply_to: v.email,
        subject: asunto,
        text: texto,
        html,
      }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}`);
    return responder(200, true);
  } catch (e) {
    console.error('Error al enviar el formulario:', e.message);
    return responder(502, false, 'No se pudo enviar ahora mismo. Inténtalo de nuevo en unos minutos.');
  }
}
