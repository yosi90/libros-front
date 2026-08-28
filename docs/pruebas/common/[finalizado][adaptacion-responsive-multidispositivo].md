# Checklist histórica - Adaptación responsive multidispositivo y temas modernos

> Estado: finalizada por traslado el 26 de agosto de 2026. Las casillas incompletas no se consideran superadas: se conservan como evidencia del punto de corte y su alcance se absorbe en `docs/pruebas/common/[pendiente][restauracion-wood-y-cliente-movil-angular-capacitor].md`. El roadmap asociado es `docs/roadmaps/common/ROADMAP_FINALIZADO_adaptacion-responsive-multidispositivo.md`.

La automatización construida continúa siendo válida como infraestructura, pero las expectativas de light/dark y del shell compartido quedan retiradas. La aceptación integral se ejecutará sobre Wood restaurado, Mobile y Android al final del nuevo roadmap.

## Orden de ejecución

- [x] Inventariar cobertura automática y clasificar cada check como unitario, navegador local, integración QA o inspección manual en `docs/roadmaps/common/QA_HITO_15_COVERAGE.md`.
- [x] Estabilizar la matriz Playwright y los gates antes de ampliar recorridos.
- [x] Ejecutar primero pruebas sin mutación; las mutaciones reales requieren lease, reset y cleanup QA.
- [ ] Registrar defectos con severidad y evidencia sanitizada; no cerrar el hito con críticos o altos abiertos.

## Contrato cerrado en el Hito 0

- [x] Guía visual actualizada con modos, temas, capacidades, targets táctiles y política de CSS/librerías.
- [x] Contrato de rutas, shells, scroll y recorridos documentado en `docs/roadmaps/common/CONTRATO_ADAPTACION_RESPONSIVE.md`.
- [x] Matriz futura y recorridos que deberá automatizar el último hito inventariados sin ejecutar una campaña anticipada.

## Matriz contractual

- [x] 320x568 compact mínimo.
- [x] 360x800 teléfono Android compacto.
- [x] 390x844 teléfono de referencia.
- [x] 520x800 plegable/compact ancho.
- [x] 768x1024 tablet portrait.
- [x] 1024x768 tablet landscape.
- [x] 1440x900 desktop.
- [x] 1920x1080 desktop wide.
- [x] 2560x1080 ultrawide 21:9.
- [x] 3440x1440 ultrawide de referencia.
- [x] Orientación portrait y landscape donde corresponda.
- [x] Chromium, Firefox y WebKit.
- [ ] Touch, teclado y ratón según capacidad.
- [ ] Teclado virtual y safe areas inspeccionados.

## Fundamentos y navegación

- [x] No existe overflow horizontal global en ningún viewport contractual.
- [ ] Existe un único propietario de scroll por shell/pantalla.
- [x] Rotar o redimensionar conserva ruta y formulario público; la selección compleja se valida en su prueba unitaria de editor.
- [ ] Bottom navigation compacta, navigation rail medium y sidebar desktop alcanzan todos sus destinos permitidos.
- [ ] El índice del libro es superpuesto en compact, plegable en medium y persistente en desktop.
- [ ] Wide/ultrawide aprovecha paneles o columnas útiles sin estirar lectura, formularios o separación entre acciones relacionadas.
- [x] Las rutas heredadas de `add*`, `update*` y chat no aparecen en enlaces o navegaciones internas.
- [ ] Las rutas desconocidas autenticadas vuelven de forma segura a biblioteca.
- [ ] Administración no aparece ni admite navegación directa en compact/medium o sin puntero preciso.
- [ ] Cambios pendientes y autosave se resuelven antes de abandonar una ruta.

## Temas y CSS

- [x] Light y dark comparten geometría y no descargan texturas de wood.
- [ ] Wood solo se ofrece y aplica en escritorio.
- [x] Una preferencia wood aplica dark fuera de escritorio y se restaura al volver.
- [ ] Menús, selects, dialogs, tooltips, bottom sheets y overlays respetan el tema.
- [ ] Contraste AA y foco visible en light/dark.
- [ ] `prefers-reduced-motion` reduce o elimina animaciones no esenciales.
- [x] Ningún componente o tema nuevo incorpora clases/utilidades Bootstrap.
- [ ] Cualquier librería CSS/animación añadida tiene decisión técnica, budget y pruebas de accesibilidad.

