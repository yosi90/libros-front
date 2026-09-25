# Contrato de presentaciones Web/Wood/Mobile

Documento operativo de `ROADMAP_ACTIVO_web-claro-oscuro-y-navegacion.md`. Sustituye a `CONTRATO_PRESENTACIONES_WOOD_MOBILE.md` para el navegador; aquel conserva la historia de la restauración Wood y sigue describiendo la APK. `docs/GUIA_ESTILOS.md` es la fuente visual.

## Selección runtime

| Plataforma | Ancho | Elección del dispositivo | Presentación | Tema raíz | Administración |
|---|---|---|---|---|---|
| Capacitor Android | cualquiera | — (sol/luna de la APK) | `native-mobile` | `data-mobile-theme` | Rechazada |
| Navegador | cualquiera | Claro u Oscuro | `web` | `data-web-theme` | Web + puntero fino |
| Navegador | ≥1051 px | Wood | `wood` | — | Wood + puntero fino |
| Navegador | ≤1050 px | Wood | `web` (claro) | `data-web-theme="light"` | Web + puntero fino |

- `PresentationModeService` sigue siendo la única fuente de decisión y publica `data-presentation-target` y `data-presentation-active`.
- La resolución de `native-mobile` no cambia respecto al contrato anterior.
- No se inspecciona user-agent.

## Tema por dispositivo

- Nuevo tipo `WebThemeChoice = 'light' | 'dark' | 'wood'`, gestionado por un servicio propio de Web, independiente de `MobileThemeService`.
- Persistencia en `localStorage` por usuario (`libros:web-theme:<userId>`). Es una preferencia de interfaz, no un dato sensible; nunca contiene tokens.
- Sin elección local, el valor inicial es `Tema` de `GET /usuarios/me/preferencias-interfaz` (`wood|light|dark`). Elegir en el selector actualiza la elección local y, además, el `Tema` de cuenta como valor inicial para dispositivos nuevos.
- Los eventos `user.interface_preferences_updated` de otros dispositivos no sustituyen una elección local existente.
- Si el almacenamiento no está disponible (navegación privada o bloqueo), se usa la preferencia de cuenta sin error visible.
- Antes de iniciar sesión (zona pública), se usa la última elección local conocida del dispositivo o, en su defecto, Claro.

## Patrón de feature

1. La ruta carga un container neutral con su fachada (carga, estado editable, comandos, autosave, errores, reconciliación).
2. Se instancia exclusivamente la vista de la presentación activa: `Web...ViewComponent`, `Wood...` o `Mobile...ViewComponent`.
3. Las vistas reciben estado y emiten intenciones; no llaman a la API si la fachada ya posee la operación.
4. Cambiar de tema entre Claro y Oscuro no sustituye la vista: solo cambia `data-web-theme`.
5. Cambiar entre Web y Wood (por selector o por ancho con Wood elegido) captura primero el borrador y cierra o transfiere overlays; después sustituye la vista sin recrear la ruta ni añadir historial.
6. Queda prohibido mantener árboles ocultos, duplicar router outlets o crear stores paralelos por presentación.

## Transición

- Flag de entorno `webPresentationEnabled`: `true` en QA, `false` en desarrollo contra producción y en producción hasta el cierre del roadmap.
- Con la flag apagada, el navegador se comporta exactamente como antes (Mobile por debajo de 1051 px, Wood por encima) y el selector no ofrece Claro/Oscuro en escritorio.
- Con la flag encendida, una ruta que aún no tenga vista Web usa Wood en escritorio y Mobile en pantalla pequeña. Cada ruta lo declara con `data: { webView: true }` en algún nivel de su árbol; `WebRouteSupportService` lo lee en cada `NavigationEnd` y se lo pasa a `PresentationModeService.attachWebRouteSupport`. El token `WEB_VIEWS_READY` fuerza Web en todas las rutas y solo se usa en pruebas o al cierre. El fallback se retira al cierre.

## Sass

- Parciales propios en `src/assets/css/web/` (`_tokens.sass`, `_primitives.sass`). Web no importa Sass de `mobile/` ni de `wood/`.
- Tema Material Web claro y oscuro en `_material-themes.scss`, seleccionado por `data-presentation-active='web'` y `data-web-theme`, aplicado también al overlay container.
- Tokens MDC retirados (`--mdc-*`) prohibidos; la barrera QA de `final-contracts.test.mjs` lo comprueba.
- Bootstrap no entra en Web.

## Puertas

- No se construyen vistas Web hasta aprobar el laboratorio `/__web-design/:screen`.
- No se activa Web en producción con rutas en fallback.
- Toda modificación que afecte a la APK se trata como regresión.
