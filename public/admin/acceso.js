// Acceso al panel con usuario y contraseña.
// Al entrar, /api/auth entrega el permiso de GitHub y se guarda donde Sveltia CMS lo busca
// al arrancar, así el panel se abre directamente sin pedir cuentas de GitHub.
(() => {
  const CLAVE_SESION = 'sveltia-cms.user';
  // Programa del panel: copia propia en versión fija. La huella hace que el navegador
  // lo rechace si alguien lo modifica. Al actualizar Sveltia hay que cambiar ambas líneas.
  const PANEL_JS = '/admin/sveltia-cms-0.266.0.js';
  const PANEL_HUELLA = 'sha384-MvIc9V6dpnf1+8gMj6610BmYWClYbpAyg810CA5ad7jCJmLlpGsOZTJOpOewp0wn';

  // Diagnóstico: si las reglas de seguridad bloquean algo que el panel necesita, se muestra un aviso
  // (sin datos privados) para poder corregirlo. Se ignora la comprobación de versiones nuevas, bloqueada a propósito.
  const bloqueados = new Set();
  document.addEventListener('securitypolicyviolation', (e) => {
    const url = String(e.blockedURI || '');
    if (url.includes('@sveltia/cms/package.json')) return;
    bloqueados.add(`${e.effectiveDirective}: ${url.split('?')[0].slice(0, 90)}`);
    let caja = document.getElementById('aviso-bloqueo');
    if (!caja) {
      caja = document.createElement('div');
      caja.id = 'aviso-bloqueo';
      caja.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99999;max-width:520px;padding:10px 12px;border-radius:10px;background:#8a1f11;color:#fff;font:12px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35)';
      document.body.appendChild(caja);
    }
    caja.textContent = 'Bloqueado por seguridad (envía una captura): ' + [...bloqueados].join(' · ');
  });

  // Diagnóstico visible: si el panel tarda en cargar, muestra los errores internos (sin claves).
  const errores = [];
  const limpiar = (t) => String(t).replace(/(github_pat_|ghp_|gho_|ghu_)[A-Za-z0-9_]+/g, '[clave oculta]').slice(0, 220);
  const anotar = (t) => { if (errores.length < 12) errores.push(limpiar(t)); };
  window.addEventListener('error', (e) => anotar('Error: ' + (e.message || e.filename || '')));
  window.addEventListener('unhandledrejection', (e) => anotar('Error: ' + (e.reason?.message || e.reason)));
  const errorOriginal = console.error.bind(console);
  console.error = (...a) => { anotar(a.map((x) => x?.message || (typeof x === 'object' ? JSON.stringify(x) : x)).join(' ')); errorOriginal(...a); };
  const fetchOriginal = window.fetch.bind(window);
  const peticiones = { total: 0, github: 0, ultima: '' };
  window.fetch = async (...a) => {
    const url = String(a[0]?.url || a[0]).split('?')[0];
    peticiones.total++;
    if (/github/.test(url)) { peticiones.github++; peticiones.ultima = url.replace('https://api.github.com', ''); }
    try {
      const r = await fetchOriginal(...a);
      if (!r.ok && /github/.test(url)) anotar(`GitHub respondió ${r.status} en ${url.replace('https://api.github.com', '')}`);
      return r;
    } catch (err) {
      if (!url.includes('package.json')) anotar(`Sin conexión con ${url}: ${err.message}`);
      throw err;
    }
  };
  const mostrarDiagnostico = () => {
    if (!/Cargando|Loading/i.test(document.body.innerText)) return;
    const caja = document.createElement('div');
    caja.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99999;max-width:560px;max-height:60vh;overflow:auto;padding:12px 14px;border-radius:10px;background:#0b2640;color:#fff;font:12px/1.5 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);white-space:pre-wrap';
    caja.textContent = 'Diagnóstico del panel (haz una captura y envíala):\n' + (errores.length ? errores.map((e) => '• ' + e).join('\n') : '• Sin errores registrados todavía.') + '\nPeticiones: ' + peticiones.total + ' (a GitHub: ' + peticiones.github + ', última: ' + (peticiones.ultima || 'ninguna') + ')\nAlmacén del navegador: ' + (window.indexedDB ? 'disponible' : 'NO disponible') + '\nNavegador: ' + navigator.userAgent.slice(0, 120);
    document.body.appendChild(caja);
  };

  const acceso = document.getElementById('acceso');
  const form = document.getElementById('form-acceso');
  const error = document.getElementById('error');
  const boton = document.getElementById('entrar');

  const sesionGuardada = () => {
    try {
      const u = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
      return u && typeof u.token === 'string' && u.token ? u : null;
    } catch {
      return null;
    }
  };

  let iniciado = false;
  const abrirPanel = () => {
    if (iniciado) return;
    iniciado = true;
    acceso.classList.remove('visible');
    // Arranque manual: primero se registran los bloques del editor y después se inicia el panel.
    window.CMS_MANUAL_INIT = true;
    const s = document.createElement('script');
    s.src = PANEL_JS;
    s.integrity = PANEL_HUELLA;
    s.onload = () => {
      const b = document.createElement('script');
      b.src = '/admin/bloques.js';
      b.onload = b.onerror = () => window.CMS && window.CMS.init();
      document.body.appendChild(b);
    };
    document.body.appendChild(s);
    setTimeout(mostrarDiagnostico, 25000);
    // Al cerrar sesión en el panel se borra la sesión: se vuelve a la pantalla de acceso.
    setInterval(() => {
      if (!sesionGuardada()) location.reload();
    }, 1500);
  };

  const pedirAcceso = () => {
    localStorage.removeItem(CLAVE_SESION);
    acceso.classList.add('visible');
    document.getElementById('usuario').focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.classList.remove('visible');
    boton.disabled = true;
    boton.textContent = 'Entrando…';
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new URLSearchParams(new FormData(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error || 'No se pudo entrar. Inténtalo de nuevo.');
      form.reset();
      localStorage.setItem(CLAVE_SESION, JSON.stringify({ backendName: 'github', token: data.token }));
      abrirPanel();
    } catch (err) {
      error.textContent = err.message;
      error.classList.add('visible');
      boton.disabled = false;
      boton.textContent = 'Entrar';
    }
  });

  // Si ya hay una sesión válida, se abre el panel directamente.
  const u = sesionGuardada();
  if (!u) return pedirAcceso();
  fetch('https://api.github.com/user', { headers: { Authorization: `token ${u.token}` } })
    .then((r) => (r.ok ? abrirPanel() : pedirAcceso()))
    .catch(pedirAcceso);
})();
