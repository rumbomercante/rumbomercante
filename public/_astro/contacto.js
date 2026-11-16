// Formulario de contacto: validación amable y envío a /api/contacto.
// - Los errores se muestran después de tocar un campo (no mientras se escribe) y al intentar enviar.
// - Al fallar el envío por datos, el foco va al primer campo con error.
// - El botón se desactiva mientras se envía para no mandar el mensaje dos veces.
(() => {
  const form = document.querySelector('#contact-form');
  if (!form) return;
  form.noValidate = true; // con JavaScript se usan los avisos propios; sin él, los del navegador
  const estado = form.querySelector('.status');
  const boton = form.querySelector('button[type="submit"]');

  // Si se llega con ?motivo=publicidad (desde Anúnciate), se preselecciona el motivo.
  const params = new URLSearchParams(location.search);
  if (params.get('motivo') === 'publicidad') {
    const m = form.querySelector('#motivo');
    if (m) m.value = 'Publicidad / Anunciarse';
  }
  // Resultado cuando el formulario se envió sin JavaScript.
  if (params.get('enviado') === '1') { estado.textContent = '¡Mensaje enviado! Te responderé lo antes posible.'; estado.dataset.state = 'ok'; }
  if (params.get('error') === '1') { estado.textContent = 'No se pudo enviar. Revisa los campos e inténtalo de nuevo.'; estado.dataset.state = 'error'; }

  const MENSAJES = {
    nombre: 'Escribe tu nombre.',
    email: 'Escribe un correo válido, por ejemplo nombre@correo.com.',
    mensaje: 'Cuéntame en qué puedo ayudarte.',
    consentimiento: 'Marca la casilla para aceptar la política de privacidad.',
  };
  const campos = [...form.querySelectorAll('input:not([type="hidden"]):not(.hp), select, textarea')];

  const marcar = (c) => {
    c.setCustomValidity('');
    if (!c.checkValidity() && MENSAJES[c.name]) c.setCustomValidity(MENSAJES[c.name]);
    const invalido = !c.checkValidity();
    if (invalido) c.setAttribute('aria-invalid', 'true');
    else c.removeAttribute('aria-invalid');
    let aviso = form.querySelector(`#error-${c.name}`);
    if (invalido) {
      if (!aviso) {
        aviso = document.createElement('p');
        aviso.id = `error-${c.name}`;
        aviso.className = 'field-error';
        const caja = c.closest('.field');
        if (caja) caja.appendChild(aviso); // dentro de su campo, debajo (también en las filas de dos columnas)
        else (c.closest('label') || c).insertAdjacentElement('afterend', aviso);
        c.setAttribute('aria-describedby', aviso.id);
      }
      aviso.textContent = c.validationMessage;
    } else if (aviso) {
      aviso.remove();
      c.removeAttribute('aria-describedby');
    }
    return !invalido;
  };

  campos.forEach((c) => {
    c.addEventListener('blur', () => { if (c.dataset.tocado) marcar(c); });
    c.addEventListener('input', () => {
      c.dataset.tocado = '1';
      if (c.getAttribute('aria-invalid') === 'true') marcar(c); // al corregir, el error se quita enseguida
    });
    c.addEventListener('change', () => { c.dataset.tocado = '1'; if (c.type === 'checkbox') marcar(c); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const malos = campos.filter((c) => !marcar(c));
    if (malos.length) {
      malos[0].focus();
      estado.textContent = 'Revisa los campos marcados.';
      estado.dataset.state = 'error';
      return;
    }
    if (form.querySelector('.hp')?.value) return; // trampa para robots

    boton.disabled = true;
    estado.textContent = 'Enviando…';
    delete estado.dataset.state;
    try {
      const r = await fetch(form.action, { method: 'POST', body: new URLSearchParams(new FormData(form)), headers: { Accept: 'application/json' } });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok || !datos.ok) throw new Error(datos.error || 'No se pudo enviar.');
      form.reset();
      campos.forEach((c) => delete c.dataset.tocado);
      estado.textContent = '¡Mensaje enviado! Te responderé lo antes posible.';
      estado.dataset.state = 'ok';
    } catch (err) {
      estado.textContent = `${err.message} Si el problema continúa, inténtalo más tarde.`;
      estado.dataset.state = 'error';
    } finally {
      boton.disabled = false;
    }
  });
})();
