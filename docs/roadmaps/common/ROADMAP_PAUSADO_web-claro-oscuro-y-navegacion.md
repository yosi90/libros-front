# Web claro/oscuro, Wood opcional y reorganización de navegación

**Pausado el 30/9/2026:** la implementación está completa y el propietario aceptó la versión 1.0 el 27/9/2026, pero falta la checklist manual `docs/pruebas/common/[pausado][web-claro-oscuro-y-navegacion].md`. Al retomarlo, completar y registrar esas comprobaciones antes de darlo por finalizado.

## Objetivo

Dar al navegador su propia presentación **Web** en claro y oscuro —moderna, limpia y centrada en la usabilidad y la lectura, sin renunciar a la estética—, conservar **Wood** como alternativa estética elegible solo en escritorio y reorganizar la navegación web alrededor del perfil. La APK no cambia.

## Decisiones del propietario (25/9/2026)

- **Presentaciones independientes:** `web` en el navegador a cualquier ancho (320 px a ultrawide), claro y oscuro, con árbol de vistas propio que no depende de Mobile ni de Wood; `wood` elegible por encima de 1050 px, con apariencia única. La APK no se toca.
- **Tema por dispositivo:** cada navegador recuerda su elección (Claro, Oscuro o Wood). Con la cuenta de Yosiftware no se guarda en la cuenta (`docs/GUIA_ESTILOS.md`, «Modos de presentación»).
- **Wood por debajo de 1051 px** se sustituye por Claro sin perder la elección.
- **Selector de tema en Preferencias**, con las tres opciones y Wood deshabilitado, con su motivo, por debajo de 1051 px.
- **Navegación (Web y Wood):** la navegación principal no enlaza Autores, Universos, Sagas, Libros ni Antologías; son listados de solo consulta en el Perfil (`/dashboard/<gestor>` lleva a `/dashboard/profile?section=<tipo>`). Cuenta y seguridad y Preferencias se alcanzan desde el Perfil; en la APK siguen siendo destinos de primer nivel.
- **Propuestas desde Catálogo:** «Pedir nuevo libro» y «Más peticiones» (antología, autor, universo, saga, «Proponer corrección» y «Otro») sobre `/peticiones/catalogo`. Las altas directas son del plugin de administración de la plataforma.
- La paleta Mobile es el punto de partida de Web, pero Web tiene tokens propios en un parcial independiente.

## Contexto de datos reales

- Muchos libros antiguos no tienen página final registrada. La barra de progreso de libros, sagas y universos se basa en el total de páginas, así que muestra menos progreso del real. Es un dato incompleto, no un bug visual; no debe «corregirse» visualmente.
- La biblioteca del propietario tiene muchos universos y sagas. Su estado abierto por defecto es «Sin universo» con la saga de la lectura actual desplegada; cualquier diseño de biblioteca debe probarse con ese volumen.

## Hitos

- [x] **Hito 0, dirección:** `docs/GUIA_ESTILOS.md`, `CONTRATO_PRESENTACIONES_WEB.md` y el laboratorio local `/__web-design/:screen` (`src/app/components/pages/web-design-preview/`). El propietario delegó el diseño (25/9).
- [x] **Hito 1, presentación y tema:** `PresentationModeService` resuelve `web` o `wood`; `WebThemeService` guarda la elección del dispositivo; sección «Apariencia» en Preferencias; tokens en `src/assets/css/web/_tokens.sass` y tema Material Web en `src/assets/css/_material-themes.scss`, overlays incluidos.
- [x] **Hito 2, navegación:** listados personales, Cuenta y seguridad y Preferencias desde el Perfil; propuestas desde Catálogo.
- [x] **Hito 3, shell Web:** `WebNavigationComponent` (`src/app/components/web/ui/web-navigation/`): lateral plegable en escritorio, rail en medium y app bar con cajón en compact.
- [x] **Hito 4, vistas Web:** estadísticas (en dos pestañas, «Personal» y «General»), biblioteca, catálogo, espacio de libro, perfil, preferencias, cuenta y seguridad, notas del libro, comunidad, clubes, mensajes, bienvenida de estilo, paleta Ctrl+K, «Estabas leyendo» ampliada, sagas encadenadas y zona pública. `final-contracts.test.mjs` impide en las vistas Web las clases que Bootstrap define globalmente (`row`, `progress`…), tras dos choques visuales.
- [x] **Hito 5, pulido Wood:** el propietario lo dio por terminado el 27/9.
- [x] **Hito 6, regresión y aceptación:** transición por ruta retirada; APK QA 1.0.82 revisada en el Honor y aceptación del propietario (27/9).

## Pendiente

- La checklist manual (arriba).
- Revisar el Catálogo Web con el volumen real del propietario.
- Regenerar en Linux la referencia visual Wood de `account-security` (la compara la campaña nocturna).
