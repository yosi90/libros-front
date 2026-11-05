// Tema Web del dispositivo antes de que arranque Angular: evita ver Wood de fondo durante la carga. Replica
// PresentationModeService; los laboratorios internos (/__…) no se tocan. Va en un archivo propio, y no en línea en
// index.html, para que la CSP no necesite 'unsafe-inline' en script-src (docs/codex/PROJECT_WORKING_NOTES.md, «CSP»).
(function () {
  try {
    var w = window, root = document.documentElement;
    if (location.pathname.indexOf('/__') === 0) return;
    var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (local && localStorage.getItem('book-front:web-presentation') === 'off') return;
    var choice = localStorage.getItem('libros:web-theme:last') || 'light';
    if (choice === 'wood' && w.matchMedia('(min-width: 1051px)').matches) return;
    root.setAttribute('data-presentation-active', 'web');
    root.setAttribute('data-web-theme', choice === 'dark' ? 'dark' : 'light');
  } catch (error) { /* Sin almacenamiento: decide Angular al arrancar. */ }
})();
