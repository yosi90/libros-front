// Biblioteca, editor de estado, antología, catálogo, ficha pública, hoja de saga y petición.
(function () {
  const P = window.P, { I, ib, cub, EST, app, hoja, obra } = window.K;
  const BS = 'Brandon Sanderson';

  const consulta = (ph, extra) => `<div class="consulta"><div class="busca llana f1">${I('buscar')}<span>${ph}</span></div>${extra}</div>`;
  const sigue = `<div class="r" style="padding:0 8px 12px"><div class="sigue">${cub(2, 'Elantris')}<div class="c g4 f1" style="padding:4px 8px 4px 0"><b class="s15">ELANTRIS</b><span class="mut s13">${BS}</span><span class="f1"></span><div class="barrap"><i style="width:1%"></i></div><span class="mut s12">1% leído</span></div></div></div>`;

  // v: 'A' sin iconos · 'B' el color del universo · 'C' como está hoy (icono de mundo y de saga).
  const saga = (nom, sub, ley, ks, n, v) => `<div class="saga">${v === 'C' ? `<span class="r" style="color:var(--ter)">${I('sagas', 'm')}</span>` : ''}<div class="c g2 f1"><span class="b el">${nom}</span>${sub ? `<span class="mut s12 el">${sub}</span>` : ''}${ley ? `<span class="s12 b" style="color:var(--ter)">${ley}</span>` : ''}</div><span class="cubs">${ks.map(k => cub(k, '', 'mini')).join('')}</span><span class="n">${n}</span>${I('abajo', 'm')}</div>`;
  const marca = (v, tono) => v === 'B' ? `<span class="mundo" style="background:hsl(${tono} 48% 43%)"></span>` : v === 'C' ? `<span class="r" style="color:hsl(${tono} 48% 43%)">${I('mundo', 'm')}</span>` : '';
  const uni = (nom, aut, n, cu, v, tono) => `<section class="uni"><div class="uni__cab">${marca(v, tono)}<div class="c g2 f1"><span class="uni__nom el">${nom}</span><span class="mut s12 no-c el">${aut}</span></div><span class="mut s12 bb"><span class="no-m">${n}</span><span class="no-c">${n} título${n > 1 ? 's' : ''}</span></span>${I(cu ? 'arriba' : 'abajo')}</div>${cu ? `<div class="uni__cu">${cu}</div>` : ''}</section>`;
  const sueltas = `<div class="rej">${obra(1, 'El aliento de los dioses', BS, 'EL ALIENTO DE LOS DIOSES', 'comprar')}${obra(2, 'Elantris', BS, 'ELANTRIS', 'marcha', 1)}</div>`;
  const cosmere = v => uni('El cosmere', BS, 5, `<div class="guia">${saga('El archivo de las tormentas', '', '', [4], 1, v)}${saga('Nacidos de la bruma', 'Era 1 - el imperio final', 'Continúa en Era 2 - wax y wayne', [3, 3], 2, v)}</div>${sueltas}`, v, 275);
  const universos = v => `<div class="c" style="padding:0 var(--lado) 16px">${cosmere(v)}${uni('Malaz', 'Steven Erikson', 1, '', v, 190)}</div>`;
  const cuerpoBiblio = consulta('Título, autor, universo…', ib('ajustar', 'Filtros', 'pr')) + sigue + universos('A');

  P['biblioteca'] = app({ nav: 'biblioteca', titulo: 'Mi biblioteca', cuerpo: cuerpoBiblio });
  ['mas-a', 'mas-b'].forEach(k => { P[k] = P[k].replace('<main class="cont"></main>', `<main class="cont">${cuerpoBiblio}</main>`); });
  ['A', 'B', 'C'].forEach(v => { P['d5-' + v.toLowerCase()] = `<div style="padding:12px">${cosmere(v)}</div>`; });

  const pest = (k, n, on) => `<span class="chip ico${on ? ' on' : ''}" role="tab" aria-label="${EST[k][1]}, ${n}">${I(EST[k][0])}${n}</span>`;
  P['biblioteca-estados'] = app({
    nav: 'biblioteca', titulo: 'Mi biblioteca',
    cuerpo: consulta('Título, autor, universo…', ib('ajustar', 'Filtros', 'ton')) +
      `<div style="padding:4px var(--lado) 12px"><div class="card"><div class="seg" role="radiogroup" aria-label="Organizar por"><span>Universos</span><span class="on">Estados</span></div></div></div>` + sigue +
      `<div class="tira" style="padding:0 var(--lado) 12px">${pest('marcha', 1, true)}${pest('espera', 2)}${pest('leido', 14)}${pest('comprar', 1)}${pest('quiero', 3)}</div>
       <div class="rej" style="padding:0 var(--lado)">${obra(2, 'Elantris', BS, 'ELANTRIS', 'marcha', 1)}</div>`,
  });
  P['filtros-universos'] = `<div class="card c g12"><div class="seg" role="radiogroup" aria-label="Organizar por"><span class="on">Universos</span><span>Estados</span></div><div class="r wrap" role="radiogroup" aria-label="Disponibilidad"><span class="chip on">Todos</span><span class="chip">Comprados</span><span class="chip">Por comprar</span></div></div>`;

  // ---------- Editor de estado y puntuación ----------
  const selector = (sel, conNombre) => `<div class="c g8"><div class="r g6" role="radiogroup" aria-label="Estado">${Object.keys(EST).map(k => `<button class="chip ico f1${k === sel ? ' on' : ''}" style="min-height:48px;padding:0" role="radio" aria-label="${EST[k][1]}">${I(EST[k][0])}</button>`).join('')}</div>${conNombre ? `<span class="b">${EST[sel][1]}</span>` : ''}</div>`;
  const estrellas = (n, c = '') => `<div class="estr ${c}" role="radiogroup" aria-label="Puntuación: ${n} de 5">${[1, 2, 3, 4, 5].map(i => `<span>${I('estrella', i <= n ? 'on' : '')}</span>`).join('')}</div>`;
  const noCompartir = `<label class="r g12"><span class="casilla"></span><span class="mut">No compartir esta actualización en Comunidad</span></label>`;
  const editor = `<section class="modal" role="dialog" aria-label="Actualizando Elantris">
    <header class="bar bar--f">${ib('volver', 'Volver a la biblioteca', 'pr')}<h1>Actualizando Elantris</h1></header>
    <div class="c g16 pad f1">${selector('leido', true)}<div style="margin-left:-10px">${estrellas(4)}</div>
      <div class="in alta" aria-label="Reseña"><span>Un comienzo lento y un final que lo arregla todo. Raoden me ganó en el capítulo de la plaza.</span></div>${noCompartir}</div>
    <footer class="pie"><button class="bt lin">Volver</button><button class="bt pri">Guardar</button></footer></section>`;
  P['editor'] = app({ nav: 'biblioteca', titulo: 'Mi biblioteca', cuerpo: cuerpoBiblio, encima: `<div class="velo no-c"></div>${editor}` });
  P['editor-sin-nota'] = `<div class="c g16">${selector('quiero', true)}<div style="margin-left:-10px">${estrellas(0)}</div>${noCompartir}</div>`;
  P['dest-a'] = `<div class="c g16">${selector('leido', true)}</div>`;
  P['dest-b'] = `<div class="c g16">${selector('leido', false)}</div>`;

  // ---------- Antología ----------
  const seccion = (k, nom, pag, pct) => `<article class="obra">${cub(k, '')}<div class="obra__cu"><span class="obra__ti b">${nom}</span><span class="mut s13">Páginas ${pag}</span>${pct ? `<span class="pri s13 b">${pct}% leído</span>` : ''}</div>${ib('puntos', `Estado y puntuación de ${nom}`, 'su')}${pct ? `<span class="prog"><i style="width:${pct}%"></i></span>` : ''}</article>`;
  P['antologia'] = `<div class="app"><div class="col">
    <header class="bar bar--f">${ib('volver', 'Volver a la biblioteca')}${cub(8, '', 'mini')}<h1 style="margin-left:8px">Arcanum ilimitado</h1></header>
    <main class="cont"><div class="c g16 pad">
      <div class="c g4"><span class="mut s15">${BS}</span><span class="pri b s13">3 títulos</span></div>
      <div class="r" aria-label="Acciones de la antología"><button class="bt ton f1" style="padding:0">Ficha</button><button class="bt ton f1" style="padding:0">Mi lectura</button><button class="bt ton f1" style="padding:0">Similares</button></div>
      <div class="rej">${seccion(8, 'La esperanza de Elantris', '1–20', 100)}${seccion(8, 'El undécimo metal', '21–60', 35.5)}${seccion(7, 'Sexto del ocaso', '61–140', 0)}</div>
      <button class="bt txt" style="align-self:center">Actualizar secciones</button>
    </div></main></div></div>`;

  // ---------- Catálogo ----------
  const chipSaga = t => `<span class="chip" aria-label="Saga: ${t}">${I('sagas', 's')}${t}</span>`;
  const cuerpoCat = consulta('Título o autor…', ib('ajustar', 'Filtros', 'caja') + ib('mas', 'Solicitar un libro nuevo', 'caja')).replace('<span>Título o autor…</span>', '<span style="color:var(--ink)">bruma</span>') +
    `<div class="tira" style="padding:4px var(--lado) 12px">${chipSaga('Nacidos de la bruma · Era 1')}${chipSaga('Nacidos de la bruma · Era 2')}</div>
     <div class="rej" style="padding:0 var(--lado)">${obra(3, 'El imperio final', BS, 'El imperio final', 'leido', 0, 'der')}${obra(3, 'El pozo de la ascensión', BS, 'El pozo de la ascensión', 'marcha', 0, 'der')}${obra(3, 'El héroe de las eras', BS, 'El héroe de las eras', '', 0, 'der')}${obra(5, 'Aleación de ley', BS, 'Aleación de ley', '', 0, 'der')}${obra(6, 'Brumas de Avalón', 'Marion Zimmer Bradley', 'Las brumas de Avalón', 'quiero', 0, 'der')}${obra(4, 'Bruma roja', 'Lucía G. Sobrado', 'Bruma roja', '', 0, 'der')}</div>`;
  P['catalogo'] = app({ nav: 'catalogo', titulo: 'Catálogo', cuerpo: cuerpoCat });
  P['catalogo-vacio'] = `<div class="vac" style="min-height:200px"><b>Sin resultados</b><button class="bt lin">Solicitar un libro nuevo</button></div>`;

  // ---------- Ficha pública ----------
  const dato = (e, v) => `<div class="dato"><span>${e}</span>${v}</div>`;
  const heroe = `<div class="r g16">${cub(3, 'El imperio final', 'g')}<div class="c g4 f1"><h2 class="tit">El imperio final</h2><span class="mut s15">${BS}</span><span class="pri bb" style="margin-top:8px">4,6 (128 puntuaciones)</span></div></div>`;
  const barraFicha = `<header class="bar bar--f">${ib('volver', 'Volver al catálogo')}<span class="f1"></span>${ib('corregir', 'Proponer corrección')}</header>`;
  const meta = `<div class="card"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${dato('ISBN', '9788418037214')}${dato('Publicación', '2006')}${dato('Idiomas', 'Español, Inglés')}${dato('Estilos', 'Aventura, Fantasía épica')}</div></div>`;
  const resena = (n, nom, est, txt) => `<article class="card c"><div class="r g12"><span class="av p">${n}</span><span class="b f1">${nom}</span>${estrellas(est, 'ch').replace(/<span>/g, '<span style="width:18px;height:18px">')}</div><p>${txt}</p><button class="bt txt ch mal" style="align-self:flex-end;color:var(--err)">Denunciar</button></article>`;
  P['ficha'] = `<div class="app"><div class="col">${barraFicha}<main class="cont"><div class="c g24 pad">
    ${heroe}
    <div class="r wrap"><button class="bt ton">Actualizar lectura</button><button class="bt pri">Abrir lectura</button></div>
    ${meta}
    <div class="c"><h3 class="h">Ediciones</h3>
      <div class="fl suelta" style="border-color:var(--pr)"><span class="num">9788418037214</span><span class="mut s13 f1">2021</span><span class="pri bb s13">La tienes</span></div>
      <div class="fl suelta"><span class="num">9788466658898</span><span class="mut s13 f1">2008</span></div>
      <div><button class="bt lin">Retirar esta edición</button></div></div>
    <div class="card c g12"><div class="r g12"><span class="chip ico on" role="img" aria-label="Leído">${I('leido')}</span>${estrellas(4, 'ch').replace(/<span>/g, '<span style="width:20px;height:20px">').replace('Puntuación', 'Tu puntuación')}</div>
      <blockquote class="cita">La mejor idea de atraco que he leído, y el final de Kelsier todavía me duele.</blockquote>
      <div class="franja">El tirano, la ladrona y el metal${ib('ajustar', 'Opciones de tu título')}</div></div>
    <div class="c"><div class="rej3"><div class="cif cen"><b>342</b><span>bibliotecas</span></div><div class="cif cen"><b>211</b><span>lecturas</span></div><div class="cif cen"><b>37</b><span>en marcha</span></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="cif cen"><b>41,5</b><span>págs. por día de lectura</span></div><div class="cif cen"><b>16</b><span>días para terminarlo</span></div></div></div>
    <div class="c"><h3 class="h">Evolución de la nota</h3><div class="rej3"><div class="cif cen"><b>4,52</b><span>sep 2026</span></div><div class="cif cen"><b>4,58</b><span>oct 2026</span></div><div class="cif cen"><b>4,60</b><span>nov 2026</span></div></div></div>
    <div class="c g12"><div class="rej">${resena('M', 'Marta R.', 5, 'Un mundo de ceniza que se queda contigo. Vin es de lo mejor del género.')}${resena('J', 'Javi', 4, 'Le sobra algún entrenamiento, pero el último tercio no se suelta.')}</div>
      <div class="r"><button class="bt lin" disabled>Anterior</button><span class="f1" style="text-align:center">1 / 3</span><button class="bt lin">Siguiente</button></div></div>
  </div></main></div></div>`;
  P['ficha-fuera'] = `<div class="c g24 pad">${heroe}<div class="r g6"><span class="b" style="margin-right:4px">Añadir</span>${Object.keys(EST).map(k => `<button class="chip ico" style="padding:0 9px;min-width:38px" aria-label="Añadir como: ${EST[k][1]}">${I(EST[k][0])}</button>`).join('')}</div><div class="r cen"><span class="rueda ch" role="img" aria-label="Cargando datos públicos"></span></div></div>`;

  // ---------- Hoja de saga ----------
  const titulo = (k, t, mia) => `<div class="fl" style="padding:8px 0">${cub(k, '', 'p')}<div class="c g2 f1"><span class="b s15">${t}</span>${mia ? '<span class="mut s13">En tu biblioteca</span>' : ''}</div>${I('der', 'm')}</div>`;
  P['saga'] = app({
    nav: 'catalogo', titulo: 'Catálogo', cuerpo: cuerpoCat,
    encima: `<div class="velo no-c"></div><section class="modal sf" role="dialog" aria-label="Saga Nacidos de la bruma"><div class="c g16 pad">
      <div class="r ini"><h2 class="f1" style="font:400 22px/1.25 var(--ui)">Nacidos de la bruma <span class="mut s16">· Era 1 - el imperio final</span></h2>${ib('cerrar', 'Cerrar')}</div>
      <div style="display:grid;grid-template-columns:88px 1fr;gap:10px 8px"><span class="mut">Universo</span><span>El cosmere</span><span class="mut">Autoría</span><span>${BS}</span></div>
      <div class="card hun ch r wrap"><span class="b">Continúa en</span><span class="chip on">Era 2 - wax y wayne ${I('flecha', 's')}</span></div>
      <div class="c g0"><span class="rot">3 títulos</span>${titulo(3, 'El héroe de las eras', false)}${titulo(3, 'El imperio final', true)}${titulo(3, 'El pozo de la ascensión', true)}</div>
    </div></section>`,
  });

  // ---------- Petición al catálogo ----------
  const campo = (e, v = '', pista = '', c = '') => `<div class="cp"><label>${e}</label><div class="in ${c}"><span${v.startsWith('AAAA') ? ' class="ph"' : ''}>${v}</span></div>${pista ? `<span class="pista">${pista}</span>` : ''}</div>`;
  P['peticion'] = app({
    nav: 'catalogo', titulo: 'Catálogo', cuerpo: cuerpoCat,
    encima: `<div class="velo no-c"></div><section class="modal sf" role="dialog" aria-label="Pedir nuevo libro">
      <div class="c g16 pad f1"><div class="r"><h2 class="tit f1">Pedir nuevo libro</h2>${ib('cerrar', 'Cerrar')}</div>
        <div class="card hun ch b">2 de 5 peticiones activas</div>
        <div class="rej" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">${campo('Nombre', 'Trenza del mar Esmeralda')}${campo('ISBN *', '', '10 o 13 cifras', 'foco')}${campo('Fecha de publicación', 'AAAA o AAAA-MM-DD')}</div>
        ${campo('Sinopsis (opcional)', '', '', 'alta')}<span class="pista" style="align-self:flex-end;margin-top:-10px">0 / 2000</span>
        ${campo('Nota con más detalles', '', '', 'alta')}</div>
      <footer class="pie"><button class="bt lin">Cancelar</button><button class="bt pri">Enviar petición</button></footer></section>`,
  });
  P['peticion-limite'] = `<div class="c"><div class="card hun ch b">5 de 5 peticiones activas</div><div class="aviso wn">Has alcanzado el límite. Si repites un ISBN que ya tienes activo, se recupera tu petición anterior.</div></div>`;
})();
