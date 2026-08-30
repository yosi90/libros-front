# Checklist - Restauración Wood y cliente móvil Angular/Capacitor

> Estado: pendiente. Matriz asociada a `docs/roadmaps/common/ROADMAP_ACTIVO_restauracion-wood-y-cliente-movil-angular-capacitor.md`. Absorbe todos los checks incompletos de `[finalizado][adaptacion-responsive-multidispositivo].md`; la infraestructura verde anterior se reutiliza, pero no acredita esta interfaz ni la APK.

## Puertas por hito

- [x] Cada hito completado modifica su checklist y conserva build, unitarias y smoke focalizado proporcionales al riesgo.
- [x] La feature flag Mobile permanece desactivada en producción hasta H12; H6 solo expone su laboratorio en host local no nativo.
- [x] Ningún artefacto o evidencia web de H12 contiene credenciales, tokens, cookies, códigos telefónicos, keystore o contraseñas; la campaña `33274806877` superó el escaneo sanitizado.
- [ ] Los defectos se registran con severidad y evidencia sanitizada; H15 termina sin críticos o altos abiertos.

## Contrato de presentación

- [x] `320-599px` instancia únicamente Mobile compacta en la matriz local y en Hosting QA.
- [x] `600-1050px` instancia únicamente Mobile medium en la matriz local y en Hosting QA.
- [x] `1051px` y superiores instancian únicamente Wood en la matriz local hasta 3440px.
- [x] Capacitor fuerza `native-mobile`; queda demostrado en el Honor Magic V3 desplegado y no depende del ancho físico del panel.
- [x] No se usa user-agent para decidir presentación; el contrato consume media queries y plataforma Capacitor.
- [ ] Wood y Mobile no comparten templates o Sass de layout; solo estado y primitives neutrales aprobadas.
- [ ] Cambiar 1050/1051, orientación o plegado conserva ruta, filtros, scroll, formulario, borrador y selección editable.
- [ ] Solo existe una vista y un conjunto de suscripciones/llamadas por feature.
- [ ] Administración se oculta y su guard rechaza Mobile web y Android.
- [ ] Las rutas canónicas vigentes siguen resolviendo; no reaparecen aliases `add*`, `update*` o chat retirados.

## Wood desktop y ultrawide

- [x] Home y autenticación son fieles al baseline visual anterior.
- [x] Dashboard, biblioteca, catálogo, perfil, seguridad, estadísticas y gestores conservan identidad Wood.
- [x] Comunidad, chat, notificaciones, administración y backup conservan funcionalidad actual.
- [x] Shell de libro, índice, búsqueda, capítulos y entidades recuperan su composición editorial; sus baselines deterministas quedan cubiertos en Chromium.
- [x] Google, teléfono y onboarding están integrados en el shell público Wood; políticas y Cuenta y seguridad conservan contratos y presentación Wood en el área de usuario.
- [ ] 1440x900, 1920x1080 y 2560x1080 no presentan overflow, líneas de lectura excesivas ni paneles estirados.
- [x] Bootstrap no se extiende y los estilos Mobile no alteran la cascada Wood en las superficies restauradas de H2-H4.
- [ ] Overlays Material, foco, teclado y modales mantienen legibilidad y operación.

## Mobile web y PWA

- [x] La identidad base es editorial contemporánea, sin texturas, fondos ilustrados ni selector light/dark; queda fijada en cinco referencias locales H6.
- [x] La base H6 ofrece contraste WCAG AA, foco visible, reduced motion y targets esenciales de al menos 44x44px; Axe queda sin infracciones críticas o serias en las cinco referencias.
- [x] App bar, bottom navigation, rail, sheets, dialogs, formularios, loaders y vacíos comparten tokens/primitives consistentes; la validación de cada uso productivo continuará por vertical.
- [ ] 360x800, 390x844, 600x960, 800x1280 y 1050x900 funcionan en portrait/landscape sin overflow global.
- [ ] Safe areas y teclado virtual no tapan navegación, acciones ni compositores.
- [ ] PWA instala, actualiza por acción explícita y no cachea API, imágenes privadas, tokens o datos de cuenta. El artefacto QA y sus contratos pasan; un shell antiguo del Honor detectó y aplicó la versión alojada mediante la acción explícita, y las futuras comprobaciones se solicitan al arrancar. Falta validar instalación y una segunda actualización con el nuevo ciclo ya activo.
- [ ] Sin red muestra el shell explicativo y no presenta mutaciones como guardadas.
- [x] El artefacto, Hosting QA y Chrome físico confirman que Angular Service Worker, handler Firebase y Firebase Messaging conservan scopes separados.
- [x] El Honor Magic V3 real selecciona Mobile medium abierto (718x652 CSS px) y Mobile compact plegado (353x703 CSS px), sin overflow ni árbol Wood coexistente.

