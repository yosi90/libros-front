# Inventario inicial para restaurar Wood

> Baseline visual: `272376f497ec189241a35d3353a95af1b018c639`. Este documento impide confundir restauración visual con reversión funcional.

## Magnitud del cambio

- 121 archivos HTML/Sass/SCSS/CSS cambiaron entre el baseline y `31755e5`.
- 157 archivos TypeScript cambiaron en el mismo intervalo.
- `app.routes.ts`, `user-router.module.ts` y `book-router.module.ts` contienen contratos posteriores y no se restauran desde el baseline.
- La comparación se realiza por superficie y control. No se permite `git checkout <baseline> -- '*.html' '*.sass'`.

## Funciones posteriores que Wood debe conservar

- Firebase completo: password, Google, teléfono, onboarding, verificación, recuperación y custom token canónico.
- `/dashboard/account-security`: métodos, reautenticación, sesiones, vinculación y revocación.
- Confirmación Google cuando el correo verificado difiere del principal.
- Preferencias backend toleradas, aunque el selector de tema se retire al completar Mobile.
- Administración moderna: usuarios, roles, auditoría, moderación, políticas, métricas, catálogo y backup SQL.
- PWA online-first, pantalla offline, actualización explícita y scopes separados de workers.
- Comunidad, perfiles públicos, relaciones, feed, clubes, chat, notificaciones y realtime.
- Gestores con rutas `/new` y `/:id`, restauración de filtros/scroll y altas auxiliares.
- Catálogo canónico, colección personal, puntuación, reseña y peticiones.
- Escenas aceptables, validación posterior estricta, autosave, páginas sincronizadas, debounce de keywords y selección RTF.
- Asignación táctil/alfa de personajes, CRUD narrativo completo y cambio de nombre con apodo.
- Rutas API canónicas documentadas en `docs/backend/api/RUTAS_RETIRADAS.md`.

## Superficies y referencia

| Grupo | Referencia Wood | Controles modernos a integrar |
|---|---|---|
| Home y auth | Portada, fondo, tarjeta y tipografía baseline | Google, teléfono, onboarding, handlers y errores recuperables |
| Dashboard | Navbar/sidebar flotante y fondo router | Comunidad, seguridad, notificaciones, capacidades y rutas nuevas |
| Biblioteca/catálogo | Cards texturizadas, filtros y modal editorial | Catálogo canónico, estados, solicitudes, puntuación y reseñas |
| Gestores | Tabla, métricas y formulario lateral | Rutas navegables, restauración de estado, imágenes y altas rápidas |
| Perfil/seguridad | Ficha editorial | Políticas, preferencias vigentes, métodos y dispositivos |
| Administración | Menú/panel Wood | Moderación, auditoría, operación, catálogo y backup |
| Libro | Índice y workspace editorial | Estructura actualizada, búsqueda y acciones canónicas |
| Capítulo/RTF | Papel, escenas y toolbar histórica | Autosave, aceptabilidad, keywords, páginas, selección y toque |
| Entidades | Formularios/fichas Wood | Relaciones, apodos, entradas, guard común y rutas actuales |
| Comunidad/chat | Tratamiento Wood desktop | Realtime, clubes, notificaciones, dos columnas y flotantes desktop |

## Capturas requeridas

Las referencias se generan desde un worktree temporal del baseline, sin modificar la rama activa, y se revisan a:

- 1440x900: Home, login, dashboard, biblioteca, gestor, perfil, libro, capítulo y entidad narrativa.
- 1920x1080: dashboard, biblioteca, gestor, administración y libro.
- 2560x1080: shell general, superficies con tabla/grid y workspace del libro.

Si una ruta baseline no puede arrancar contra los contratos actuales, se captura con fixtures locales o se documenta mediante HTML/Sass/assets históricos; nunca se conecta el baseline a producción ni se debilitan guards para obtener una imagen.

### Lote inicial capturado

`docs/referencias/wood-baseline/README.md` registra las referencias revisadas de Home, login y biblioteca vacía a 1440, 1920 y 2560 px. La biblioteca se obtuvo con sesión y respuestas completamente ficticias e interceptadas en memoria.

El resto de superficies se captura por vertical antes de su restauración. Esta secuencia evita crear fixtures desechables sin datos representativos y convierte cada captura en una puerta explícita de los Hitos 3 y 4.

## Criterio por componente

1. Comparar baseline visual, implementación actual y controles funcionales vigentes.
2. Recuperar estructura/estilo Wood en una vista específica o merge semántico.
3. Reintroducir controles nuevos con la jerarquía visual Wood.
4. Comprobar accesibilidad, overlays y ultrawide.
5. Añadir baseline visual antes de retirar estilos modernos de esa superficie.
