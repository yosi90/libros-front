# Contrato histórico de adaptación responsive

> Retirado como dirección activa el 26 de agosto de 2026. Documenta el shell light/dark construido en el roadmap anterior y se conserva para trazabilidad, pero quedó sustituido por `ROADMAP_FINALIZADO_restauracion-wood-y-cliente-movil-angular-capacitor.md` y la nueva `docs/GUIA_ESTILOS.md`. Sus rutas canónicas y requisitos funcionales continúan vigentes; sus decisiones de tema, shell y HTML/Sass compartido no.

## Modos contractuales

| Modo | Ancho | Shell moderno light/dark | Libro moderno | Shell wood |
|---|---:|---|---|---|
| `compact` | 320-599 CSS px | App bar y navegación inferior | Índice superpuesto, acciones agrupadas | No se renderiza; fallback efectivo a dark |
| `medium` | 600-1050 CSS px | Navigation rail | Índice plegable; doble panel condicionado al contenedor | No se renderiza; fallback efectivo a dark |
| `desktop` | >1050 CSS px | Sidebar moderna con identidad y etiquetas | Índice persistente y toolbar completa | Composición editorial existente, si existe puntero preciso |

Dentro de `desktop`, `wide` (desde 1600px) y `ultrawide` (desde 2560px) permiten más columnas o paneles simultáneos sin crear otra navegación. Los bloques de lectura y formularios conservan anchos máximos; el espacio extra no aumenta indiscriminadamente la longitud de línea ni separa acciones relacionadas.

El ancho no es una identificación de dispositivo. Altura, orientación, hover y precisión de puntero pueden reducir capacidades. Administración requiere `desktop` y puntero preciso; tablet y móvil no reciben navegación administrativa.

## Contrato de familias de shell

La aplicación no se divide en dos frontends. Rutas, contenido enrutado, estado, permisos, autoguardado, realtime y servicios son únicos. La separación afecta al encuadre visual y permite componentes o markup propios para navegación, cabeceras y paneles:

- `wood desktop`: conserva la composición editorial actual y no constituye la base responsive.
- `modern light/dark`: es la composición funcional que cubre compact, medium, desktop, wide y ultrawide.

La preferencia `wood` se conserva cuando se abandona escritorio, pero su tema efectivo pasa a `dark` y se renderiza el shell moderno. Al regresar a escritorio se restaura la composición wood sin cambiar la ruta activa. Nunca se mantienen dos outlets o dos instancias de una pantalla para lograr esta separación.

El contrato runtime vive en `AdaptiveLayoutService`. Además del modo expone ancho de layout, altura visual, altura de layout, inset estimado del teclado virtual, orientación, hover, puntero coarse/fine, altura corta, reduced motion y capacidad administrativa desktop. Los mismos valores se reflejan como atributos y custom properties en `<html>` para CSS y overlays.

## Rutas canónicas

### Públicas

| Función | Ruta |
|---|---|
| Inicio | `/home` |
| Inicio de sesión | `/login` |
| Registro | `/register` |
| Recuperar contraseña | `/forgot-password` |
| Restablecer contraseña | `/reset-password` |
| Verificar correo | `/verify-email` |
| Verificación pendiente | `/verify-email-pending` |

### Shell autenticado

| Función | Ruta canónica | Capacidades |
|---|---|---|
| Biblioteca | `/dashboard/books` | Autenticado |
| Catálogo | `/dashboard/catalog` | Autenticado |
| Perfil | `/dashboard/profile` | Autenticado |
| Estadísticas | `/dashboard/statistics` | Autenticado |
| Comunidad | `/dashboard/community/summary` | Autenticado; capacidades sociales según subruta |
| Personas | `/dashboard/community/people` | Feed activo |
| Actividad | `/dashboard/community/activity` | Feed activo |
| Amistades | `/dashboard/community/friendships` | Feed activo |
| Bloqueos | `/dashboard/community/blocks` | Feed activo |
| Clubes | `/dashboard/community/clubs` | Clubes activos |
| Mensajes | `/dashboard/community/messages` | Chat activo |
| Conversación | `/dashboard/community/messages/:id` | Chat activo |
| Administración | `/dashboard/adminpanel` | Rol permitido, `desktop` y puntero preciso |
| Autores | `/dashboard/authors`, `/dashboard/authors/new` y `/dashboard/authors/:id` | Autenticado |
| Universos | `/dashboard/universes`, `/dashboard/universes/new` y `/dashboard/universes/:id` | Autenticado |
| Sagas | `/dashboard/sagas`, `/dashboard/sagas/new` y `/dashboard/sagas/:id` | Autenticado |
| Antologías | `/dashboard/anthologies`, `/dashboard/anthologies/new` y `/dashboard/anthologies/:id` | Autenticado |
| Gestión de libros | `/dashboard/books/manage`, `/dashboard/books/manage/new` y `/dashboard/books/manage/:id` | Autenticado |

