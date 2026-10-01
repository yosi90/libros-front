# Pruebas pendientes — Ediciones, ISBN y avisos de agente

Roadmap: `docs/roadmaps/api-contract/ROADMAP_ACTIVO_ediciones-isbn-y-avisos-agente.md`.

## Contrato y datos

Verificación 1/10/2026: `GET /verify` de QA y producción confirma `5535254edce43661716927ecc1c569df0b2bdfe4`, `SourceDirty: false` y `EstadoGeneral: healthy`; los entornos se identifican como `qa` y `produccion` respectivamente. Esta comprobación es de publicación y salud; no sustituye las escrituras autenticadas de aceptación.

- [x] `/verify` confirma QA antes de probar las rutas nuevas; QA y producción publican `c450be4159b19f3005e364aad40c0800822f2fb2` y QA declara `Entorno: qa` (30/9/2026).
- [ ] Libro y antología con una edición, varias, ninguna identificada por ISBN y edición con ISBN `null`.
- [ ] Edición principal: fecha más reciente; fecha desconocida después; ID menor para desempate.
- [ ] Edición ómnibus vinculada a varias obras; posesión global visible desde cada ficha.
- [x] Prueba local: al marcar una edición compartida, las otras obras visibles de Catálogo actualizan su indicador por ID.
- [ ] `GET` de ediciones y `MiColeccion.EdicionesIds` concuerdan para libro y antología.

## Colección y presentación

Lectura física 1/10/2026: `1.0.87-qa` / código 88 instalada con firma de distribución y sesión conservada. En Honor medium (718×781 CSS), libro y antología reales muestran una edición principal sin posesión y «Tengo esta edición»; capturas inspeccionadas, sin overflow. El detalle real del libro incluye `Ediciones` y `MiColeccion.EdicionesIds`. No se realizaron escrituras ni reset: siguen pendientes varias ediciones, ISBN nulo, vínculo compartido y persistencia real del historial dentro de una campaña con lease.

Avance 1/10/2026 (Biblioteca): 20 pruebas unitarias de navegación y 8 casos Playwright Chromium/Firefox en Web escritorio/compacta, Wood y Mobile. Capturas inspeccionadas. Se comprueban apertura por teclado, edición poseída inicial, retirada de la última edición, retorno con la obra «En marcha» y reentrada con la nueva posesión. La API está simulada; esta evidencia no valida persistencia del historial en servidor ni sustituye la QA nativa.

- [x] Prueba local: Biblioteca permite abrir ediciones y regresar sin abrir el lector; al retirar la última edición conserva la tarjeta y el estado de lectura de la respuesta de colección.

Avance 30/9/2026: Catálogo validado con dos ediciones en Web escritorio, Web compacta, Wood y Mobile mediante Playwright Chromium/Firefox (4/4 en cada navegador). Perfil/gestores Web y Wood validados en ambos navegadores (2/2 en cada uno), con capturas inspeccionadas. El gestor Mobile no es una ruta accesible desde el Perfil Mobile actual. Faltan datos reales de QA.

- [ ] La ficha destaca una edición poseída; con varias, respeta el orden de backend; sin ninguna, muestra la principal.
- [ ] Web claro/oscuro, Wood y Mobile/APK permiten recorrer ediciones con portada, ISBN, fecha y marca de posesión correctos.
- [ ] Seleccionar una o varias ediciones envía la lista completa de IDs y añade la obra si faltaba.
- [ ] `PUT` repetido es idempotente; una respuesta nueva reconcilia Catálogo, Biblioteca y detalle.
- [ ] Desmarcar todas las ediciones mantiene la obra en la biblioteca y preserva estado, reseña, puntuación, notas, narrativa y estadísticas.
- [ ] `400 edition_selection_invalid`, `404 edition_work_not_found` y fallo de red muestran `error` sin exponer `debug`; el control de selección se señala si corresponde.

## Peticiones y administración

