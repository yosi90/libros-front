// Perfil, estadísticas, preferencias, cuenta y panel de avisos.
(function () {
  const P = window.P, { I, ib, cub, EST, app, hoja, enlaces } = window.K;
  const centro = (dentro, max = 760) => `<div class="c g24 pad" style="max-width:${max}px;margin-inline:auto;width:100%">${dentro}</div>`;

  // ---------- Perfil ----------
  const cifra = (n, t) => `<div class="c g0" style="align-items:center"><b class="dis pri num" style="font-size:19px">${n}</b><span class="mut s12">${t}</span></div>`;
  const mov = (k, t, a, e) => `<div class="fl suelta">${cub(k, '', 'p')}<div class="c g2 f1"><span class="b el">${t}</span><span class="mut s12 el">${a}</span></div><span role="img" aria-label="${EST[e][1]}" class="r pri">${I(EST[e][0], 'm')}</span>${I('der', 'm')}</div>`;
  const destino = (t, n) => `<div class="fl" style="min-height:52px;padding:8px 12px 8px 16px"><span class="b f1">${t}</span>${n ? `<span class="ins t">${n}</span>` : ''}${I('der', 'm')}</div>`;
  P['perfil'] = app({ nav: 'perfil', titulo: 'Perfil', cuerpo: centro(`
    <div class="heroe"><div class="r g12 f1"><button class="av xg" aria-label="Cambiar tu foto de perfil" style="box-shadow:none">Q<span style="position:absolute;right:-2px;bottom:-2px;width:28px;height:28px;border-radius:50%;background:var(--pr);color:var(--onp);display:grid;place-items:center">${I('lapiz', 's')}</span></button><div class="c g4 f1"><h2 class="tit el">QA Usuario A</h2><span class="mut">@lectora</span></div></div>
      <div class="r" style="justify-content:space-around;gap:16px">${cifra(23, 'Libros')}${cifra(1, 'En marcha')}${cifra(14, 'Leídos')}${cifra(4, 'Universos')}</div></div>
    <div class="c"><h3 class="h">Actividad reciente</h3><div class="rej">${mov(2, 'Elantris', 'Brandon Sanderson', 'marcha')}${mov(3, 'El imperio final', 'Brandon Sanderson', 'leido')}${mov(1, 'El aliento de los dioses', 'Brandon Sanderson', 'comprar')}${mov(6, 'Los jardines de la Luna', 'Steven Erikson', 'espera')}</div></div>
    <div class="lista">${destino('Perfil')}${destino('Mis peticiones', 2)}${destino('Mis reportes', 1)}</div>`) });

  const campos = pares => `<div style="display:grid;grid-template-columns:96px 1fr;gap:8px">${pares.map(p => `<span class="mut s12">${p[0]}</span><span>${p[1]}</span>`).join('')}</div>`;
  const estadoP = t => `<span class="chip" style="min-height:24px;padding:0 10px;font-size:12px">${t}</span>`;
  const cabDetalle = t => `<div class="r" style="margin:-8px 0 -12px -8px">${ib('volver', 'Volver al resumen del perfil')}<h2 class="tit f1">${t}</h2></div>`;
  P['peticiones'] = app({ nav: 'perfil', titulo: 'Perfil', cuerpo: centro(`${cabDetalle('Mis peticiones')}
    <div class="r" style="margin-bottom:-12px"><span class="mut s13 f1">2 registradas</span>${ib('recargar', 'Actualizar peticiones', 'su')}</div>
    <div class="rej"><article class="card c g12"><div class="r"><span class="b f1">Libro · Alta en catálogo</span>${estadoP('Devuelta')}</div>${campos([['Nombre', 'Trenza del mar Esmeralda'], ['ISBN', '9788418037818']])}
      <p><span class="mut">Respuesta:</span> Falta la fecha de publicación de esta edición.</p><div class="in alta" aria-label="Tu respuesta" style="min-height:72px"><span>Es de marzo de 2023.</span></div><button class="bt pri an">Reenviar</button></article>
    <article class="card c g12"><div class="r"><span class="b f1">Libro · Corrección</span>${estadoP('Pendiente')}</div>${campos([['Ficha', 'Elantris'], ['Idiomas', 'Español, Inglés, Catalán']])}</article></div>`) });
  P['reportes-vacio'] = `<div class="c g12">${cabDetalle('Mis reportes').replace('margin:-8px 0 -12px -8px', 'margin:0 0 0 -8px')}<div class="r">${'<span class="f1"></span>' + ib('recargar', 'Actualizar reportes', 'su')}</div><div class="vac" style="min-height:96px;padding:16px"><span class="s13">Sin reportes</span></div></div>`;
  P['perfil-tu'] = `<div class="c g12">${cabDetalle('Perfil').replace('margin:-8px 0 -12px -8px', 'margin:0 0 0 -8px')}<div class="card c g12"><div class="r g12"><span class="av g">Q</span><div class="c g2 f1"><span class="b">QA Usuario A</span><span class="mut s13">@lectora</span></div>${ib('lapiz', 'Editar tu perfil de Yosiftware', 'pr')}</div><button class="bt ton an">${I('yosi', 'm')}Ver tu perfil en la web social</button></div></div>`;

  // ---------- Estadísticas ----------
  const cif = (n, t) => `<div class="cif"><b>${n}</b><span>${t}</span></div>`;
  const fila = (t, n, pct) => `<div class="c g4"><div class="r"><span class="f1 s13">${t}</span><b class="s13 num">${n}</b></div><div class="barrap"><i style="width:${pct}%"></i></div></div>`;
  const panel = (t, dentro) => `<section class="panel"><h3>${t}</h3>${dentro}</section>`;
  P['estadisticas'] = app({ nav: 'estadisticas', titulo: 'Estadísticas', cuerpo: `<div class="c g16 pad">
    <div class="r"><div class="seg" role="tablist" style="min-width:240px"><span class="on" role="tab">Personal</span><span role="tab">General</span></div></div>
    <div class="rej4">${cif(14, 'Libros leídos')}${cif(9, 'No leídos')}${cif(2, 'Antologías')}${cif(38, 'Días compra-lectura')}</div>
    <div class="rej">
      ${panel('Estados de lectura', fila('En espera', '2 · 9%', 9) + fila('En marcha', '1 · 4%', 4) + fila('Leído', '14 · 61%', 61) + fila('Por comprar', '1 · 4%', 4) + fila('Quiero leer', '3 · 13%', 13) + fila('Descartado', '2 · 9%', 9))}
      ${panel('Lecturas más rápidas', fila('El imperio final', '6 días', 100) + fila('Elantris', '11 días', 55) + fila('Trenza del mar Esmeralda', '13 días', 46))}
      ${panel('Autores que más lees', fila('Brandon Sanderson', '9', 100) + fila('Steven Erikson', '3', 33) + fila('Ursula K. Le Guin', '2', 22))}
      ${panel('Más tiempo en espera', '<span class="mut s13">Sin datos suficientes.</span>')}
    </div>
    <label class="r g12"><span class="casilla"></span><span>Compartir mis lecturas, de forma anónima</span></label></div>` });
  P['estadisticas-general'] = `<div class="c g12"><div class="rej3">${cif(12, 'Nuevos en 24 horas')}${cif(57, 'Nuevos esta semana')}${cif(204, 'Nuevos este mes')}</div><section class="panel" style="border-style:dashed"><div class="r">${I('candado', 'm')}<h3 class="f1">Aún no hay datos suficientes</h3></div></section></div>`;

  // ---------- Preferencias ----------
  const pref = on => `<div class="tabs" role="tablist">${['Privacidad', 'Lectura y escritura', 'Permisos'].map(t => `<span class="tab${t === on ? ' on' : ''}" role="tab">${t}</span>`).join('')}</div>`;
  const inter = (t, on) => `<div class="r" style="min-height:56px"><span class="b f1">${t}</span><span class="sw${on ? ' on' : ''}" role="switch" aria-label="${t}"></span></div>`;
  const opcion = (t, d, on) => `<div class="r g12" style="min-height:48px"><span class="radio${on ? ' on' : ''}"></span><div class="c g2 f1"><span>${t}</span><span class="mut s12">${d}</span></div></div>`;
  const version = `<span class="mut s12" style="text-align:center;padding-top:16px">Libros 2.1.0</span>`;
  P['preferencias'] = app({ nav: 'preferencias', titulo: 'Preferencias', cuerpo: pref('Lectura y escritura') + centro(`<div class="c g4">${inter('Escena al abrir un libro', true)}${inter('Sonidos', true)}</div>
    <div class="c"><span class="b">Dictado por voz</span>${opcion('Del móvil', 'Gratis', false)}${opcion('Con tu clave de IA', 'Gasta de tu clave', true)}<div class="cp"><label>Modelo</label><div class="in"><span>gpt-4o-transcribe</span>${I('abajo', 'm')}</div></div></div>${version}`, 880) });
  P['pref-privacidad'] = `<div class="c g0" style="background:var(--cv)">${pref('Privacidad')}<div class="c g12 pad"><button class="bt lin an">${I('yosi', 'm')}Privacidad de todas tus webs</button><button class="bt lin an">Gratis, por ahora</button>${version}</div></div>`;
  P['pref-permisos'] = `<div class="c g0" style="background:var(--cv)">${pref('Permisos')}<div class="c g12 pad"><div class="r"><div class="c g2 f1"><span class="b">Notificaciones</span><span class="mut s13">Sin conceder</span></div><button class="bt pri">Activar</button></div>${version}</div></div>`;

  // ---------- Cuenta ----------
  const marca = `<header class="marca">${I('libro')}Memoria Bibliográfica</header>`;
  const conYosi = `<span class="r cen g8 mut">${I('yosi', 'm pri')}Con tu cuenta de Yosiftware</span>`;
  const campo = (e, v = '', c = '') => `<div class="cp"><label>${e}</label><div class="in ${c}"><span>${v}</span></div></div>`;
  const acceso = (titulo, dentro, extra = '') => `<div class="c g0" style="background:var(--cv)">${marca}<div class="c g16 pad" style="max-width:480px;margin-inline:auto;width:100%"><h2 class="tit" style="font-size:28px;padding-top:8px">${titulo}</h2>${extra}<div class="acc">${dentro}</div></div></div>`;
  const cuenta = (n, t, det) => `<div class="fl suelta"><span class="av p">${n}</span><div class="c g2 f1"><span class="b">${t}</span>${det ? `<span class="avi s13">${det}</span>` : ''}</div>${ib('cerrar', `Olvidar la cuenta ${t}`, 'su')}</div>`;
  P['entrar'] = acceso('Bienvenido de nuevo.', `${conYosi}
    <div class="aviso">${I('info')}<span>Tu sesión se ha cerrado desde otro dispositivo.</span></div>
    ${cuenta('C', 'club.qa')}${cuenta('A', 'antigua', 'Su sesión ha caducado: entra otra vez con ella.')}
    <button class="bt ton an" style="min-height:48px">${I('yosi', 'm')}Continuar como @lectora</button>
    <button class="bg"><b style="color:#4285f4;font-size:17px">G</b>Continuar con Google</button>
    <div class="r mut s13"><span class="sep f1"></span>o con tu correo<span class="sep f1"></span></div>
    ${campo('Correo electrónico')}${campo('Contraseña')}
    <button class="bt txt" style="align-self:flex-start;text-decoration:underline">He olvidado mi contraseña</button>
    <button class="bt pri an" style="min-height:48px">Iniciar sesión</button>
    <span class="r cen g4 mut s13 wrap">¿Aún no tienes cuenta?<b class="pri">Crea tu biblioteca</b></span>`,
    `<blockquote class="cita lec" style="border-color:var(--pr)">«Somos de la misma materia que los sueños.»<br><span class="pri s12 bb" style="font-family:var(--ui);letter-spacing:.06em">WILLIAM SHAKESPEARE</span></blockquote>`);
  P['cuenta-alta'] = acceso('Elige tu alias.', `${campo('Alias', 'lectora', 'foco')}<button class="bt pri an" style="min-height:48px">Crear mi cuenta</button><button class="bt lin an">Cancelar</button>`);
  P['cuenta-codigo'] = acceso('Escribe tu código.', `${campo('Código de 6 cifras', '', 'foco')}<button class="bt pri an" style="min-height:48px" disabled>Verificar</button><button class="bt txt">Usar un código de recuperación</button><button class="bt lin an">Cancelar</button>`);
  P['cuenta-paso'] = acceso('Confirma tu correo.', `<div class="aviso"><span role="img" aria-label="Se abre en el navegador" class="r">${I('fuera')}</span><span>Se abre en el navegador; luego vuelve aquí.</span></div><button class="bt pri an" style="min-height:48px">Abrir en el navegador</button><button class="bt lin an">Volver a entrar</button>`);
  P['cuenta-borrado'] = acceso('Tu cuenta se va a borrar.', `<div class="aviso wn">${I('calendario')}<span>Se borrará a partir del 4 de diciembre.</span></div><button class="bt pri an" style="min-height:48px">Conservar mi cuenta</button><button class="bt lin an">No entrar</button>`);
  P['cuenta-normas'] = acceso('Hay normas nuevas.', `<div><span class="chip" style="min-height:24px;padding:0 10px;font-size:12px">Normas · versión 4</span></div><div class="c g8" style="max-height:200px;overflow:hidden"><b>1. Para qué es Libros</b><p class="mut">Libros es una web y una app para llevar tus lecturas: lo que lees, lo que piensas de ello y con quién lo compartes.</p><b>2. Lo que publicas</b><p class="mut">Tus reseñas y tus publicaciones en los clubes son tuyas y se ven según tu privacidad…</p></div><button class="bt pri an" style="min-height:48px">Aceptar</button><button class="bt lin an">Salir</button>`);

  // ---------- Panel de cuentas ----------
  const accion = t => `<div class="fl" style="min-height:44px;padding:4px 16px"><span class="f1">${t}</span></div>`;
  const cuerpoB = (P['biblioteca'].match(/<main class="cont">([\s\S]*?)<\/main>/) || ['', ''])[1];
  const fondo = (nav, encima) => app({ nav, titulo: 'Mi biblioteca', cuerpo: cuerpoB, encima });
  P['cuentas'] = fondo('biblioteca', hoja(`
    <div class="r"><span style="width:44px"></span><span class="mut s13 f1 el" style="text-align:center">lectora@correo.es</span>${ib('cerrar', 'Cerrar')}</div>
    <div class="c g8" style="align-items:center"><span class="av g">L</span><b class="h" style="font-size:20px">lectora</b><button class="bt lin">${I('yosi', 'm')}Perfil y cuenta en Yosiftware</button></div>
    <div class="lista"><div class="fl"><span class="av p">C</span><span class="f1">club.qa</span></div>
      <div class="fl ini" style="align-items:flex-start"><span class="av p">A</span><div class="c g8 f1"><div class="c g2"><span>antigua</span><span class="avi s13">Su sesión ha caducado</span></div><div class="r"><button class="bt lin ch">Olvidar</button><button class="bt ton ch">Volver a entrar</button></div></div></div>
      ${accion('Añadir otra cuenta')}${accion('Cerrar sesión')}${accion('Cerrar sesión en todas las cuentas')}</div>
    ${enlaces.replace(/<div class="r g12"[^>]*>(?:(?!<\/div>).)*Perfil y cuenta en Yosiftware(?:(?!<\/div>).)*<\/div>/, '')}`));

  // ---------- Panel de avisos ----------
  const cabAvisos = sin => `<div class="r"><span class="chip${sin ? '' : ' on'}">Todas</span><span class="chip${sin ? ' on' : ''}">Sin leer · 2</span><span class="f1"></span>${ib('leido', 'Marcar todas como leídas', 'pr')}${ib('cerrar', 'Cerrar notificaciones')}</div>`;
  const notif = (n, t, d, h, nueva) => `<div class="notif${nueva ? ' nueva' : ''}"><span class="av p">${n}</span><div class="c g2 f1"><span class="b">${t}</span><span class="mut s13">${d}</span></div><span class="mut s12">${h}</span></div>`;
  const pieAvisos = `<div class="r der raya" style="padding-top:8px"><button class="bt txt">Preferencias</button><button class="bt txt">Ver todas</button></div>`;
  P['avisos'] = fondo('avisos', hoja(`${cabAvisos(false)}<div class="c g4">${notif('M', 'Marta R. te ha escrito', '¿Has llegado ya al capítulo 30?', '12:41', true)}${notif('C', 'Club de los viernes', 'Javi ha abierto la encuesta «Próxima lectura»', '10:02', true)}${notif('L', 'Tu petición está aceptada', 'Trenza del mar Esmeralda ya está en el catálogo', 'ayer')}${notif('L', 'Lectores del Cosmere', 'Nuevo hito: capítulo 20 antes del domingo', 'lun')}</div>${pieAvisos}`));
  P['avisos-vacio'] = `<div class="c g12" style="padding:12px 16px;background:var(--sf)">${cabAvisos(true).replace('Sin leer · 2', 'Sin leer')}<div class="vac" style="min-height:120px;padding:24px"><span class="s13">Nada sin leer</span></div>${pieAvisos}</div>`;
  P['avisos-cargando'] = `<div class="c g12" style="padding:12px 16px;background:var(--sf)">${cabAvisos(false).replace('Sin leer · 2', 'Sin leer')}<div class="vac" style="min-height:120px;padding:24px"><span class="rueda" role="img" aria-label="Cargando las notificaciones"></span></div></div>`;
})();