Los aliases `addBook`, `updateBook/:id`, `addAntology`, `updateAntology/:id`, `addAuthor`, `updateAuthor/:id`, `addUniverse`, `updateUniverse/:id`, `addSaga`, `updateSaga/:id`, `chat` y `chat/:id` se retiraron en el Hito 1 después de migrar sus consumidores internos.

Los flujos de lista a alta/edición conservan back real mediante subrutas explícitas `/new` y `/:id`; no se reutilizan los aliases anteriores. La ruta base del gestor representa el listado con el formulario inicial vacío en composiciones que lo muestran simultáneamente.

### Shell de libro

Base: `/book/:id`.

| Función | Ruta hija actual | Observación contractual |
|---|---|---|
| Estadísticas | `statistics` | Destino inicial actual |
| Búsqueda avanzada | `search` | Acción contextual del libro |
| Crear capítulo | `chapter` | Protegido por cambios pendientes |
| Editar capítulo | `chapter/:cpid` | Protegido por cambios pendientes |
| Editar capítulo de interludio | `interlude_chapter/:cpid` | Protegido por cambios pendientes |
| Crear capítulo en interludio | `interlude/:iid/chapter` | Protegido por cambios pendientes |
| Personajes | `characters` | Listado/gestión compartida |
| Crear personaje | `character` | Gestión compartida |
| Ficha de personaje | `character/:crid` | Ficha especializada |
| Organizaciones | `organizations` / `organization` | Listado / creación-edición |
| Eventos | `events` / `event` | Listado / creación-edición |
| Localizaciones | `locations` / `location` | Listado / creación-edición |
| Conceptos | `concepts` / `concept` | Listado / creación-edición |
| Citas | `quotes` / `quote` | Listado / creación-edición |

La posible normalización futura de singular/plural se decide en el Hito 9 con migración explícita. El Hito 1 solo elimina aliases dashboard ya obsoletos y no cambia rutas narrativas funcionales sin cobertura.

## Propietarios de scroll

| Superficie | `compact`/`medium` | `desktop` |
|---|---|---|
| Pública | Documento o página pública; nunca dos contenedores verticales anidados | Documento/página según composición |
| Dashboard | Contenido de la ruta bajo app bar/rail | Panel principal del router; sidebar fija |
| Libro | Contenido de la ruta; índice overlay con scroll propio cuando está abierto | `book-content`; índice persistente con scroll propio |
| Modal compacto | Modal a pantalla completa, foco atrapado y scroll interno único | Panel modal acotado con scroll interno |
| Chat | Página de conversación y compositor protegido del teclado | Página o ventana flotante solo si cumple capacidad |

## Recorridos de regresión obligatorios

1. Autenticación, restauración de sesión y guards.
2. Biblioteca: buscar, filtrar, abrir libro y modificar estado.
3. Catálogo: detalle, colección, puntuación y reseña.
4. CRUD de autor, universo, saga, antología y libro con refresco inmediato.
5. Libro: índice, parte, capítulo, interludio, búsqueda y estadísticas.
6. Capítulo nuevo con escena aceptable sin personajes.
7. Edición de escena con autosave al navegar a otra entidad.
8. Sincronización de páginas y selección de textos por defecto.
9. Keywords con debounce, espacios y puntuación posteriores.
10. RTF conservando selección al abrir controles propios.
11. Asignación alfabética de personajes con alternativa al drag and drop.
12. CRUD narrativo, creación de personaje y conservación del nombre anterior como apodo.
13. Perfil, comunidad, chat, notificaciones y realtime.
14. Administración por rol únicamente en escritorio capaz.

## Estrategia de evidencia

- El smoke público existente cubre Home/Login a 390x844 y 520x800 sin overflow horizontal.
- La campaña QA ya genera storage states por rol y resuelve IDs mediante aliases, sin versionar contraseñas.
- La actualización y ejecución de pruebas responsive queda concentrada en el último hito del roadmap, después de completar producto, PWA y Google Sign-In.
- La matriz final añade 1920x1080, 2560x1080 y 3440x1440 para desktop, wide y ultrawide.
- La aceptación contractual QA ya cerrada 5/5 se conserva como evidencia histórica y no se repite sin una causa nueva; el último hito prueba el producto resultante y absorbe los pendientes del antiguo roadmap QA integral.
