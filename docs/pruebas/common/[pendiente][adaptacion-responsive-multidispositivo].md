# Checklist - Adaptación responsive multidispositivo y temas modernos

> Estado: pendiente. Evidencia asociada a `docs/roadmaps/common/ROADMAP_ACTIVO_adaptacion-responsive-multidispositivo.md`. Toda actualización y ejecución formal de QA se concentra en el último hito; esta checklist absorbe los pendientes del roadmap QA integral finalizado documentalmente.

## Contrato cerrado en el Hito 0

- [x] Guía visual actualizada con modos, temas, capacidades, targets táctiles y política de CSS/librerías.
- [x] Contrato de rutas, shells, scroll y recorridos documentado en `docs/roadmaps/common/CONTRATO_ADAPTACION_RESPONSIVE.md`.
- [x] Matriz futura y recorridos que deberá automatizar el último hito inventariados sin ejecutar una campaña anticipada.

## Matriz contractual

- [ ] 320x568 compact mínimo.
- [ ] 360x800 teléfono Android compacto.
- [ ] 390x844 teléfono de referencia.
- [ ] 520x800 plegable/compact ancho.
- [ ] 768x1024 tablet portrait.
- [ ] 1024x768 tablet landscape.
- [ ] 1440x900 desktop.
- [ ] 1920x1080 desktop wide.
- [ ] 2560x1080 ultrawide 21:9.
- [ ] 3440x1440 ultrawide de referencia.
- [ ] Orientación portrait y landscape donde corresponda.
- [ ] Chromium, Firefox y WebKit.
- [ ] Touch, teclado y ratón según capacidad.
- [ ] Teclado virtual y safe areas inspeccionados.

## Fundamentos y navegación

- [ ] No existe overflow horizontal global en ningún viewport contractual.
- [ ] Existe un único propietario de scroll por shell/pantalla.
- [ ] Rotar o redimensionar conserva ruta, formulario y selección relevante.
- [ ] Bottom navigation compacta, navigation rail medium y sidebar desktop alcanzan todos sus destinos permitidos.
- [ ] El índice del libro es superpuesto en compact, plegable en medium y persistente en desktop.
- [ ] Wide/ultrawide aprovecha paneles o columnas útiles sin estirar lectura, formularios o separación entre acciones relacionadas.
- [ ] Las rutas heredadas de `add*`, `update*` y chat no aparecen en enlaces o navegaciones internas.
- [ ] Las rutas desconocidas autenticadas vuelven de forma segura a biblioteca.
- [ ] Administración no aparece ni admite navegación directa en compact/medium o sin puntero preciso.
- [ ] Cambios pendientes y autosave se resuelven antes de abandonar una ruta.

## Temas y CSS

- [ ] Light y dark comparten geometría y no descargan texturas de wood.
- [ ] Wood solo se ofrece y aplica en escritorio.
- [ ] Una preferencia wood aplica dark fuera de escritorio y se restaura al volver.
- [ ] Menús, selects, dialogs, tooltips, bottom sheets y overlays respetan el tema.
- [ ] Contraste AA y foco visible en light/dark.
- [ ] `prefers-reduced-motion` reduce o elimina animaciones no esenciales.
- [ ] Ningún componente o tema nuevo incorpora clases/utilidades Bootstrap.
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

## Google Sign-In con Firebase

- [ ] Login Google correcto en navegador desktop, móvil y modo instalado.
- [ ] Cancelación, popup bloqueado, redirect fallido y proveedor no disponible tienen salida accesible.
- [ ] Email nuevo crea o completa la cuenta según contrato backend.
- [ ] Email local existente exige vinculación explícita y no duplica usuario.
- [ ] Login por credenciales y recuperación siguen disponibles.
- [ ] ID token Firebase se verifica en backend y nunca sustituye silenciosamente el token propio de API.
- [ ] Refresh, persistencia, guards, logout y cuenta deshabilitada funcionan con ambos proveedores.
- [ ] Roles, permisos y `environment.sessionVersion` mantienen su contrato.

## Cierre

- [ ] OpenAPI sincronizado pasa Redocly sin los avisos acordados; cualquier migración de rutas está aplicada antes de ejecutar scripts de control, build producción/QA y unitarias con cobertura.
- [ ] E2E Chromium, Firefox y WebKit pasan con fixtures deterministas y cleanup seguro.
- [ ] WCAG 2.2 AA pragmático, teclado, foco, contraste y modales verificados.
- [ ] Seguridad: autorización, IDOR, XSS, tokens/storage, CORS/CSP, 429 y errores recuperables verificados.
- [ ] Realtime: deduplicación, reordenamiento, desconexión, reconexión y reconciliación REST verificados sin repetir la aceptación histórica 5/5.
- [ ] Evidencias visuales compact/medium/desktop/wide/ultrawide revisadas.
- [ ] Baseline frío/caliente de recorridos críticos y budgets aceptados.
- [ ] Gates CI, preview/producción y nocturna estabilizados.
- [ ] No quedan defectos críticos o altos abiertos del alcance.
- [ ] `docs/GUIA_ESTILOS.md`, roadmaps vivos e índice global reflejan el estado final.
