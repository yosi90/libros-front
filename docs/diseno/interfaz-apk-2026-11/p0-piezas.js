// Piezas compartidas y ayudas para escribir las pantallas. Cada pantalla es un texto de marcado en window.P.
window.P = window.P || {};
window.K = (function () {
  const P = window.P;
  const I = (n, c = '') => `<i data-i="${n}"${c ? ` class="${c}"` : ''}></i>`;
  const ib = (n, nombre, c = '') => `<button class="ib ${c}" aria-label="${nombre}">${I(n)}</button>`;
  const cub = (k, t = '', c = '') => `<span class="cub k${k} ${c}"><b>${t}</b></span>`;
  // Los seis estados de lectura: su icono y su nombre accesible (decisión del propietario: solo el icono).
  const EST = { espera: ['reloj', 'En espera'], marcha: ['libro', 'En marcha'], leido: ['leido', 'Leído'], comprar: ['carro', 'Por comprar'], quiero: ['marcador', 'Quiero leer'], desc: ['vetado', 'Descartado'] };
  const est = k => `<span role="img" aria-label="${EST[k][1]}" class="r">${I(EST[k][0])}</span>`;

  const NAV = [['biblioteca', 'Biblioteca', 'biblio'], ['catalogo', 'Catálogo', 'catalogo'], ['comunidad', 'Comunidad', 'foro']];
  const nv = (nav, id, nombre, ico, extra = '') => `<button class="nv${nav === id ? ' on' : ''}" aria-label="${nombre}"><span class="pil ${extra}">${I(ico)}</span></button>`;

  /** El armazón: barra superior y navegación inferior en el móvil; rail en el plegable (sin barra). */
  function app({ nav = '', titulo = '', cuerpo = '', encima = '', acciones = '' }) {
    return `<div class="app">
      <nav class="rail no-c" aria-label="Navegación">
        <button class="nv" aria-label="Perfil, 1 mensaje sin leer"><span class="av">Q</span></button>
        ${NAV.map(d => nv(nav, d[0], d[1], d[2])).join('')}
        ${nv(nav, 'avisos', 'Notificaciones, 2 sin ver', 'campana', 'punto')}
        ${nv(nav, 'estadisticas', 'Estadísticas', 'barras')}
        ${nv(nav, 'mas', 'Más', 'puntos')}
        <span class="hueco"></span>
        ${nv(nav, 'preferencias', 'Preferencias', 'ajustes')}
      </nav>
      <div class="col">
        <header class="bar no-m"><h1>${titulo}</h1>${acciones}${ib('campana', 'Notificaciones, 2 sin ver', 'punto')}<button class="ib" aria-label="Abrir perfil, 1 mensaje sin leer"><span class="av">Q</span></button></header>
        <main class="cont">${cuerpo}</main>
        <nav class="nav no-m" aria-label="Navegación">${NAV.map(d => nv(nav, d[0], d[1], d[2])).join('')}${nv(nav, 'mas', 'Más', 'puntos')}</nav>
      </div>${encima}</div>`;
  }

  /** El libro abierto («Cuaderno»): su barra, la del destino y los cuatro destinos abajo, con palabras. */
  function libro({ dest = 'Capítulos', sub = '', cuerpo = '', encima = '' }) {
    return `<div class="app"><div class="col">
      <header class="lbar">${ib('volver', 'Volver a la biblioteca')}${cub(3, '', 'mini')}<b style="margin-left:8px">El imperio final</b>${ib('buscar', 'Buscar en el libro')}<button class="ib" aria-label="Abrir perfil"><span class="av p">Q</span></button></header>
      ${sub}
      <main class="cont papel">${cuerpo}</main>
      <nav class="ldest" aria-label="Destinos del libro">${['Capítulos', 'Elementos', 'Notas', 'Resumen'].map(d => `<span${d === dest ? ' class="on"' : ''}>${d}</span>`).join('')}</nav>
    </div>${encima}</div>`;
  }
  const subCap = `<div class="sub">${ib('indice', 'Abrir el índice', 'ch')}<span class="f1">Capítulo 3 de 12</span>${ib('izq', 'Capítulo anterior', 'su')}${ib('der', 'Capítulo siguiente', 'su')}</div>`;

  const hoja = (dentro, c = '') => `<div class="velo"></div><section class="hoja ${c}"><span class="asa"></span>${dentro}</section>`;

  const obra = (k, ct, au, ti, es, pr = 0, fin = 'puntos') => `<article class="obra">${cub(k, ct)}<div class="obra__cu"><span class="obra__au el">${au}</span><span class="obra__ti">${ti}</span>${es ? `<span class="obra__es" role="img" aria-label="${EST[es][1]}">${I(EST[es][0])}</span>` : ''}</div>${fin === 'puntos' ? ib('puntos', `Estado y puntuación de ${ti}`, 'su') : `<span class="ib su">${I('der')}</span>`}${pr ? `<span class="prog"><i style="width:${pr}%"></i></span>` : ''}</article>`;

  const enlaces = `<div class="c g0">${['Perfil y cuenta en Yosiftware', 'Tus logros', 'Sesiones', 'Privacidad', 'Errores y propuestas'].map(t => `<div class="r g12" style="min-height:48px;padding:0 8px">${I('yosi', 'pri m')}<span class="b f1">${t}</span><span role="img" aria-label="Se abre en el navegador" class="r mut">${I('fuera', 's')}</span></div>`).join('')}</div>`;
  const tema = `<span class="tema" role="switch" aria-label="Usar tema oscuro"><span class="on">${I('sol')}</span><span>${I('luna')}</span></span>`;

  // ---------- Hoja «Más» ----------
  const fondoMas = (encima) => app({ nav: 'mas', titulo: 'Mi biblioteca', cuerpo: '', encima });
  const cabMas = `<div class="r g12"><span class="av g">Q</span><b class="h f1 el">QA Usuario A</b>${ib('cerrar', 'Cerrar')}</div><div class="sep"></div>`;
  const tile = (ico, nombre, on = false, n = 0) => `<button class="ib caja f1${on ? ' ton' : ''}" style="width:auto;height:56px" aria-label="${nombre}${n ? `, ${n} sin leer` : ''}">${I(ico)}${n ? `<span class="ins" style="position:absolute;top:6px;right:8px">${n}</span>` : ''}</button>`;
  const pieMas = `${enlaces}<div class="sep"></div><div class="r der">${tema}</div>`;
  P['mas-a'] = fondoMas(hoja(`${cabMas}<div class="r g8">${tile('persona', 'Perfil')}${tile('carnet', 'Cuenta')}${tile('ajustes', 'Preferencias')}${tile('barras', 'Estadísticas')}${tile('chat', 'Mensajes', false, 1)}</div>${pieMas}`));
  const pal = (t, n = 0) => `<button class="fl suelta b" style="min-height:52px">${t}${n ? `<span class="ins fin">${n}</span>` : ''}</button>`;
  P['mas-b'] = fondoMas(hoja(`${cabMas}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${pal('Perfil')}${pal('Cuenta')}${pal('Preferencias')}${pal('Estadísticas')}${pal('Mensajes', 1)}</div>${pieMas}`));

  // ---------- Estados (se dibujan una vez) ----------
  P['estados'] = `<div class="c g0">
    <div class="vac" style="min-height:190px">${I('biblio', 'l')}<button class="bt pri">Abrir catálogo</button></div>
    <div class="sep"></div>
    <div class="vac" style="min-height:170px"><b>No encontramos coincidencias</b><button class="bt lin">Limpiar filtros</button></div>
    <div class="sep"></div>
    <div class="vac" style="min-height:96px;padding:24px"><span class="s13">Sin notificaciones</span></div>
    <div class="sep"></div>
    <div class="vac" style="min-height:120px"><span class="rueda" role="img" aria-label="Cargando tu biblioteca"></span></div>
    <div class="sep"></div>
    <div class="vac mal" style="min-height:200px">${I('nube-no', 'l')}<span class="s13" style="color:var(--ink)">No pudimos cargar el resumen</span><button class="bt lin">Reintentar</button></div>
  </div>`;

  // ---------- Chips, botones y campos (se dibujan una vez) ----------
  P['controles'] = `<div class="c g16">
    <div class="r wrap"><button class="bt pri">Guardar</button><button class="bt ton">Actualizar lectura</button><button class="bt lin">Volver</button><button class="bt txt">Cargar más</button><button class="bt pel">Denunciar</button></div>
    <div class="r wrap">${ib('mas', 'Nuevo personaje', 'lle')}${ib('ajustar', 'Filtros', 'caja')}${ib('recargar', 'Actualizar')}${ib('puntos', 'Más opciones', 'su')}<span class="r g6"><span class="ins">3</span><span class="ins t">12</span></span></div>
    <div class="r wrap"><span class="chip on">Todos</span><span class="chip">Comprados</span><span class="chip">Por comprar</span></div>
    <div class="r wrap"><span class="chip ico on" role="img" aria-label="En marcha, 1">${I('libro')}1</span><span class="chip ico" role="img" aria-label="En espera, 2">${I('reloj')}2</span><span class="chip ico" role="img" aria-label="Leído, 14">${I('leido')}14</span><span class="chip" aria-label="Saga: Nacidos de la bruma">${I('sagas', 's')}Nacidos de la bruma</span></div>
    <div class="tabs" style="padding:0;border:0"><span class="tab on">Resumen</span><span class="tab">Actividad</span><span class="tab">Clubes</span><span class="tab">${I('yosi')}Personas</span></div>
    <div class="seg"><span class="on">Universos</span><span>Estados</span></div>
    <div class="busca" role="search" aria-label="Buscar en tus notas">${I('buscar', 'm')}<span></span></div>
    <div class="r"><span class="b f1">Sonidos</span><span class="sw on" role="switch" aria-label="Sonidos"></span></div>
  </div>`;

  return { I, ib, cub, EST, est, app, libro, subCap, hoja, obra, enlaces, tema };
})();