Avance 1/10/2026 (resolución editorial): ocho pruebas unitarias de moderación/sincronización y doce casos Playwright Chromium/Firefox pasan. Web y Wood seleccionan libro o antología del catálogo correcto, confirman la obra y los participantes, conservan el borrador ante `409 catalog_request_isbn_conflict` y permiten recuperar la aprobación mediante vínculo compartido elegido por administración. Capturas inspeccionadas. La fecha se hereda del payload y no se transmite ISBN, portada ni metadatos nuevos de obra en la modalidad existente. Pendiente contrastar con la transacción real de QA.

- [x] Prueba local: aprobación contra obra existente de ambos tipos; conflicto recuperable; vínculo explícito y confirmación conjunta; un moderador no carga ni envía el vínculo administrativo.

Avance 30/9/2026: pruebas unitarias de alta con ISBN delimitado, rechazo de marcador cero y error del backend asociado a `Payload.ISBN`. Las respuestas repetida y aprobada ofrecen mensajes distintos; la edición aprobada solo se añade tras la acción explícita del lector. Moderación agrupada validada en Web y Wood con Playwright Chromium/Firefox (2/2 por navegador), con capturas inspeccionadas: muestra tres participantes y exige confirmar antes del `PATCH`. Servicio administrativo de ediciones probado con JSON, multipart y vínculo explícito. Pendiente comprobar el flujo real en QA y el límite de cinco activas.

Avance 1/10/2026: Playwright Chromium/Firefox comprueba en Web y Wood el alta inicial sin portada, edición por ID, creación de otra edición, recuperación de `409 edition_isbn_conflict`, portada multipart (`payload` + `image`) y guardado de obra sin ISBN ni fecha. También comprueba el vínculo explícito con `VincularEdicionId`. Tres pruebas unitarias validan dígitos de control ISBN-10/13, prefijos y valores desconocidos. Se conserva el alta atómica de obra y primera edición documentada por backend. Pendiente sesión real de QA y validación de la transacción en servidor.

- [ ] Alta de libro/antología exige ISBN válido y señala `Payload.ISBN`; tipos y acciones restantes mantienen sus reglas.
- [ ] La petición repetida por la misma persona devuelve su ID sin crear una segunda fila; límite de cinco activas.
- [x] Prueba local: contador de cinco activas de todos los tipos, conservación del borrador tras `409 catalog_active_request_limit` y recuperación de una petición repetida con `200`. Validado en Web escritorio/compacta y Wood con Chromium/Firefox.
- [ ] Aprobación automática `201` muestra `EntidadId` y `EdicionId` y ofrece marcar posesión por separado.
- [ ] Lista propia muestra filas individuales; moderación agrupa por `GrupoISBN` y muestra `Participantes`.
- [ ] Moderación resuelve contra obra existente y exige acción explícita de administrador para `VincularEdicionId`.
- [x] Prueba local: editor crea y modifica ediciones sin sobrescribir otras; portada multipart y conflicto de ISBN `409`.
- [ ] Edición compartida avisa antes de cambiar metadatos que afectan a todas las obras vinculadas.
- [x] Prueba local: el vínculo compartido usa una obra y edición seleccionadas, se confirma antes del POST y no exige conocer IDs técnicos.

## Notificapp y cierre

Preparación de campaña sin móvil (1/10/2026): suite real `e2e/editions-contract.integration.spec.ts` registrada, con seis recorridos UI y tres transacciones API (las API no se duplican en Firefox). Typecheck y descubrimiento pasan; ejecución real pendiente, sin contar estas entradas como pruebas superadas. Usar el arnés existente con `QA_RESET_TOKEN`, contraseñas privadas y lease adquirida, y renovar/resetear/liberar en cleanup. No ejecutar el spec directamente sin ese control. Los workflows protegidos de campaña solo aceptan `main`; la candidata de funcionalidad sigue aislada en su rama.

Gates locales 1/10/2026: 636 unitarias Angular, 50 casos Playwright Chromium/Firefox ejecutados juntos, typecheck E2E y lint OpenAPI verdes. Catálogo Web claro añadido y captura inspeccionada. Build nativo QA y 13 pruebas JVM verdes. La candidata debug no se instala encima de la QA de distribución. Se construyó e instaló después la candidata firmada `1.0.87-qa` / código 88 del workflow privado `36872100434`, conservando sesión y datos. Pendientes configuración privada de campaña y aceptación completa con datos reales; ver el Hito 6 del roadmap y `docs/roadmaps/qa/bugs.md`.