## Recorridos autenticados

- [ ] Biblioteca: buscar, filtrar, expandir universo, abrir libro y actualizar estado.
- [ ] Catálogo: buscar, abrir detalle, añadir a colección, puntuar y reseñar.
- [ ] Gestores: crear, editar y eliminar autor, universo, saga, antología y libro.
- [ ] Las altas actualizan índices y listas sin recarga manual.
- [ ] Libro: abrir/cerrar índice, crear parte, capítulo e interludio y navegar por la estructura.
- [ ] Capítulo nuevo con escena aceptable y sin personajes se guarda.
- [ ] Capítulo existente valida escenas modificadas.
- [ ] Cambiar de entidad guarda las modificaciones pendientes.
- [ ] Página inicial/final se sincronizan en blur.
- [ ] Keywords permiten continuar con espacios y puntuación tras el debounce.
- [ ] Editor RTF conserva selección al aplicar controles con ventana/panel propio.
- [ ] Asignar personajes funciona sin drag and drop y mantiene orden alfabético.
- [ ] Crear personaje funciona; renombrarlo permite conservar el nombre anterior como apodo.
- [ ] CRUD completo de organizaciones, eventos, localizaciones, conceptos y citas.
- [ ] Perfil, preferencias y estadísticas funcionan sin desbordamiento.
- [ ] Comunidad mantiene subrutas, filtros y posición al volver.
- [ ] Chat usa página completa fuera de escritorio y funciona con teclado virtual.
- [ ] Notificaciones y avisos realtime no tapan navegación ni controles esenciales.
- [ ] Administración solo es accesible con rol permitido, `desktop` y puntero preciso.
- [ ] El backup administrativo confirma la operación, evita duplicados, representa fielmente éxito/error y no expone datos sensibles en UI, URL, logs o evidencias.

## Zona pública

- [ ] Home y todas las rutas auth funcionan desde 320 px.
- [ ] Autofill, gestores de contraseña y teclado virtual no rompen formularios.
- [ ] El selector de tema público persiste tras iniciar sesión.
- [ ] Guards y enlaces de recuperación/verificación conservan su comportamiento.

## PWA y conexión

- [ ] Manifest, iconos, instalación y actualización validados.
- [ ] Angular Service Worker y Firebase Messaging conviven sin interferencias.
- [ ] No se cachean respuestas privadas de forma insegura.
- [ ] Estado offline visible y acciones no disponibles explicadas.
- [ ] Ninguna escritura se presenta como sincronizada mientras permanezca local.
- [ ] Preferencias remotas resuelven correctamente conflictos con el valor local.

## Autenticación Firebase y preferencias

### Puerta contractual

- [x] Backend aclara o corrige el consumidor del ticket `link_required` y publica una unión `/auth/session` estrictamente discriminada.
- [x] Refresh/CSRF dispone de una topología QA same-site que no exige leer cookies ni permitir cookies de terceros; la campaña alojada `32734302486` confirma su restauración en Chromium y Firefox.
- [x] `AuthDomain`, redirect URI y dominios autorizados cubren Hosting QA y los orígenes locales declarados.
- [x] Añadir contraseña a cuentas de proveedor queda declarado fuera de contrato.
- [x] Google y teléfono disponen de identidades, secrets y cleanup QA deterministas sin cuentas personales ni SMS reales.

### Sesión y almacenamiento

- [ ] Access JWT, custom token e ID tokens no aparecen en `localStorage`, `sessionStorage`, logs, trazas ni artefactos.
- [ ] Refresh opaco/CSRF restaura la sesión tras recarga y reapertura; un 503 o estado de red `0` no fuerza logout.
- [ ] Renovaciones simultáneas en una y varias pestañas no provocan replay; cada petición se reintenta como máximo una vez.
- [ ] Guards esperan la inicialización y las rutas públicas/privadas no parpadean ni redirigen antes de tiempo.
- [ ] Logout actual, revocación individual/global y eventos realtime limpian Firebase, sockets, presencia, push y stores correspondientes.
- [ ] El UID de la instancia Firebase principal es siempre `libros:<id_usuario>` y nunca una identidad transitoria de proveedor.

