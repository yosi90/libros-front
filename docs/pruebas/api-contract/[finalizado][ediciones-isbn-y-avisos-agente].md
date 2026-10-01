# Pruebas finalizadas — Ediciones, ISBN y avisos de agente

Roadmap: `docs/roadmaps/api-contract/ROADMAP_FINALIZADO_ediciones-isbn-y-avisos-agente.md`.

## Contrato y datos

Verificación 1/10/2026: `GET /verify` de QA y producción confirma `5535254edce43661716927ecc1c569df0b2bdfe4`, `SourceDirty: false` y `EstadoGeneral: healthy`; los entornos se identifican como `qa` y `produccion` respectivamente. Esta comprobación es de publicación y salud; no sustituye las escrituras autenticadas de aceptación.

- [x] `/verify` confirma QA antes de probar las rutas nuevas; QA y producción publican `c450be4159b19f3005e364aad40c0800822f2fb2` y QA declara `Entorno: qa` (30/9/2026).
- [x] Libro y antología con una edición, varias, ninguna identificada por ISBN y edición con ISBN `null`.
- [x] Edición principal: fecha más reciente; fecha desconocida después; ID menor para desempate.
- [x] Edición ómnibus vinculada a varias obras; posesión global visible desde cada ficha (API real).
- [x] Prueba local: al marcar una edición compartida, las otras obras visibles de Catálogo actualizan su indicador por ID.
- [x] `GET` de ediciones y `MiColeccion.EdicionesIds` concuerdan para libro y antología.

## Colección y presentación

Lectura física 1/10/2026: `1.0.87-qa` / código 88 instalada con firma de distribución y sesión conservada. En Honor medium (718×781 CSS), libro y antología reales muestran una edición principal sin posesión y «Tengo esta edición»; capturas inspeccionadas, sin overflow. El detalle real del libro incluye `Ediciones` y `MiColeccion.EdicionesIds`. No se realizaron escrituras ni reset: siguen pendientes varias ediciones, ISBN nulo, vínculo compartido y persistencia real del historial dentro de una campaña con lease.

Avance 1/10/2026 (Biblioteca): 20 pruebas unitarias de navegación y 8 casos Playwright Chromium/Firefox en Web escritorio/compacta, Wood y Mobile. Capturas inspeccionadas. Se comprueban apertura por teclado, edición poseída inicial, retirada de la última edición, retorno con la obra «En marcha» y reentrada con la nueva posesión. La API está simulada; esta evidencia no valida persistencia del historial en servidor ni sustituye la QA nativa.

- [x] Prueba local: Biblioteca permite abrir ediciones y regresar sin abrir el lector; al retirar la última edición conserva la tarjeta y el estado de lectura de la respuesta de colección.

Avance 30/9/2026: Catálogo validado con dos ediciones en Web escritorio, Web compacta, Wood y Mobile mediante Playwright Chromium/Firefox (4/4 en cada navegador). Perfil/gestores Web y Wood validados en ambos navegadores (2/2 en cada uno), con capturas inspeccionadas. El gestor Mobile no es una ruta accesible desde el Perfil Mobile actual. Faltan datos reales de QA.

- [x] La ficha destaca una edición poseída; con varias, respeta el orden de backend; sin ninguna, muestra la principal.
- [x] Web claro/oscuro, Wood y Mobile/APK permiten recorrer ediciones con portada, ISBN, fecha y marca de posesión correctos.
- [x] Seleccionar una o varias ediciones envía la lista completa de IDs y añade la obra si faltaba.
- [x] `PUT` repetido es idempotente; una respuesta nueva reconcilia Catálogo, Biblioteca y detalle.
- [x] Desmarcar todas las ediciones mantiene la obra en la biblioteca y preserva estado, reseña, puntuación, notas, narrativa y estadísticas.
- [x] `400 edition_selection_invalid`, `404 edition_work_not_found` y fallo de red muestran `error` sin exponer `debug`; el control de selección se señala si corresponde.

## Peticiones y administración

Avance 1/10/2026 (resolución editorial): ocho pruebas unitarias de moderación/sincronización y doce casos Playwright Chromium/Firefox pasan. Web y Wood seleccionan libro o antología del catálogo correcto, confirman la obra y los participantes, conservan el borrador ante `409 catalog_request_isbn_conflict` y permiten recuperar la aprobación mediante vínculo compartido elegido por administración. Capturas inspeccionadas. La fecha se hereda del payload y no se transmite ISBN, portada ni metadatos nuevos de obra en la modalidad existente. Pendiente contrastar con la transacción real de QA.

