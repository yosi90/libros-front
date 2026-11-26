// Monta los lienzos: cada pantalla está escrita una sola vez en un <template> y se pinta en sus tamaños.
// No hay lógica de producto: solo se clona marcado estático y se cambian el tamaño y el tema que se enseñan.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var TAM = { c: 'Móvil · 360 × 800', m: 'Plegable abierto · 840 × 900', d: 'Pantalla ancha · 1440 × 900' };

  function plantilla(id) {
    var t = document.getElementById(id);
    return t && t.content ? t.content.cloneNode(true) : document.createDocumentFragment();
  }

  function iconos(raiz) {
    raiz.querySelectorAll('i[data-i]').forEach(function (i) {
      var s = document.createElementNS(NS, 'svg');
      s.setAttribute('class', 'ic' + (i.className ? ' ' + i.className : ''));
      s.setAttribute('viewBox', '0 0 24 24');
      s.setAttribute('aria-hidden', 'true');
      var u = document.createElementNS(NS, 'use');
      u.setAttribute('href', '#i-' + i.getAttribute('data-i'));
      s.appendChild(u);
      i.replaceWith(s);
    });
  }

  function monta(lz, id) {
    lz.appendChild(plantilla(id));
    var el, n = 0;
    while ((el = lz.querySelector('[data-inc]')) && n++ < 300) {
      el.replaceWith(plantilla(el.getAttribute('data-inc')));
    }
    iconos(lz);
  }

  document.querySelectorAll('.pant[data-de]').forEach(function (p) {
    var fila = document.createElement('div');
    fila.className = 'fila';
    (p.getAttribute('data-tam') || 'c m d').split(' ').forEach(function (k) {
      var f = document.createElement('figure');
      f.className = 'lzw lzw--' + k;
      var c = document.createElement('figcaption');
      c.textContent = TAM[k];
      var lz = document.createElement('div');
      lz.className = 'lz t-' + k;
      monta(lz, p.getAttribute('data-de'));
      f.appendChild(c);
      f.appendChild(lz);
      fila.appendChild(f);
    });
    var tira = p.querySelector('.fila');
    if (tira) { p.insertBefore(fila, tira); } else { p.appendChild(fila); }
  });

  document.querySelectorAll('.lz[data-de]').forEach(function (lz) { monta(lz, lz.getAttribute('data-de')); });
  iconos(document);

  var pg = document.getElementById('pg');
  if (!pg) { return; }
  function pon(attr, v) {
    pg.setAttribute(attr, v);
    document.querySelectorAll('button[data-pon="' + attr + '"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.value === v));
    });
  }
  var raiz = document.documentElement;
  var tema = raiz.getAttribute('data-theme');
  var oscuro = tema ? tema === 'dark' : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  pon('data-maqueta', oscuro ? 'oscuro' : 'claro');
  pon('data-ver', 'todos');
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-pon]') : null;
    if (b) { pon(b.getAttribute('data-pon'), b.value); }
  });
})();
