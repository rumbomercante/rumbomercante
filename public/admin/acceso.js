// Acceso al panel con usuario y contraseña.
// Al entrar, /api/auth entrega el permiso de GitHub y se guarda donde Sveltia CMS lo busca
// al arrancar, así el panel se abre directamente sin pedir cuentas de GitHub.
(() => {
  const CLAVE_SESION = 'sveltia-cms.user';
  // Programa del panel: copia propia en versión fija. La huella hace que el navegador
  // lo rechace si alguien lo modifica. Al actualizar Sveltia hay que cambiar ambas líneas.
  const PANEL_JS = '/admin/sveltia-cms-0.266.0.js';
  const PANEL_HUELLA = 'sha384-MvIc9V6dpnf1+8gMj6610BmYWClYbpAyg810CA5ad7jCJmLlpGsOZTJOpOewp0wn';

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
    const s = document.createElement('script');
    s.src = PANEL_JS;
    s.integrity = PANEL_HUELLA;
    document.body.appendChild(s);
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