- [x] Prueba local: aprobación contra obra existente de ambos tipos; conflicto recuperable; vínculo explícito y confirmación conjunta; un moderador no carga ni envía el vínculo administrativo.

Avance 30/9/2026: pruebas unitarias de alta con ISBN delimitado, rechazo de marcador cero y error del backend asociado a `Payload.ISBN`. Las respuestas repetida y aprobada ofrecen mensajes distintos; la edición aprobada solo se añade tras la acción explícita del lector. Moderación agrupada validada en Web y Wood con Playwright Chromium/Firefox (2/2 por navegador), con capturas inspeccionadas: muestra tres participantes y exige confirmar antes del `PATCH`. Servicio administrativo de ediciones probado con JSON, multipart y vínculo explícito. Pendiente comprobar el flujo real en QA y el límite de cinco activas.

Avance 1/10/2026: Playwright Chromium/Firefox comprueba en Web y Wood el alta inicial sin portada, edición por ID, creación de otra edición, recuperación de `409 edition_isbn_conflict`, portada multipart (`payload` + `image`) y guardado de obra sin ISBN ni fecha. También comprueba el vínculo explícito con `VincularEdicionId`. Tres pruebas unitarias validan dígitos de control ISBN-10/13, prefijos y valores desconocidos. Se conserva el alta atómica de obra y primera edición documentada por backend. Pendiente sesión real de QA y validación de la transacción en servidor.

- [x] Alta de libro/antología exige ISBN válido y señala `Payload.ISBN`; tipos y acciones restantes mantienen sus reglas.
- [x] La petición repetida por la misma persona devuelve su ID sin crear una segunda fila; límite de cinco activas.
- [x] Prueba local: contador de cinco activas de todos los tipos, conservación del borrador tras `409 catalog_active_request_limit` y recuperación de una petición repetida con `200`. Validado en Web escritorio/compacta y Wood con Chromium/Firefox.
- [x] Aprobación automática `201` muestra `EntidadId` y `EdicionId` y ofrece marcar posesión por separado.
- [x] Lista propia muestra filas individuales; moderación agrupa por `GrupoISBN` y muestra `Participantes`.
- [x] Moderación resuelve contra obra existente y exige acción explícita de administrador para `VincularEdicionId`.
- [x] Prueba local: editor crea y modifica ediciones sin sobrescribir otras; portada multipart y conflicto de ISBN `409`.
- [x] Edición compartida avisa antes de cambiar metadatos que afectan a todas las obras vinculadas.
- [x] Prueba local: el vínculo compartido usa una obra y edición seleccionadas, se confirma antes del POST y no exige conocer IDs técnicos.

## Notificapp y cierre

Preparación de campaña sin móvil (1/10/2026): suite real `e2e/editions-contract.integration.spec.ts` registrada, con seis recorridos UI y tres transacciones API (las API no se duplican en Firefox). Typecheck y descubrimiento pasan; ejecución real pendiente, sin contar estas entradas como pruebas superadas. Usar el arnés existente con `QA_RESET_TOKEN`, contraseñas privadas y lease adquirida, y renovar/resetear/liberar en cleanup. No ejecutar el spec directamente sin ese control. Los workflows protegidos de campaña solo aceptan `main`; la candidata de funcionalidad sigue aislada en su rama.

Gates locales 1/10/2026: 636 unitarias Angular, 50 casos Playwright Chromium/Firefox ejecutados juntos, typecheck E2E y lint OpenAPI verdes. Catálogo Web claro añadido y captura inspeccionada. Build nativo QA y 13 pruebas JVM verdes. La candidata debug no se instala encima de la QA de distribución. Se construyó e instaló después la candidata firmada `1.0.87-qa` / código 88 del workflow privado `36872100434`, conservando sesión y datos. Pendientes configuración privada de campaña y aceptación completa con datos reales; ver el Hito 6 del roadmap y `docs/roadmaps/qa/bugs.md`.

- [x] `/plugin-kit/` está ignorado en Git y la credencial de agente reside fuera del repositorio.
- [x] El propietario recibió la prueba y el reenvío manual de la respuesta anterior; el cliente confirmó aceptación y el hook previo de computer-use se restauró.
- [x] Un aviso `agent_question` y uno `agent_finished` llegan al espacio «Agentes», con texto completo y título del frontend.
- [x] Un cierre nuevo enviado explícitamente llega una sola vez; el hook `notify` previo sigue funcionando.
- [x] Build, pruebas relevantes y Playwright Chromium/Firefox pasan en anchos compactos y escritorio; QA nativa valida Mobile/APK.
- [x] El propietario acepta la experiencia en QA antes de publicar la funcionalidad nueva en producción.

