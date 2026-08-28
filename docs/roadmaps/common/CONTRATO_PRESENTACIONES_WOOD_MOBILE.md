# Contrato de presentaciones Wood/Mobile

Documento operativo del Hito 1 de `ROADMAP_ACTIVO_restauracion-wood-y-cliente-movil-angular-capacitor.md`. `docs/GUIA_ESTILOS.md` sigue siendo la fuente visual.

## Selección runtime

| Condición | Objetivo | Administración | Navegación |
|---|---|---|---|
| Web 320-599px | `mobile` compacta | Rechazada | App bar + bottom navigation |
| Web 600-1050px | `mobile` medium | Rechazada | App bar + navigation rail |
| Web >=1051px | `wood` | Wood + puntero fino | Shell editorial desktop |
| Capacitor Android | `native-mobile` | Rechazada | Mobile adaptada a safe areas |

- `PresentationModeService` publica el objetivo en `data-presentation-target` y la feature flag en `data-mobile-presentation`.
- La feature flag nace desactivada en desarrollo/producción y QA. Se activa en QA únicamente cuando el Hito 12 confirme paridad y después, mediante un cambio explícito, en producción.
- El modo se decide por `AdaptiveLayoutService` y la plataforma nativa. No se inspecciona user-agent.
- `desktopAdministrationGuard` consume el contrato de presentación y mantiene además el requisito de puntero fino.

## Patrón de feature

1. La ruta carga un container neutral.
2. El container proporciona una fachada con carga, estado editable, comandos, autosave, error y reconciliación.
3. Se instancia exclusivamente `Wood...ViewComponent` o `Mobile...ViewComponent`.
4. La vista recibe estado y emite intenciones; no llama directamente a la API si la fachada ya posee esa operación.
5. Al cambiar de presentación, el container captura primero el borrador y cierra/transfiere overlays; después sustituye la vista sin recrear la ruta.
6. Widgets neutrales pueden compartirse si no emiten layout, color ni navegación de una presentación.

Queda prohibido mantener ambos árboles ocultos, duplicar router outlets o crear stores paralelos para Wood/Mobile.

## Estrategia de migración

- Hitos 2-4 restauran Wood componente a componente. El commit baseline solo se consulta con `git show`/diff o un worktree temporal.
- Hitos 6-11 crean vistas Mobile nuevas detrás de la flag; no añaden condiciones Mobile dentro del Sass Wood.
- Mientras la flag esté apagada, `PresentationModeService` publica el objetivo pero no cambia la interfaz existente.
- Hito 12 activa Mobile en QA, completa las transiciones y solo después retira ThemeService/selectores light/dark.
- Capacitor se integra mediante adaptadores de plataforma; los servicios de dominio y contratos HTTP siguen siendo comunes.

## Estado y cambio de ancho

- Estado de búsqueda, filtros, paginación, scroll y formularios vive fuera de las vistas cuando deba sobrevivir.
- RTF y controles no serializables guardan un snapshot semántico antes de destruir la vista.
- Autosave pendiente se vacía o el cambio se aplaza; nunca se destruye silenciosamente una edición.
- Un overlay abierto se cierra de forma segura antes del cambio. Las confirmaciones sensibles no se descartan.
- El salto 1050/1051 no navega, no añade historial, no repite carga y no duplica listeners realtime.

## Sass

- `wood` y `mobile` tendrán parciales/entradas propios y encapsulación por componentes de vista.
- Solo son compartibles reset, a11y, tipografía base, funciones y mixins neutrales con varios consumidores.
- Bootstrap no sale del legado Wood. Mobile no importa Bootstrap ni reutiliza sus clases.
- Material/CDK puede compartirse como infraestructura; cada presentación aplica sus propios tokens al overlay container.

## Puertas

- No se activa Mobile en producción con rutas incompletas.
- No se marca Hito 1 hasta inventariar todos los controles posteriores al baseline y capturar las referencias Wood acordadas.
- No se empieza Hito 2 con un checkout masivo de HTML/Sass.
- No se inicia la integración Android completa hasta superar el spike de sesión, Firebase, push y app links.