- [x] `/plugin-kit/` está ignorado en Git y la credencial de agente reside fuera del repositorio.
- [x] El propietario recibió la prueba y el reenvío manual de la respuesta anterior; el cliente confirmó aceptación y el hook previo de computer-use se restauró.
- [ ] Un aviso `agent_question` y uno `agent_finished` llegan al espacio «Agentes», con texto completo y título del frontend.
- [ ] Un cierre nuevo enviado explícitamente llega una sola vez; el hook `notify` previo sigue funcionando.
- [ ] Build, pruebas relevantes y Playwright Chromium/Firefox pasan en anchos compactos y escritorio; QA nativa valida Mobile/APK.
- [ ] El propietario acepta la experiencia en QA antes de publicar la funcionalidad nueva en producción.

## Validación de vuelta con el móvil (1/10/2026)

La ficha real de libro con ISBN nulo se inspeccionó en Honor desplegado (718×781) y plegado (353×792), en claro: muestra «Edición sin ISBN», conserva el scroll vertical y no tiene overflow horizontal ni marcadores cero. El catálogo observado tiene cuatro libros con ISBN nulo; no contiene varias ediciones ni vínculos compartidos antes de la campaña. Evidencias locales ignoradas en `android/app/build/outputs/qa-evidence/20261001/`.

El propietario ha entregado la configuración privada fuera del repositorio. El runner local adapta `LIBROS_QA_RESET_TOKEN` en memoria, permite únicamente las variables QA necesarias y adquiere/renueva/restaura/libera su lease. Sus 46 pruebas unitarias pasan. La primera campaña real pasó los seis recorridos UI en Chromium/Firefox (claro, oscuro y Wood); falló una precondición de fixture del caso API de historial, no una escritura de ediciones. El cleanup restauró baseline y liberó la lease. El baseline tiene estados sembrados sin relación de biblioteca; el caso prepara ahora biblioteca, puntuación y reseña antes de comprobar su conservación. Resultado de reejecución registrado a continuación.

### Resultado de la campaña real (1/10/2026)

- Seis recorridos UI pasan en Chromium/Firefox: claro, oscuro y Wood, edición poseída inicial y retirada del ejemplar. Esa igualdad de detalle no acredita conservación de reseña/puntuación porque la proyección personal resultó incompleta.
- La aprobación agrupada pasa: dos personas, repetición propia 200, una fila de cola, resolución contra obra existente, fecha heredada, dos historiales aprobados, posesión no asignada y 409 al resolver de nuevo.
- La edición compartida se crea/vincula y su posesión global se refleja desde libro y antología; retirar desde la antología desmarca desde el libro. Falla la comprobación posterior de biblioteca en detalle público.
- El caso de historial falla incluso después de preparar posesión y reseña/puntuación: colección contiene la obra y GET de ediciones confirma posesión; detalle público mantiene EnBiblioteca=false y campos personales nulos. Idempotencia y conservación completa siguen pendientes porque falla la precondición de esa proyección.
- Discrepancia reproducida y petición nueva: `docs/peticiones/corregir-proyeccion-mi-coleccion-detalle-publico-ediciones.md`. No se cambia el contrato recibido ni se oculta la diferencia en frontend.
- Todas las campañas ejecutan cleanup. Verificación final: QA ready, baseline, sin lease activa; escaneo de evidencias con cero secretos detectados. La configuración privada solicitada queda aceptada en `docs/peticiones/respondidas/ACEPTADA_facilitar-configuracion-privada-qa-local-ediciones.md`.
- El acceso físico vuelve a funcionar al salir de Wi-Fi; la última restauración cerró de nuevo la sesión móvil recién abierta. Coordinar el próximo login después de completar los resets y recibir la corrección de la proyección; no pedir accesos entre campañas que vayan a restaurar el dataset.
- La aceptación y publicación productiva permanecen pendientes.