## Validación de vuelta con el móvil (1/10/2026)

La ficha real de libro con ISBN nulo se inspeccionó en Honor desplegado (718×781) y plegado (353×792), en claro: muestra «Edición sin ISBN», conserva el scroll vertical y no tiene overflow horizontal ni marcadores cero. El catálogo observado tiene cuatro libros con ISBN nulo; no contiene varias ediciones ni vínculos compartidos antes de la campaña. Evidencias locales ignoradas en `android/app/build/outputs/qa-evidence/20261001/`.

El propietario ha entregado la configuración privada fuera del repositorio. El runner local adapta `LIBROS_QA_RESET_TOKEN` en memoria, permite únicamente las variables QA necesarias y adquiere/renueva/restaura/libera su lease. Sus 46 pruebas unitarias pasan. La primera campaña real pasó los seis recorridos UI en Chromium/Firefox (claro, oscuro y Wood); falló una precondición de fixture del caso API de historial, no una escritura de ediciones. El cleanup restauró baseline y liberó la lease. El baseline tiene estados sembrados sin relación de biblioteca; el caso prepara ahora biblioteca, puntuación y reseña antes de comprobar su conservación. Resultado de reejecución registrado a continuación.

### Resultado de la campaña real (1/10/2026)

- Seis recorridos UI pasan en Chromium/Firefox: claro, oscuro y Wood, edición poseída inicial y retirada del ejemplar. Esa igualdad de detalle no acredita conservación de reseña/puntuación porque la proyección personal resultó incompleta.
- La aprobación agrupada pasa: dos personas, repetición propia 200, una fila de cola, resolución contra obra existente, fecha heredada, dos historiales aprobados, posesión no asignada y 409 al resolver de nuevo.
- La edición compartida se crea/vincula y su posesión global se refleja desde libro y antología; retirar desde la antología desmarca desde el libro. Falla la comprobación posterior de biblioteca en detalle público.
- El caso de historial falla incluso después de preparar posesión y reseña/puntuación: colección contiene la obra y GET de ediciones confirma posesión; detalle público mantiene EnBiblioteca=false y campos personales nulos. Idempotencia y conservación completa siguen pendientes porque falla la precondición de esa proyección.
- Discrepancia reproducida y petición nueva: `docs/peticiones/respondidas/ACEPTADA_corregir-proyeccion-mi-coleccion-detalle-publico-ediciones.md`. No se cambia el contrato recibido ni se oculta la diferencia en frontend.
- Todas las campañas ejecutan cleanup. Verificación final: QA ready, baseline, sin lease activa; escaneo de evidencias con cero secretos detectados. La configuración privada solicitada queda aceptada en `docs/peticiones/respondidas/ACEPTADA_facilitar-configuracion-privada-qa-local-ediciones.md`.
- El acceso físico vuelve a funcionar al salir de Wi-Fi; la última restauración cerró de nuevo la sesión móvil recién abierta. Coordinar el próximo login después de completar los resets y recibir la corrección de la proyección; no pedir accesos entre campañas que vayan a restaurar el dataset.
- La aceptación y publicación productiva permanecen pendientes.

Respuesta backend 1/10/2026: MiColeccion corregida en QA `f0d0f4eef37d6ed97f2a49f77c933f3852b3aed8`, sin cambio de JSON ni reparación de datos. Petición archivada como aceptada. `/verify` confirma salud y revisión API/gateway. Campaña frontend de revalidación en curso bajo lease.

## Revalidación tras la corrección backend (1/10/2026)

QA publica `f0d0f4eef37d6ed97f2a49f77c933f3852b3aed8`, verificado con API/gateway iguales, saludable y árbol limpio. La campaña frontend real termina con **9 pruebas correctas y 3 omisiones previstas** (transacciones API no duplicadas en Firefox): los seis recorridos UI pasan y los tres casos API acreditan idempotencia, biblioteca e historial conservados con reseña/puntuación no vacías y narrativa, posesión global compartida y resolución agrupada sin posesión automática. Cleanup restaura baseline y libera lease. La discrepancia de MiColeccion queda resuelta; petición aceptada archivada. La afirmación previa de que faltaba la relación usuario_libros era una interpretación del indicador defectuoso: backend confirma que los datos persistían.

No ha sido necesario un cambio de interfaz para esta corrección. La siguiente comprobación es la APK física con cuenta sembrada, bajo una única lease; preparar su login después de los resets web. El ticket de onboarding comunicado durante la campaña pudo invalidarse al restaurar QA; no se considera probado un nuevo defecto de onboarding.

