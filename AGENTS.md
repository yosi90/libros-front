## Instrucciones obligatorias
- Antes de hacer cambios, lee `docs/codex/*` solo si no está ya en contexto o se ha perdido ese contexto.
- Considera `docs/codex/*` como fuente de verdad para convenciones, arquitectura, decisiones operativas y flujo de trabajo.
- Si hay conflicto entre suposiciones previas y ese manual, prevalece el manual.
- No empieces cambios de código hasta tener esos documentos en contexto.
- `docs/codex/PROJECT_WORKING_NOTES.md` recoge las notas operativas vivas del proyecto.
- `docs/GUIA_ESTILOS.md` es la fuente de verdad para criterios visuales, layout, modales, paleta y patrones UI. Antes de tocar estilos o UI, revisa esa guía.

### Resumen del producto
- Este repositorio es el frontend Angular de una aplicación personal para gestionar lecturas de libros.
- El frontend consume una API externa documentada en `docs/backend/`.

### Validación visual con Playwright
- El proyecto ya incluye `@playwright/test`, `playwright.config.ts` y los binarios locales de Chromium y Firefox; no los reinstales en cada tarea.
- Antes de cerrar cambios visuales o de interacción, usa Playwright para inspeccionar la aplicación en navegador siempre que la ruta y la sesión disponibles permitan reproducirla.
- Comandos habituales: `npm run e2e` para la comprobación automática y `npm run e2e:ui` para inspección interactiva. La configuración levanta Angular en `http://127.0.0.1:4200` y reutiliza un servidor existente.
- Mantén `playwright-report/` y `test-results/` fuera del repositorio; ya están ignorados.

### Avisos de agente en notificapp
- Lee `plugin-kit/README.md` y `plugin-kit/AGENT_NOTIFICATIONS.md` antes de configurar avisos. La copia local `plugin-kit/` está ignorada; la documentación recibida permanece en `docs/notificapp-plugin-kit/`.
- Este frontend solo envía respuestas finales y preguntas del agente al espacio «Agentes» con `agent_notify.py`; las solicitudes de catálogo las anuncia el backend. Usa un título que identifique Libros frontend y conserva el texto completo y exacto.
- El emisor del equipo usa un archivo privado bajo `C:\Users\yosi\.notificapp`; nunca leas su valor en la conversación ni lo publiques. El cliente local necesita `--token-file` o `NOTIFICAPP_AGENT_TOKEN_FILE`.
- Antes de preguntar, envía `agent_question` de forma explícita. Antes de cada respuesta final, escribe su texto completo y exacto en un archivo UTF-8 privado y envía `agent_finished` con `--body-file`, `--token-file` y un `--external-id` estable; borra después el archivo temporal. El hook `notify` de usuario conserva el comando previo de computer-use y no envía avisos a Notificapp: su conexión automática no funcionó en esta sesión. No dupliques el cierre manual.