## Zona pública y autenticación

- [ ] Home, login, registro, onboarding, recuperación, reset y verificación son operables en Wood y Mobile.
- [ ] Autofill, gestores de contraseña, labels, errores y teclado virtual no rompen formularios.
- [ ] Access JWT, custom token e ID tokens no aparecen en Web Storage, logs, trazas o artefactos.
- [ ] Refresh/CSRF restaura sesión tras recarga; red `0`/503 no fuerza logout y un 401 revocado sí lo hace.
- [ ] Renovaciones simultáneas entre pestañas no provocan replay y cada petición se reintenta como máximo una vez.
- [ ] Guards esperan inicialización y no muestran rutas privadas/públicas antes de tiempo.
- [ ] Password, Google y teléfono cubren alta permitida, login, onboarding, vinculación, reautenticación y errores.
- [ ] Cancelar popup/flujo nativo libera el loader y permite reintentar sin recargar.
- [ ] Google con correo distinto exige confirmación explícita y conserva la misma cuenta SQL.
- [ ] Teléfono ejecuta preflight, conserva intento/código solo durante el flujo y no registra ni actúa como MFA.
- [ ] Cuenta y seguridad lista métodos/sesiones, impide retirar el último recuperable y refleja revocaciones.
- [ ] Logout limpia Firebase, sockets, presencia, push y stores sin estados parciales.
- [ ] El UID canónico de aplicación es siempre `libros:<id_usuario>`.

## Recorridos de producto

- [ ] Biblioteca conserva búsqueda, filtros, disponibilidad, scroll y apertura de libro.
- [ ] Catálogo conserva detalle, colección, puntuación, reseña y peticiones.
- [ ] Autores, universos, sagas, antologías y libros permiten CRUD completo, filtros, paginación e imágenes.
- [ ] Las altas actualizan índices y listados sin recarga manual.
- [ ] Perfil, políticas, notificaciones, seguridad y estadísticas funcionan en ambas presentaciones.
- [ ] Libro permite crear partes, capítulos e interludios y mantiene su índice actualizado.
- [ ] Capítulo nuevo con escena aceptable sin personajes se guarda; uno existente aplica validación estricta.
- [ ] Autosave termina o bloquea navegación antes de abandonar una ruta.
- [ ] Página inicial/final se sincronizan en blur.
- [ ] Keywords usan debounce y permiten espacios/puntuación posteriores.
- [ ] RTF conserva la selección al usar overlays y toolbars.
- [ ] Personajes se asignan sin drag, quedan alfabéticos y el cambio narrativo de nombre conserva apodo.
- [ ] Organizaciones, eventos, localizaciones, conceptos, citas, relaciones y entradas tienen CRUD completo.
- [ ] Comunidad conserva navegación, relaciones, actividad, perfiles y clubes.
- [ ] Chat usa una columna en compact, maestro-detalle en medium y no duplica mensajes/realtime.
- [ ] Notificaciones no tapan navegación ni acciones esenciales.
- [ ] Backup desktop confirma, evita duplicados y no filtra datos en UI, URL, logs o evidencia.

## Spike e integración Android