## QA física tras la corrección backend (1/10/2026)

En Honor plegado 353×792, conectado por USB y con datos móviles, la cuenta sembrada entra por correo en segundos. Bajo una única lease se preparan dos ediciones nuevas y un vínculo ómnibus explícito: la APK destaca la poseída, marca dos, retira ambas y mantiene la obra. La antología refleja la retirada global. Atrás físico cierra la ficha; el acceso desde Biblioteca vuelve a Biblioteca. Captura oscura sin overflow y tema claro restaurado. Verificación API posterior acredita biblioteca, estados, reseña, puntuación y narrativa conservados; cleanup baseline y liberación correctos. Evidencia ignorada en android/app/build/outputs/qa-evidence/20261001/. El propietario solicita reducir el peso visual del botón Ediciones: ajuste Mobile en curso con target 44 px; requiere candidata firmada actualizada antes de aceptación final.

Notas e independencia entre cuentas: caso real ampliado pasa, con nota no vacía conservada e idéntica proyección de la segunda cuenta. Corrección visual del acceso Ediciones: ocho regresiones Chromium/Firefox pasan y captura Mobile revisada; el botón no tiene borde/relleno verde, usa texto 12 px y target 44 px. Candidata firmada 1.0.88-qa en construcción; no se da por instalada todavía.

## Candidata visual instalada (1/10/2026)

Workflow 36925728827 correcto sobre cf97205a57b702f0514c32b806a523d6cde0e0d7: APK 1.0.88-qa/código 89, SHA-256 3f6262fa33a86f254ad7534f08cfe2cdb0eecf005e4c4c392da1035915abc717, certificado release esperado. Instalada por USB con -r y cuenta sembrada abierta. Captura física clara revisada a 353×792: Ediciones es texto secundario 12 px/600, 44 px de alto, ancho natural, borde 0 y fondo transparente; sin overflow. Ocho recorridos Chromium/Firefox pasan. El cambio queda pendiente únicamente de aceptación del propietario; QA conserva baseline sin lease activa. La siguiente publicación requiere aceptación, corrección backend en producción y aumento coordinado de sessionVersion a 2026-10-01-ediciones-v2 en ambos entornos.

Aceptación del propietario (1/10/2026): confirma el ajuste de Ediciones y la experiencia en QA. Preparar sessionVersion 2026-10-01-ediciones-v2 y entrega frontend. Publicación productiva condicionada a corrección backend; petición nueva docs/peticiones/respondidas/ACEPTADA_publicar-correccion-micoleccion-produccion-tras-aceptacion-qa.md. Preguntas y cierres completos sin duplicados confirmados por el propietario.

Cierre de preparación (1/10/2026): sessionVersion `2026-10-01-ediciones-v2` aplicada a ambos entornos; build productivo correcto y 5/5 pruebas de sesión. Avisos Notificapp aceptados. Pendientes despliegue backend productivo, publicación frontend y humo posterior.

Publicación coordinada (1/10/2026): respuesta backend aceptada y `/verify` productivo comprobado en cea65ae. La dependencia backend queda resuelta; se inicia despliegue frontend y APK productiva 1.0.18/código 19 tras aceptación de QA.

## Publicación y humo productivo

- [x] Backend corregido en producción cea65ae, `/verify` saludable/limpio y API/gateway alineados.
- [x] Hosting 70960d9 publicado por 36929313168, gate completo correcto; seis smokes alojados Chromium/Firefox y App Links verificados.
- [x] APK pública 1.0.18/código 19 firmada por 36929312446; checksum verificado, bundle productivo y actualización física sin borrar datos locales.
- [x] Barrera real de sesión antigua en ambos navegadores y arranque físico Android en acceso nuevo esperado.
- [x] Tras acceso del propietario: Biblioteca y ficha productiva cargan correctamente en la APK pública instalada.

Cierre físico productivo: nuevo acceso del propietario, Biblioteca, ficha de Siega con edición poseída, retorno por Atrás y restauración de sesión tras reinicio correctos. Las comprobaciones editoriales y de error se apoyan en pruebas locales, auditoría del handler compartido y contrato backend; no se ejercen escrituras de prueba en producción. Orden principal delegado a la API (fecha descendente, desconocidas después, ID de desempate); el cliente respeta ese orden y antepone una poseída. Matriz combina casos reales de QA, fixtures locales y confirmación contractual, sin afirmar que cada variante se haya creado físicamente en producción.
