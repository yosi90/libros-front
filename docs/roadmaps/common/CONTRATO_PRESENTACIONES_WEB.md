# Contrato de presentaciones Web/Wood/Mobile

Documento operativo de `ROADMAP_PAUSADO_web-claro-oscuro-y-navegacion.md`: la selección del navegador. `docs/GUIA_ESTILOS.md` es la fuente visual.

## Selección runtime

| Ancho | Elección del dispositivo | Presentación | Tema raíz |
|---|---|---|---|
| cualquiera | Claro u Oscuro | `web` | `data-web-theme` |
| ≥1051 px | Wood | `wood` | — |
| ≤1050 px | Wood | `web` (claro) | `data-web-theme="light"` |

- `PresentationModeService` es la única fuente de decisión y publica `data-presentation-target` y `data-presentation-active`.
- No se inspecciona user-agent.
- La administración no existe en la web: es el plugin de la plataforma.

## Tema por dispositivo

- `WebThemeChoice = 'light' | 'dark' | 'wood'`, en `WebThemeService`, independiente de `MobileThemeService`.
- Se guarda en el navegador (`libros:web-theme:last`), no en la cuenta (`ecosistema-kit/ACCESO.md`, «Los ajustes de la web»), y no se borra al cambiar de cuenta. Es una preferencia de interfaz, nunca contiene tokens.
- Sin elección, Claro. Si el almacenamiento no está disponible (navegación privada o bloqueo), la elección dura lo que la pestaña, sin error visible.
- Las ventanas del SDK siguen el tema de `<html>` (`dataset.theme`; Wood es oscuro).

## Patrón de feature

1. La ruta carga un container neutral con su fachada (carga, estado editable, comandos, autosave, errores, reconciliación).
2. Se instancia exclusivamente la vista de la presentación activa: `Web...ViewComponent`, `Wood...` o `Mobile...ViewComponent`.
3. Las vistas reciben estado y emiten intenciones; no llaman a la API si la fachada ya posee la operación.
4. Cambiar entre Claro y Oscuro no sustituye la vista: solo cambia `data-web-theme`.
5. Cambiar entre Web y Wood (por selector o por ancho con Wood elegido) captura primero el borrador y cierra o transfiere overlays; después sustituye la vista sin recrear la ruta ni añadir historial.
6. Queda prohibido mantener árboles ocultos, duplicar router outlets o crear stores paralelos por presentación.

## Presentación Web y laboratorios

- `webPresentationEnabled` está a `true` en todos los entornos. Solo en `localhost`/`127.0.0.1`, `localStorage['book-front:web-presentation'] = 'off'` la desactiva: `installLocalVisualSession` lo hace por defecto para que las regresiones de Wood y Mobile conserven su presentación; las pruebas de vistas Web pasan `{ webPresentation: true }`. Sin Web, el navegador usa Mobile por debajo de 1051 px y Wood por encima.
- En Wood y Web, Cuenta y seguridad y Preferencias son apartados del Perfil (`/dashboard/profile?section=security|preferences&tab=<apartado>`); `profileSectionGuard` redirige sus rutas propias.
- Los laboratorios `/__mobile-design` y `/__web-design` solo abren en local; el de Mobile se prueba con la presentación Web desactivada.

## Sass

- Parciales propios en `src/assets/css/web/` (`_tokens.sass`, `_primitives.sass`, `_classes.sass`). Web no importa Sass de `mobile/` ni de `wood/`.
- Tema Material Web claro y oscuro en `src/assets/css/_material-themes.scss`, seleccionado por `data-presentation-active='web'` y `data-web-theme`, aplicado también al overlay container.
- Tokens MDC retirados (`--mdc-*`) prohibidos; la barrera de `final-contracts.test.mjs` lo comprueba.
- Bootstrap no entra en Web.

## Puertas

- Toda modificación que afecte a la APK se trata como regresión.
