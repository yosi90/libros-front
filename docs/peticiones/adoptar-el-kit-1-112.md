# Petición a los proyectos del ecosistema: Modern Web Guidance con la versión fijada, y «Continuar como…» solo con una oferta buena (kit 1.112)

Fecha: 2026-11-27
Solicitante: Plataforma Yosiftware, a petición de Día a día (sus revisiones de seguridad SR1-2 y SR1-4)
Destinatarios: el frontend de Libros, Fichas 3.5 (Rol y 3.5 Companion), Nodaria, Lorcana, Poke-Voice, Re-Notas, Hotrods, Rasgora, 1d1n, Día a día, Yosiftadísticas, p.i.c., la plantilla de proyectos, MCC y Enroque
Afecta a: vuestro `.claude/settings.json`, vuestro `AGENTS.md` y vuestro diseñador si tenéis código web; y la librería de la sesión o el addon de Godot si tenéis APK
Estado: entregada el 2026-11-27, la misma copia en la carpeta de peticiones de cada proyecto

## Contexto

Día a día revisó la seguridad de su primera APK de producción y encontró dos cosas de la plataforma:

1. **Modern Web Guidance sin versión fija** (importante). `WEB_MODERNA.md` pedía `npx -y modern-web-guidance@latest …`, y el plugin de Claude se instalaba de su repositorio sin versión. En este servidor eso corre como el propietario, que llega a las claves maestras de los servicios y a las bases, así que una versión futura comprometida se ejecutaría con ese acceso.
2. **Una oferta falsa de «Continuar como…»** (menor). Con la librería 1.11.0 gana la primera app que contesta. Cualquier app instalada que exponga el servicio de la librería podía contestar antes con un alias falso. El canje fallaba, así que no daba acceso a nada, pero la persona veía un botón que no funcionaba.

Está todo en el kit 1.112 (fuente vigente: `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`). La plataforma ya está en QA y en producción (`089b8e4`).

## Qué necesitamos

### Si tenéis código web: fijar Modern Web Guidance (obligatorio)

`WEB_MODERNA.md`, «La versión, fijada»:

1. En vuestro `.claude/settings.json`, en la entrada `googlechrome` de `extraKnownMarketplaces`, añadid `"ref": "64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65"` dentro de `source`, y `"autoUpdate": false` junto a `source`. El bloque entero está en `WEB_MODERNA.md`. Si el agente no puede escribir ese archivo, pasádselo al propietario, como el gancho.
2. En vuestro `AGENTS.md` y en vuestro diseñador, cambiad `modern-web-guidance@latest` por `modern-web-guidance@1.0.1`.
3. Hace falta Claude Code 2.1.324 o posterior. Si uno anterior no carga el plugin, actualizad Claude Code y dejad el `ref` puesto.

Para subir de versión, la plataforma la revisa antes y la sube en un kit nuevo. Si os hace falta algo de una versión nueva, pedídnoslo.

### Si tenéis APK: la librería de la sesión 1.12.0 o el addon de Godot 1.2.1 (recomendado, sin fecha)

`APK.md`, «La librería 1.12.0», y `GODOT.md`, «El addon 1.2.1»:

- `sesionDeOtraApp()` comprueba cada oferta con la plataforma antes de devolverla, sin gastar el ticket (`POST /v1/sesion/nativa/traspaso/comprobacion`). Si no vale, espera a la siguiente app.
- No cambia nada de lo que llamáis: copiad la carpeta `android/sesion/` (o `godot/addons/yosiftware/`) en lugar de la vuestra, compilad y probad «Continuar como…» en un móvil con otra app con sesión.
- `ErrorSesion.estadoNoValido()` y `ErrorSesion.sinSesion()` pasan a ser públicos, por si los necesitáis.

## Comprobaciones previas

- **La plataforma:** su `.claude/settings.json` ya lleva el `ref` y el `autoUpdate`, y su app Yosiftware usa la 1.12.0 desde su próxima versión.
- **Las pruebas:**
  - de la librería, 86, también las dos nuevas: una oferta falsa se salta, y sin red no se enseña ninguna;
  - de la API: la comprobación no gasta el ticket y rechaza la app que no lo dio;
  - del plugin de Godot, con los AAR recompilados.

## Calendario y dependencias

- **Lo de Modern Web Guidance:** cuanto antes, porque es de seguridad. Hasta tenerlo fijado, no actualicéis el plugin ni ejecutéis la consola con `@latest`.
- **La librería:** sin fecha, con vuestra próxima APK.

## Fuera de alcance

El protocolo entre las apps no cambia: las apps con la 1.11.0 siguen funcionando con las que tengan la 1.12.0.

## Resolución

<!-- La rellena cada destinatario en su copia. -->
