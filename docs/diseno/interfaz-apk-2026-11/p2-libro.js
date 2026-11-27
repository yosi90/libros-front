// El libro («Cuaderno»): índice, capítulo, notas, búsqueda, título y elementos. Y las opciones del «+» y de los buscadores.
(function () {
  const P = window.P, { I, ib, cub, libro, subCap, hoja } = window.K;

  // v: 'A' solo el + · 'B' solo la palabra · 'C' como está hoy (el + y la palabra).
  const MAS = {
    capitulo: { A: ib('mas', 'Nuevo capítulo', 'ton'), B: '<button class="bt ton ch">Nuevo capítulo</button>', C: `<button class="bt ton ch">${I('mas', 's')}Capítulo</button>` },
    escena: { A: ib('mas', 'Nueva escena', 'ton'), B: '<button class="bt txt">Nueva escena</button>', C: `<button class="bt txt">${I('mas', 'm')}Escena</button>` },
    nota: { A: ib('mas', 'Nota nueva', 'pr'), B: '<button class="bt txt ch">Nota nueva</button>', C: `<button class="bt txt ch">${I('mas', 's')}Nota nueva</button>` },
    nuevo: { A: ib('mas', 'Nuevo personaje', 'lle'), B: '<button class="bt pri ch">Nuevo</button>', C: `<button class="bt pri ch">${I('mas', 's')}Nuevo</button>` },
  };
  // b: 'A' la lupa sola · 'B' el texto solo · 'C' la lupa y qué se busca.
  const busca = (b, nombre, verbo, que, c = '') => `<div class="busca ${c}" role="search" aria-label="${nombre}">${b === 'B' ? '' : I('buscar', 'm')}<span>${b === 'B' ? verbo : b === 'C' ? que : ''}</span></div>`;
  const buscaEnviar = (b, nombre, verbo, que, cerrar = '') => `<div class="busca f1" role="search" aria-label="${nombre}" style="padding-right:2px">${b === 'C' ? I('buscar', 'm') : ''}<span>${b === 'B' ? verbo : b === 'C' ? que : ''}</span>${cerrar}${ib(b === 'A' ? 'buscar' : 'flecha', 'Buscar', 'pr ch')}</div>`;

  // ---------- Capítulo ----------
  const escena = (n, t, txt, lugar, rep) => `<span class="nu">${n}</span><div><h3>${t}</h3><p>${txt}</p><div class="apo"><span class="lug">${I('lugar')}${lugar}</span>${rep}${ib('mas', `Añadir personajes a la escena ${n}`, 'su ch')}</div></div>`;
  const capitulo = v => `<div class="cua">
    <span class="nu" style="font-size:22px;line-height:32px">3</span><div class="r" style="padding-bottom:8px"><div class="c g2 f1"><h2 class="lec" style="font:600 22px/1.3 var(--lec)">La ladrona</h2><span class="mut s13 num">págs. 45–71</span></div>${ib('lapiz', 'Editar los datos del capítulo', 'su')}</div>
    ${escena(1, 'El trabajo de Camon', 'Vin se apretó contra la pared del cubil y dejó que su Suerte se extendiera, apenas un roce, hacia el obligador.', 'Luthadel', '<span>Vin</span><span>Camon</span><span class="it">@ Reen</span>')}
    ${escena(2, 'El hombre de las cicatrices', 'Kelsier sonrió. Era lo último que esperaba ver Vin en la cara de un hombre que acababa de matar a seis.', 'El cubil', '<span>Vin</span><span>Kelsier</span><span>Dockson</span>')}
    <span class="nu sua" style="line-height:44px">3</span><div class="r" style="min-height:44px">${MAS.escena[v]}</div>
  </div>`;
  P['capitulo'] = libro({ sub: subCap, cuerpo: capitulo('A') });

  // ---------- Índice ----------
  const ind = (n, t, p, on) => `<div class="ind${on ? ' on' : ''}"><i>${n}</i><b>${t}</b><span>${p}</span></div>`;
  const indice = v => `<div class="r">${MAS.capitulo[v]}<span class="f1"></span>${ib('puntos', 'Nueva parte o nuevo interludio', 'su')}</div>`;
  const lista = `<div class="c g0">${ind(5, 'Ceniza sobre la plaza', 96)}${ind(4, 'La casa Renoux', 72)}<span class="egru" style="padding-left:8px">Primera parte · El superviviente de Hathsin</span>${ind(3, 'La ladrona', 45, true)}${ind(2, 'El plan', 21)}${ind(1, 'Prólogo', 9)}</div>`;
  P['indice'] = libro({ sub: subCap, cuerpo: capitulo('A'), encima: `<div class="velo" style="inset:104px 0 56px"></div><aside class="indice" aria-label="Índice del libro">${indice('A')}${lista}</aside>` });
  P['indice-vacio'] = `<div class="c" style="padding:12px;background:var(--sf)">${indice('A')}<div class="vac" style="min-height:120px;padding:24px"><span class="s13">Sin capítulos</span></div></div>`;
  P['sin-empezar'] = `<div class="vac" style="min-height:300px;background:var(--sf)">${cub(3, 'El imperio final', 'g')}<button class="bt pri">Poner en marcha</button></div>`;
  P['isla'] = `<div style="height:76px;position:relative"><div class="isla" style="bottom:10px">${cub(3, '', 'mini')}<b class="lec f1 el" style="margin-left:4px">El imperio final</b>${ib('cerrar', 'Cerrar el libro', 'su ch')}</div></div>`;
  const campo = (e, v, c = '') => `<div class="cp f1"><label>${e}</label><div class="in ${c}"><span>${v}</span></div></div>`;
  P['estructura'] = `<div class="c g16" style="padding:20px;background:var(--sf)"><div class="r"><h2 class="tit f1">Nueva parte</h2>${ib('cerrar', 'Cerrar')}</div>${campo('Nombre', 'El superviviente de Hathsin')}<div class="r g12 ini">${campo('Desde el capítulo', '1 · Prólogo')}${campo('Hasta', '3 · La ladrona')}</div>${campo('Página', '9')}<div class="r der"><button class="bt lin">Cancelar</button><button class="bt pri">Crear</button></div></div>`;

  // ---------- Notas ----------
  const nota = (t, txt, f) => `<article class="c g4 raya" style="padding:14px 0"><div class="r"><h3 class="f1 lec" style="font:600 17px/1.3 var(--lec)">${t}</h3>${ib('puntos', `Opciones de la nota ${t}`, 'su ch')}</div><p class="lec" style="font:400 15px/1.55 var(--lec)">${txt}</p><span class="mut s12">${f}</span></article>`;
  const notas = (v, b) => `<div class="c g0 pad" style="max-width:736px;margin-inline:auto;width:100%">
    <div class="compo foco" aria-label="Editar la nota"><b class="lec" style="font:600 17px/1.3 var(--lec)">El undécimo metal</b><p class="lec" style="font:400 15px/1.55 var(--lec)">Kelsier lo saca de la nada y nadie pregunta de dónde. Apuntar quién se lo dio.</p><div class="r der" style="min-height:44px"><span class="r g4 mut s13">${I('nube-ok', 's')}Guardado</span>${MAS.nota[v]}</div></div>
    <div style="padding:20px 0 4px">${busca(b, 'Buscar en tus notas', 'Buscar en tus notas', 'Título o texto…')}</div>
    ${nota('Los nombres de los metales', 'Hierro tira, acero empuja. Estaño afina los sentidos, peltre da fuerza.', '24 de noviembre')}
    ${nota('Sospecha sobre el hermano', 'Reen no puede haberla abandonado sin más. La voz que oye Vin no es un recuerdo.', '22 de noviembre')}
    ${nota('Frase para guardar', '«Hay siempre otro secreto.»', '19 de noviembre')}
    ${nota('Mapa de Luthadel', 'Kredik Shaw queda al centro; los cubiles, al este del canal.', '17 de noviembre')}
  </div>`;
  P['notas'] = libro({ dest: 'Notas', cuerpo: notas('A', 'A') });

  // ---------- Búsqueda en el libro ----------
  P['busqueda'] = `<div class="app"><div class="col">
    <header class="lbar">${ib('volver', 'Volver al libro')}<div class="busca llana f1" style="padding:0"><span style="color:var(--ink)">hemalurgia</span><span class="cur" style="flex:none;width:1.5px"></span></div>${ib('cerrar', 'Borrar la búsqueda', 'su')}</header>
    <main class="cont"><div class="tira" style="padding:12px var(--lado)"><span class="chip on">Capítulos</span><span class="chip on">Escenas</span><span class="chip on">Personajes</span><span class="chip">Localizaciones</span><span class="chip">Citas</span></div>
    <div class="vac"><b>Sin coincidencias</b></div></main></div></div>`;

  // ---------- Tu título ----------
  const tile = (ico, nombre) => `<button class="ib caja f1" style="width:auto;height:56px" aria-label="${nombre}">${I(ico)}</button>`;
  const cabTitulo = `<div class="r"><span class="it f1">El tirano, la ladrona y el metal</span>${ib('cerrar', 'Cerrar')}</div>`;
  P['titulo'] = `<div class="app"><div class="col"><header class="bar bar--f">${ib('volver', 'Volver al catálogo')}<span class="f1"></span>${ib('corregir', 'Proponer corrección')}</header><main class="cont"><div class="pad c g16"><div class="r g16">${cub(3, 'El imperio final', 'g')}<div class="c g4 f1"><h2 class="tit">El imperio final</h2><span class="mut s15">Brandon Sanderson</span></div></div></div></main></div>
    ${hoja(`${cabTitulo}<div class="r g8">${tile('chispa', 'Generar otro con IA')}${tile('lapiz', 'Editar la frase')}${tile('ampliar', 'Ver en grande')}</div>
      <div class="cp"><label>Modelo</label><div class="in"><span>Claude Sonnet 5.5</span>${I('abajo', 'm')}</div></div>
      <div class="r"><button class="bt pri">Generar</button><button class="bt lin">Cancelar</button><span class="mut s13 fin">Te quedan 3 hoy</span></div>`)}</div>`;
  P['titulo-vacio'] = `<div class="card r"><span class="chip ico on" role="img" aria-label="En marcha">${I('libro')}</span><span class="f1"></span>${ib('chispa', 'Tu título: generar con IA o escribirlo', 'ton')}</div>`;
  P['titulo-editar'] = `<div class="c g12" style="padding:16px;background:var(--sf)">${cabTitulo}<div class="cp"><label>Tu título divertido</label><div class="in foco"><span>El tirano, la ladrona y el metal</span></div><span class="pista">Se guarda sin la cabecera animada.</span></div><div class="r"><button class="bt pri">Guardar</button><button class="bt lin">Cancelar</button></div></div>`;
  P['titulo-sin-clave'] = `<div class="c g12" style="padding:16px;background:var(--sf)">${cabTitulo}<span class="mut s13">Para generar el título necesitas una clave de IA (Anthropic u OpenAI) para Libros.</span><div class="r"><button class="bt lin">${I('yosi', 'm')}Tus claves de IA</button><button class="bt lin">Cerrar</button></div></div>`;

  // ---------- Elementos ----------
  const ef = (n, d, on) => `<div class="efila${on ? ' on' : ''}"><b>${n}</b><span class="num">${d}</span></div>`;
  const subEl = `<div class="sub"><span class="lec s16">Personajes</span><span class="mut num" style="margin-left:4px">21</span>${I('abajo', 'm')}<span class="f1"></span></div>`;
  const elista = (v, b, sel) => `<div class="elist"><div class="r" style="padding:12px 12px 4px">${busca(b, 'Buscar en personajes', 'Buscar', 'Nombre o apodo…', 'f1')}${MAS.nuevo[v]}</div>
    <span class="egru">Principales</span>${ef('Vin', '34 cap.', sel)}${ef('Kelsier', '28 cap.')}${ef('Elend Venture', '19 cap.')}
    <span class="egru">Secundarios</span>${ef('Sazed', '17 cap.')}${ef('Dockson', '12 cap.')}${ef('Brisa', '11 cap.')}${ef('Ham', '9 cap.')}${ef('Marsh', '6 cap.')}
    <span class="egru">Menores</span>${ef('Camon', '2 cap.')}${ef('Reen', '1 cap.')}${ef('Lord Renoux', '4 cap.')}</div>`;
  const ficha = `<div class="f1 no-c pad c g12" style="background:var(--sf);padding:24px 28px">
    <div class="r"><h2 class="f1" style="font:600 26px/1.2 var(--lec)">Vin</h2><span class="r g4 mut s13">${I('nube-ok', 's')}Guardado</span></div>
    <div class="r wrap"><span class="pild">Viva ${I('abajo', 's')}</span><span class="pild">Mujer ${I('abajo', 's')}</span><span class="pild it">Valette</span><span class="pild it">La Heredera</span></div>
    <p class="lec" style="font:400 16px/1.6 var(--lec);max-width:68ch">Ladrona callejera de Luthadel, dieciséis años. Nacida de la bruma sin saberlo: lo que llama su Suerte es alomancia.</p>
    <div class="r wrap mut s13 raya" style="padding-top:12px"><span class="b" style="color:var(--ink)">Aparece en</span><span class="num">1</span><span class="num">2</span><span class="num">3</span><span class="num it">@4</span><span class="num">5</span></div></div>`;
  P['elementos'] = libro({ dest: 'Elementos', sub: subEl, cuerpo: `<div class="r est g0 f1" style="align-items:stretch;min-height:0">${elista('A', 'A', true)}${ficha}</div>` });
  P['elementos-vacio'] = `<div class="elist" style="width:100%;border:0"><div class="r" style="padding:12px 12px 4px">${busca('A', 'Buscar en localizaciones', '', '', 'f1')}${ib('mas', 'Nueva localización', 'lle')}</div><div class="vac" style="min-height:120px;padding:24px"><span class="s13">Sin localizaciones</span></div></div>`;

  // ---------- Opciones: el «+» ----------
  ['A', 'B', 'C'].forEach(v => {
    P['dmas-' + v.toLowerCase()] = `<div class="c g0" style="background:var(--sf)">
      <div class="c g4" style="padding:12px">${indice(v)}${ind(5, 'Ceniza sobre la plaza', 96)}</div><div class="sep"></div>
      <div class="cua" style="padding-bottom:8px"><span class="nu">2</span><div><p>…que acababa de matar a seis.</p><div class="apo"><span class="lug">${I('lugar')}El cubil</span><span>Vin</span><span>Kelsier</span></div></div><span class="nu sua" style="line-height:44px">3</span><div class="r" style="min-height:44px">${MAS.escena[v]}</div></div><div class="sep"></div>
      <div style="padding:12px"><div class="compo"><b class="lec" style="font:600 17px/1.3 var(--lec)">El undécimo metal</b><div class="r der" style="min-height:44px"><span class="r g4 mut s13">${I('nube-ok', 's')}Guardado</span>${MAS.nota[v]}</div></div></div><div class="sep"></div>
      <div style="background:var(--cv)"><div class="r" style="padding:12px 12px 4px">${busca('A', 'Buscar en personajes', '', '', 'f1')}${MAS.nuevo[v]}</div>${ef('Vin', '34 cap.')}<div style="height:8px"></div></div></div>`;
  });

  // ---------- Opciones: los buscadores ----------
  ['A', 'B', 'C'].forEach(b => {
    P['dbus-' + b.toLowerCase()] = `<div class="c g16" style="padding:16px 12px">
      ${busca(b, 'Buscar en tus notas', 'Buscar en tus notas', 'Título o texto…')}
      <div class="r">${busca(b, 'Buscar en personajes', 'Buscar', 'Nombre o apodo…', 'f1')}${ib('mas', 'Nuevo personaje', 'lle')}</div>
      ${buscaEnviar(b, 'Buscar un club', 'Busca un club', 'Nombre del club…')}
      ${buscaEnviar(b, 'Buscar mensajes', 'Buscar mensajes', 'Texto del mensaje…')}</div>`;
  });
  window.K.busca = busca; window.K.buscaEnviar = buscaEnviar;
})();
