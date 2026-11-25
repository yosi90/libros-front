# Petición de la plataforma Yosiftware: Modern Web Guidance en vuestra web (kit 1.102)

Fecha: 2026-11-22
Solicitante: la plataforma Yosiftware (`administracion yosiftware`), por decisión del propietario
Afecta a: los agentes que escriben o diseñan vuestro código web (HTML, CSS y JavaScript del navegador)
Estado: entregada el 2026-11-22. **Obligatoria**, sin fecha.

## Contexto

Modern Web Guidance son unas guías de Chrome, Edge, Firefox y MDN para usar lo que el navegador ya ofrece en lugar de rehacerlo en JavaScript. Cada guía dice qué navegadores lo soportan y qué respaldo poner para los demás. Se probó primero en MCC, y después la plataforma comparó su web con las suyas, la social y la de administración. **MCC salió más moderna** en lo que el plugin le hizo cambiar:
- las hojas, con `<dialog>` nativo: `showModal()`, y `closedby` con su respaldo para Safari. Con eso, el foco, Esc y el gesto de volver los da el navegador;
- consultas de contenedor (`@container`) en lugar de cortes por el ancho de la pantalla;
- `dvh` y `overscroll-behavior` en lugar de `100vh`;
- `color-scheme`, con el selector de claro, oscuro o automático;
- ningún `window.confirm` ni `window.prompt`.

Las nuestras tenían `div` con `role="dialog"`, `window.confirm`, `window.prompt` y `100vh`, y las vamos a modernizar en una fase propia. El propietario ha decidido extenderlo a todo el ecosistema. Lo explica `ecosistema-kit/WEB_MODERNA.md`.

## Qué os pedimos

1. **Copiad el kit 1.102** desde la fuente vigente (`C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit`, rama `main`).
2. **En Claude Code:** activad el plugin en vuestro `.claude/settings.json`, versionado, junto al gancho `Stop` que ya tengáis. El bloque exacto está en `WEB_MODERNA.md`, «Claude Code»: `env` con `DISABLE_TELEMETRY` a `"1"`, el mercado `googlechrome` y `modern-web-guidance@googlechrome` activado. Si el agente no puede escribir ese archivo, pasadle el bloque al propietario, como con el gancho.
3. **En Codex:** no hay que instalar nada. Usad la herramienta de consola con la telemetría apagada, como dice `WEB_MODERNA.md`, «Codex».
4. **Poned al día vuestro `AGENTS.md`** con el párrafo nuevo de `BLOQUE_AGENTS.md`, «La web moderna».
5. **Si tenéis diseñador** (`.claude/agents/disenador.md`): añadidle `Bash` a `tools`, solo para esa herramienta, y el punto «Modern Web Guidance» de la plantilla (`agentes/disenador.md`, «Cómo trabajas»).
6. **Desde ahora, consultad las guías** antes de escribir o diseñar un patrón web que no sea trivial. Lo que ya tenéis se moderniza cuando toquéis esa vista; no hace falta rehacer la web. Si queréis una fase propia, decididla con el propietario.
7. **Respondednos** en `C:\Users\Yosi\Desktop\administracion yosiftware\docs\peticiones\` con la revisión en la que lo pusisteis.

## Para MCC

Vuestra prueba ha terminado bien y ya no es «solo en MCC». En vuestra documentación (`CONTEXTO_PROYECTO.md`, el roadmap y el diseñador), cambiad «a prueba» por lo que dice el kit 1.102, y anotad que la prueba se cerró el 2026-11-22 a favor del plugin. Lo demás ya lo tenéis.

## Lo que no hace falta

- Si vuestro proyecto no tiene código web (una APK nativa sin WebView, o un juego de Godot que solo exporta su web con el addon del kit), no os afecta. Respondednos igualmente diciendo que no aplica.
- `legacy-scan` no es obligatorio. Además, es superficial: no vio ni los `window.confirm` ni los `100vh` de la plataforma.

## Para la plantilla de proyectos

El `.claude/settings.json` de la plantilla, el párrafo del `AGENTS.md` y el diseñador, como arriba.

## Resolución

**Aceptada** (2026-11-25, `9bae7418` del frontend).

- El plugin está activado en `.claude/settings.json` (versionado), con `DISABLE_TELEMETRY`, el mercado `googlechrome` y `modern-web-guidance@googlechrome`.
- Como las sesiones de Claude se abren en la carpeta común `Memoria bibliográfica`, el mismo bloque está también en su `.claude/settings.json`.
- `AGENTS.md` lleva el párrafo «La web moderna».
- El diseñador nuevo (`.claude/agents/disenador.md`, kit 1.95) tiene `Bash` solo para la herramienta y el punto «Modern Web Guidance».
- Lo que ya existe se moderniza al tocar cada vista. Lo primero será el rediseño de la vista de libro con el diseñador.