### Contraseña, correo y onboarding

- [ ] Alta password completa onboarding, política y alias sin sesión local hasta verificar el correo.
- [ ] Login importado no añade un máximo frontend incompatible; altas y cambios exigen la política 8–20 completa.
- [ ] Verificación, reset, cambio y recuperación de correo vuelven a rutas propias en español desde el handler administrado de Firebase aceptado temporalmente; códigos inválidos/caducados tienen salida segura.
- [ ] Recuperación no revela si una cuenta existe.

### Google y teléfono

- [ ] Google funciona mediante popup en desktop y redirect en compact/medium/PWA, con fallback y cancelación accesibles.
- [ ] Google nuevo completa onboarding; Google vinculado entra; email local coincidente exige vínculo explícito sin duplicar usuario.
- [ ] Teléfono aparece como opción secundaria, exige preflight E.164 antes de reCAPTCHA/SMS y conserva `IntentoId` solo en memoria.
- [ ] Teléfono ya vinculado puede entrar; uno nuevo no registra cuenta ni se presenta como MFA.
- [ ] Región inválida, rate limit, OTP erróneo/caducado y proveedor deshabilitado no consumen SMS adicionales automáticamente.

### Cuenta, dispositivos y preferencias

- [ ] `/dashboard/account-security` lista métodos y sesiones y permite reautenticar, vincular, desvincular y revocar con confirmación accesible.
- [ ] No puede retirarse el último método recuperable y revocar la sesión actual produce logout coherente.
- [ ] El remoto virtual migra una elección local explícita; sin clave local se adopta `light`; un remoto persistido prevalece.
- [ ] Cambios de tema son inmediatos, reanudan una intención pendiente segura, resuelven `409` sin retry ciego y aplican versiones realtime superiores.
- [ ] `wood` se conserva como solicitado aunque compact/medium aplique `dark` efectivo.

### Aceptación focalizada del Hito 13

- [x] Chromium y Firefox completan los cinco perfiles backend con lease, cleanup, escaneo de secretos y restauración final a `baseline` en la campaña `32734302486`.
- [x] Los recorridos de autenticación son operables a 390, 800 y 1440 px sin overflow, pérdida de foco ni controles táctiles pequeños; la campaña cubre 800/1440 y el smoke alojado posterior confirma 390/520 sin overflow.
- [ ] El smoke OAuth real de Google pasa con la cuenta QA dedicada sin persistir credenciales ni 2FA.
- [x] La evidencia y el mensaje de visto bueno quedan preparados, pero producción no se autoriza sin confirmación explícita del propietario.

## Cierre

- [x] OpenAPI sincronizado pasa Redocly sin los avisos acordados; cualquier migración de rutas está aplicada antes de ejecutar scripts de control, build producción/QA y unitarias con cobertura.
- [ ] E2E Chromium, Firefox y WebKit pasan con fixtures deterministas y cleanup seguro.
- [ ] WCAG 2.2 AA pragmático, teclado, foco, contraste y modales verificados.
- [ ] Seguridad: autorización, IDOR, XSS, tokens/storage, CORS/CSP, 429 y errores recuperables verificados.
- [ ] Realtime: deduplicación, reordenamiento, desconexión, reconexión y reconciliación REST verificados sin repetir la aceptación histórica 5/5.
- [ ] Evidencias visuales compact/medium/desktop/wide/ultrawide revisadas.
- [ ] Baseline frío/caliente de recorridos críticos y budgets aceptados.
- [ ] Gates CI, preview/producción y nocturna estabilizados.
- [ ] No quedan defectos críticos o altos abiertos del alcance.
- [ ] `docs/GUIA_ESTILOS.md`, roadmaps vivos e índice global reflejan el estado final.
