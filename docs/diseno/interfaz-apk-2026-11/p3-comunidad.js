// Comunidad: resumen, actividad, clubes, un club, mensajes y el panel de un grupo.
(function () {
  const P = window.P, { I, ib, app, buscaEnviar } = window.K;

  // v: 'A' las secciones con palabras, arriba · 'B' con iconos (fila en el móvil, segundo rail en el plegable).
  const SECS = [['Resumen', 'tablero'], ['Actividad', 'feed'], ['Clubes', 'grupo'], ['Mensajes', 'foro'], ['Personas', 'grupo', 1], ['Amistades', 'personas', 1], ['Bloqueos', 'vetado', 1]];
  function com({ sec, cuerpo, v = 'A', encima = '' }) {
    const tabs = `<div class="tabs" role="tablist">${SECS.map(s => `<span class="tab${s[0] === sec ? ' on' : ''}" role="tab"${s[2] ? ` aria-label="${s[0]}, en la web social"` : ''}>${s[2] ? I('yosi') : ''}${s[0]}${s[0] === 'Mensajes' ? '<span class="ins">1</span>' : ''}</span>`).join('')}</div>`;
    const ics = SECS.map(s => `<button class="sec${s[0] === sec ? ' on' : ''}" role="tab" aria-label="${s[0]}${s[2] ? ', en la web social' : ''}${s[0] === 'Mensajes' ? ', 1 sin leer' : ''}">${I(s[1])}${s[0] === 'Mensajes' ? '<span class="ins">1</span>' : ''}${s[2] ? `<span class="yo">${I('yosi')}</span>` : ''}</button>`).join('');
    const dentro = v === 'A' ? tabs + cuerpo : `<div class="r g0 f1" style="align-items:stretch;min-height:0"><div class="rail2 no-c">${ics}</div><div class="c g0 f1"><div class="secs no-m">${ics}</div>${cuerpo}</div></div>`;
    return app({ nav: 'comunidad', titulo: 'Comunidad', cuerpo: dentro, encima });
  }

  // ---------- Resumen ----------
  const tarjeta = (n, t, social) => `<div class="fl suelta" style="min-height:68px"><div class="c g2 f1"><b class="dis num" style="font-size:22px;line-height:1.1">${n}</b><span class="mut s13 r g4">${social ? I('yosi', 's') : ''}${t}</span></div>${social ? `<span role="img" aria-label="Se abre en el navegador" class="r mut">${I('fuera', 'm')}</span>` : I('der', 'm')}</div>`;
  const resumen = `<div class="c g12 pad"><div class="r der" style="margin:-8px 0">${ib('recargar', 'Actualizar resumen', 'su')}</div>
    <div class="rej">${tarjeta(3, 'Clubes')}${tarjeta(1, 'Invitaciones a clubes')}${tarjeta(2, 'Mensajes sin leer')}${tarjeta(12, 'Amistades', 1)}${tarjeta(1, 'Solicitudes de amistad', 1)}${tarjeta(8, 'Personas que sigues', 1)}</div></div>`;
  P['comunidad'] = com({ sec: 'Resumen', cuerpo: resumen });
  P['dcom-a'] = P['comunidad'];
  P['dcom-b'] = com({ sec: 'Resumen', cuerpo: resumen, v: 'B' });
  P['resumen-parcial'] = `<div class="aviso">Parte del resumen no está disponible.</div>`;

  // ---------- Actividad ----------
  const nov = (n, quien, que, libro, hace) => `<article class="fl suelta ini" style="align-items:flex-start;padding:12px"><span class="av p">${n}</span><div class="c g2 f1"><span><b>${quien}</b> ${que} <span class="lec it">${libro}</span></span><span class="mut s12">${hace}</span></div></article>`;
  const cabAct = `<div class="r" style="margin:-8px 0"><button class="bt txt f1" style="justify-content:flex-start;padding:0">${I('yosi', 'm')}Qué compartes</button>${ib('recargar', 'Actualizar actividad', 'su')}</div>`;
  P['actividad'] = com({ sec: 'Actividad', cuerpo: `<div class="c g12 pad">${cabAct}<div class="rej">${nov('M', 'Marta R.', 'ha terminado', 'El imperio final', 'hace 2 horas')}${nov('J', 'Javi', 'ha puntuado con 4 estrellas', 'Elantris', 'ayer')}${nov('L', 'Lucía', 'ha empezado', 'El camino de los reyes', 'ayer')}${nov('M', 'Marta R.', 'quiere leer', 'Trenza del mar Esmeralda', 'el lunes')}</div></div>` });
  P['actividad-vacia'] = `<div class="c g12">${cabAct}<div class="vac" style="min-height:120px;padding:24px"><span class="s13">Aún no hay actividad</span></div></div>`;

  // ---------- Clubes ----------
  const sub = (on, n = 2) => `<div class="tira" role="tablist">${['Descubrir', 'Mis clubes', 'Eventos', 'Acceso'].map(t => `<span class="chip${t === on ? ' on' : ''}" role="tab">${t}${t === 'Acceso' ? `<span class="ins${t === on ? '' : ' t'}">${n}</span>` : ''}</span>`).join('')}</div>`;
  const club = (t, d) => `<div class="fl suelta"><div class="c g2 f1"><span class="b el">${t}</span><span class="mut s13 el">${d}</span></div>${I('der', 'm')}</div>`;
  P['clubes'] = com({ sec: 'Clubes', cuerpo: `<div class="c g12 pad">${sub('Descubrir')}
    <div class="r">${buscaEnviar('A', 'Buscar un club', '', '')}<button class="bt ton">Crear club</button></div>
    <div class="c"><span class="rot">Populares</span><div class="rej">${club('Lectores del Cosmere', '42 miembros · 18 actividades')}${club('Club de los viernes', '17 miembros · 9 actividades')}</div></div>
    <div class="c"><span class="rot">Todos</span><div class="rej">${club('Fantasía sin prisa', '8 miembros · Disponible')}${club('Malazanos anónimos', '23 miembros · Solicitud enviada')}${club('Ciencia ficción clásica', '31 miembros · Miembro')}${club('Novela negra', '12 miembros · Disponible')}</div></div>
    <button class="bt lin" style="align-self:center">Cargar más clubes</button></div>` });
  P['clubes-mios'] = `<div class="c g12">${sub('Mis clubes')}${club('Lectores del Cosmere', 'Propietario')}${club('Ciencia ficción clásica', 'Miembro · privado')}</div>`;
  P['clubes-eventos'] = `<div class="c g12">${sub('Eventos')}${club('Debate del final de El imperio final', 'Lectores del Cosmere · sáb 29 nov, 18:00')}<div class="sep"></div><div class="vac" style="min-height:72px;padding:16px"><span class="s13">Sin eventos</span></div></div>`;
  const acceso = (clubN, quien, msj, fechas, enviada) => `<article class="card c"><div class="r"><div class="c g2 f1"><span class="pri bb el">${clubN}</span><span class="b s13 el">${quien}</span></div><span class="chip" style="min-height:24px;padding:0 8px;font-size:11px">Pendiente</span></div>${msj ? `<p>${msj}</p>` : ''}<span class="mut s13">${fechas}</span><div class="r der">${enviada ? '<button class="bt lin">Retirar</button>' : '<button class="bt pri">Aceptar</button><button class="bt lin">Rechazar</button>'}</div></article>`;
  P['acceso'] = com({ sec: 'Clubes', cuerpo: `<div class="c g12 pad">${sub('Acceso')}
    <div class="seg" role="tablist"><span class="on">Invitaciones <span class="ins" style="margin-left:6px">1</span></span><span>Solicitudes <span class="ins t" style="margin-left:6px">1</span></span></div>
    <div class="r"><span class="chip on">Recibidas</span><span class="chip">Enviadas</span><span class="f1"></span>${ib('recargar', 'Volver a cargar', 'su')}</div>
    <div class="rej">${acceso('Club de los viernes', 'Te invita Javi', '¿Te vienes? Empezamos Dune en diciembre.', 'Enviada el 24 nov. · Caduca el 8 dic.')}${acceso('Novela negra', 'Te invita Lucía', '', 'Enviada el 20 nov. · Caduca el 4 dic. · exige la verificación en dos pasos')}</div></div>` });

  // ---------- Un club ----------
  const plg = (t, ab) => `<div class="plg${ab ? ' ab' : ''}"${ab ? ' style="grid-column:1/-1"' : ''}><h3 class="h f1" style="font-weight:600">${t}</h3><span role="img" aria-label="${ab ? 'Plegar' : 'Desplegar'}" class="r mut">${I(ab ? 'arriba' : 'abajo')}</span></div>`;
  const filaE = (t, n) => `<div class="c g4"><div class="r"><span class="f1 s13">${t}</span><b class="s13 num">${n}</b></div><div class="barrap"><i style="width:${n * 12}%"></i></div></div>`;
  P['club'] = com({ sec: 'Clubes', cuerpo: `<div class="c g12 pad">
    <div class="card g c g12"><div class="r ini">${ib('volver', 'Volver a los clubes', 'ch')}<div class="c g6 f1"><h2 class="tit">Lectores del Cosmere</h2><div><span class="chip" style="min-height:24px;padding:0 10px;font-size:12px">Abierto</span></div></div></div>
      <p class="mut">Leemos a Sanderson en orden de publicación, un libro cada dos meses, y lo comentamos el último sábado.</p>
      <div class="r der wrap"><button class="bt pri">Abrir chat</button><button class="bt pel">Denunciar</button></div></div>
    <div class="r est"><div class="cif ton f1"><b>42</b><span>Miembros</span></div><div class="cif ton f1"><b>128</b><span>Publicaciones</span></div></div>
    <div class="card c g12"><h3 class="b s15">Autores más leídos</h3>${filaE('Brandon Sanderson', 7)}${filaE('Robin Hobb', 3)}${filaE('Ursula K. Le Guin', 2)}</div>
    <div class="rej">${plg('Lecturas', true)}<div class="plgc" style="grid-column:1/-1"><div class="fl gris"><div class="c g2 f1"><span class="b">El pozo de la ascensión</span><span class="mut s13">Lectura actual · hasta el 31 de diciembre</span></div></div><div class="fl gris"><div class="c g2 f1"><span class="b">El imperio final</span><span class="mut s13">Terminada el 26 de octubre</span></div></div></div>
      ${plg('Mi progreso')}${plg('Hitos')}${plg('Calendario')}${plg('Chat')}${plg('Publicaciones')}${plg('Debates')}${plg('Encuestas')}${plg('Miembros')}</div></div>` });
  P['club-solicitar'] = `<div class="c g16" style="padding:20px;background:var(--sf)"><div class="r"><h2 class="tit f1">Solicitar acceso</h2>${ib('cerrar', 'Cerrar')}</div><div class="cp"><label>Mensaje opcional</label><div class="in alta"><span></span></div></div><div class="r der"><button class="bt lin">Cancelar</button><button class="bt pri">Enviar solicitud</button></div></div>`;
  P['club-solicitada'] = `<div class="card g c g12"><div class="c g6"><h2 class="tit">Malazanos anónimos</h2><div><span class="chip" style="min-height:24px;padding:0 10px;font-size:12px">Cerrado</span></div></div><div class="r"><span class="pri b f1" style="text-align:center">Solicitud enviada</span><button class="bt lin f1">Retirar solicitud</button></div></div>`;
  P['club-eliminado'] = `<div class="card c g12">${I('caja', 'l')}<h2 class="tit">Lectores del Cosmere está eliminado</h2><p class="mut">Se conservan el histórico y los miembros; el acceso y el chat siguen revocados.</p><div><button class="bt pri">Restaurar club</button></div></div>`;

  // ---------- Mensajes ----------
  const conv = (n, t, ult, h, sin) => `<div class="fl suelta"><span class="av p">${n}</span><div class="c g2 f1"><span class="b el">${t}</span><span class="mut s13 el">${ult}</span></div><div class="c g4" style="align-items:flex-end"><span class="mut s12">${h}</span>${sin ? `<span class="ins">${sin}</span>` : ''}</div></div>`;
  const filtros = `<div class="tira">${['Todas', 'Directos', 'Grupos', 'Clubes'].map((t, i) => `<span class="chip${i ? '' : ' on'}">${t}</span>`).join('')}</div>`;
  const nuevos = `<div class="r"><button class="bt pri f1">Nuevo chat</button><button class="bt ton f1">Nuevo grupo</button></div>`;
  P['mensajes'] = com({ sec: 'Mensajes', cuerpo: `<div class="c g12 pad">${filtros}${nuevos}<div class="rej">${conv('M', 'Marta R.', '¿Has llegado ya al capítulo 30?', '12:41', 1)}${conv('C', 'Club de los viernes', 'Javi: yo voto por Dune', 'ayer')}${conv('L', 'Lectores del Cosmere', 'Lucía: sin spoilers, por favor', 'lun')}${conv('J', 'Javi', 'Te lo presto el sábado', '21 nov')}</div></div>` });
  const amiga = (n, t) => `<div class="fl" style="padding:8px 0"><span class="av p">${n}</span><span class="b f1">${t}</span></div>`;
  P['mensajes-creador'] = `<div class="c g12">${nuevos}<div class="card" style="position:relative;padding:8px 16px"><span style="position:absolute;top:6px;right:6px">${ib('cerrar', 'Cerrar')}</span>${amiga('M', 'Marta R.')}${amiga('J', 'Javi')}${amiga('L', 'Lucía')}</div></div>`;
  P['mensajes-vacio'] = `<div class="c g12">${filtros.replace('chip on', 'chip').replace('"chip">Grupos', '"chip on">Grupos')}<div class="vac" style="min-height:96px;padding:24px"><span class="s13">Sin conversaciones</span></div></div>`;

  // ---------- Conversación y panel del grupo (duda 4) ----------
  const barraConv = (gestion) => `<div class="sub" style="padding-left:4px">${ib('volver', 'Volver a los mensajes')}<span class="av p">C</span><span class="f1 el" style="margin-left:8px">Club de los viernes</span>${ib(gestion ? 'cerrar' : 'ajustes', 'Gestionar grupo')}${ib('buscar', 'Buscar mensajes')}</div>`;
  const parte = (n, t, rol, yo) => `<div class="fl suelta"><span class="av p">${n}</span><div class="c g2 f1"><span class="b el">${t}</span><span class="mut s13">${rol}</span></div>${yo ? '' : ib('escudo', rol === 'Administrador' ? 'Hacer miembro' : 'Hacer administrador', 'su') + ib('persona-menos', 'Retirar participante', 'rojo')}</div>`;
  const cand = (n, t) => `<div class="fl suelta"><span class="av p">${n}</span><span class="b f1 el">${t}</span>${ib('persona-mas', `Añadir a ${t} al grupo`, 'pr')}</div>`;
  const nombreG = `<div class="r ini" style="align-items:flex-end"><div class="cp f1"><label>Nombre del grupo</label><div class="in"><span>Club de los viernes</span></div></div><button class="bt lin" style="min-height:48px">Guardar nombre</button></div>`;
  const partes = `<div class="rej">${parte('Q', 'QA Usuario A', 'Administrador', true)}${parte('J', 'Javi', 'Administrador')}${parte('M', 'Marta R.', 'Miembro')}${parte('L', 'Lucía', 'Miembro')}</div>`;
  const panelA = `<div class="c g12 pad"><div class="r"><span class="b s15">Participantes</span><span class="mut num f1">4 / 50</span><button class="bt pel ch">Salir</button></div>${nombreG}${partes}
    <span class="b s15" style="margin-top:8px">Añadir amistades</span><div class="rej">${cand('P', 'Pablo')}${cand('N', 'Nuria T.')}</div></div>`;
  const panelB = `<div class="c g12 pad"><div class="r"><button class="bt ton ch">Añadir amistades</button><span class="mut num f1">4 / 50</span><button class="bt pel ch">Salir</button></div>${nombreG}${partes}</div>`;
  P['grupo'] = com({ sec: 'Mensajes', cuerpo: barraConv(true) + panelA });
  P['d4-a'] = P['grupo'];
  P['d4-b'] = com({ sec: 'Mensajes', cuerpo: barraConv(true) + panelB });
  P['conv-busqueda'] = `<div class="c g0" style="background:var(--cv)">${barraConv(false)}<div class="r rayab" style="padding:6px 12px;background:var(--sf)">${buscaEnviar('A', 'Buscar mensajes', '', '', ib('cerrar', 'Cerrar los resultados', 'su ch'))}</div>
    <div class="c pad"><span class="burb">¿Quedamos el viernes para comentar Dune?</span><span class="burb yo">Yo puedo a partir de las siete</span></div>
    <div class="aviso" style="border-radius:0;justify-content:center">Esta conversación es de solo lectura.</div></div>`;
})();