- [x] La APK QA compila, se instala y renderiza Angular en el Android físico mediante depuración inalámbrica; el smoke CDP queda automatizado y sanitizado.
- [x] Los flavors `es.yosiftware.libros.qa` y `es.yosiftware.libros` tienen manifiestos, hosts, bundle web y source sets Firebase separados; producción permanece cerrada hasta registrar su huella release en H14 y nunca reutiliza la configuración QA.
- [x] La cookie refresh permanece opaca y se restaura de forma segura tras cerrar/reabrir la app.
- [x] CSRF se conserva solo en memoria y se recupera sin exponer refresh.
- [x] El adaptador nativo obtiene pruebas Firebase para password, Google y teléfono y las intercambia con la misma API; los tres métodos pasaron en el Android físico.
- [x] Google nativo intercambia el ID token, completa onboarding y restaura la sesión después de matar el proceso.
- [x] Custom token, realtime y revocación usan el UID canónico.
- [x] Custom token, UID canónico, publicación de presencia y conexión Realtime Database funcionan en el Android físico.
- [x] Google abre selector nativo y la cancelación devuelve control a la app.
- [x] Teléfono usa preflight y consume solo el número/código ficticios autorizados, sin SMS real.
- [x] Push registra y rota el dispositivo Android, respeta preferencias y recibió una entrega FCM real de QA en segundo plano.
- [x] Push registra/rota/elimina el token del dispositivo y resuelve la apertura por el ID de una notificación persistida, sin confiar en rutas arbitrarias del payload FCM; recepción y revocación físicas más navegación focal automatizada quedan acreditadas.
- [x] App Links abren reset/verificación mediante intents implícitos con el dominio Android verificado y conservan fallback web alojado.
- [x] Los intent filters QA/producción están separados y un intent QA dirigido al paquete abre el handler Angular correcto.
- [x] Botón Atrás y background/foreground respetan overlays, historial y salida; la APK física conservó `/dashboard/books` y la sesión tras segundo plano, salida y reapertura.
- [x] La red nativa alimenta el estado offline existente y fuerza recuperación realtime al reanudar; queda cubierta por pruebas unitarias y se repetirá físicamente en H15 sin cortar la depuración inalámbrica durante este hito.
- [x] Destinos HTTP(S), archivos e imágenes web se abren mediante el navegador del sistema en Android; esquemas inseguros se rechazan. Splash, iconos, teclado redimensionable y safe areas usan los recursos y contratos nativos vigentes.
- [x] Android no permite navegación administrativa: el guard devolvió físicamente `/dashboard/adminpanel` a `/dashboard/books`. El sello de entorno y los source sets impiden producir con bundle o Firebase QA; secretos, APK, configuración Firebase y keystores siguen ignorados.
- [x] El transporte opaco de sesión superó el spike y la comprobación física de H13, por lo que no se necesita petición backend alternativa ni se debilitan las cookies web.

## Firma, actualización y distribución

- [x] Keystore y contraseñas están fuera del repo, en GitHub secrets y con copias offline confirmadas por el propietario en dos discos distintos (`D:` y `E:`).
- [x] QA y producción generan APK release reproducibles con `versionCode` parametrizado; el workflow exige entero positivo y valida monotonía antes de publicar.
- [ ] GitHub Release publica APK universal, SHA-256 y notas de cambios. El workflow y un artefacto productivo interno están verificados; la primera publicación permanece bloqueada hasta que H15 sea verde.
- [x] La app productiva consulta una release pública sin token una sola vez por arranque y no bloquea ni reintenta si falla la comprobación; QA y web no consultan.
- [x] Una versión nueva muestra un aviso deduplicado y abre la APK alojada en GitHub bajo acción explícita; exige checksum adjunto y nunca descarga ni instala silenciosamente.
- [ ] Instalar una versión nueva encima de la anterior conserva datos válidos y sesión cuando el contrato lo permite.

## Hito 15 - Campaña integral heredada

- [ ] `npm audit --audit-level=low`, `npm run api:lint`, controles QA, build producción/QA y unitarias con cobertura pasan.
- [ ] Playwright Chromium/Firefox cubre Wood 1440/1920/2560 y Mobile 360/390/600/800/1050/1051.
- [ ] WebKit permanece en smoke donde aporte señal; PWA/Service Worker se valida en Chromium.
- [ ] Axe, teclado, foco, contraste, modales y reduced motion pasan con criterio WCAG 2.2 AA pragmático.
- [ ] Seguridad cubre autorización, IDOR, XSS, storage, CORS/CSP, 429 y errores recuperables.
- [ ] Realtime cubre duplicados, desorden, desconexión, reconexión y reconciliación REST.
- [ ] Campaña QA real usa lease, reset, cleanup, escaneo de secretos y restaura baseline.
- [ ] Emulador Android cubre instalación limpia, actualización y recorridos no dependientes de hardware.
- [ ] Android físico cubre Google, un teléfono autorizado, push, app links, teclado, orientación y background.
- [ ] Evidencias visuales y de rendimiento se revisan y quedan sanitizadas.
- [ ] CI, preview/producción, campaña manual y nocturna quedan estables y sin jobs obsoletos en cola.
- [x] Mobile se activa en producción tras puerta verde y visto bueno explícito del propietario; la publicación de la APK continúa reservada para H14/H15.
