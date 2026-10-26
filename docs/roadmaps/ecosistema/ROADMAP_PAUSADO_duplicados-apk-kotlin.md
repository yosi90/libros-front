# Duplicados pendientes de la APK Kotlin

**Pausado desde su apertura (26/10/2026):** recoge lo que la auditoría completa de duplicados de la APK (hito 14 de `ROADMAP_ACTIVO_adhesion-yosiftware-y-apk-kotlin.md`, rama `revisor/auditoria-completa-apk-2026-10-26`, base `6826083`) no aplicó. Son cambios delicados (el autoguardado), cambios que hay que ver en el móvil o que dependen de la plataforma o del backend. Solo puede haber un roadmap activo: se retoma cuando el propietario lo decida, idealmente junto a las mejoras del hito 15.

Alcance: `android-nativa/app/`. La librería `android-nativa/yosiftware-sesion/` no se toca nunca; lo que le falta va como petición a la plataforma. Las líneas citadas son las de la base `6826083`, rutas bajo `android-nativa/app/src/main/java/es/yosiftware/libros/`. Orden: de más ganancia y menos coste a menos.

## Dentro de la APK

- [ ] **1. La fecha corta de las reseñas de la ficha**
  - **Descripción:** hay dos `fechaCorta` con el mismo nombre y el mismo formato (`dd/MM/yyyy`): `ui/catalogo/PantallaFicha.kt` (333-336) recorta el texto ISO con una expresión regular, sin zona, y `ui/libro/ResumenDelLibro.kt` (72) pasa la fecha a la zona del móvil, como el `date` de Angular. Una reseña de `2026-10-20T23:30:00Z` sale «20/10/2026» en la ficha y «21/10/2026» con la otra en Madrid.
  - **Por qué se necesita:** el mismo formato con dos resultados según la pantalla.
  - **Qué se espera lograr:** que la ficha use la de ResumenDelLibro (o `leerFecha` con su formato) y quitar la suya, tras comprobar en la web qué día pinta la reseña.
  - **Peligros si se mantiene como estaba:** reseñas de última hora con el día anterior.
  - **Peligros del cambio:** cambia lo que se ve en la ficha (un día en las reseñas cercanas a medianoche): por eso no se aplicó en la auditoría.

- [ ] **2. Los botones de los diálogos**
  - **Descripción:** la fila «Cancelar» (contorno) más la acción, a la derecha y con 20 dp encima, se repite en los diálogos: la denuncia y la solicitud de acceso de `ui/comunidad/PantallaClub.kt` (796-799 y 816-819) y la denuncia de `ui/mensajes/PantallaConversacion.kt` (749-752); la confirmación ya es `DialogoDeConfirmacion`. Propuesta: `BotonesDeDialogo(alCancelar, accion, alAceptar, habilitado)` en `ui/componentes/Superficies.kt`.
  - **Por qué se necesita:** el pie de `.m-dialog` escrito en cada diálogo.
  - **Qué se espera lograr:** un pie común; los diálogos nuevos lo heredan.
  - **Peligros si se mantiene como estaba:** poco: tres copias de cuatro líneas.
  - **Peligros del cambio:** la solicitud tiene 12 dp encima, no 20: o el parámetro o se iguala tras verlo en el móvil.

- [ ] **3. El nombre visible de una persona de la plataforma**
  - **Descripción:** «el nombre o `@alias`» (`clubPersonName`) está en `SolicitudDeEntrada.visible` y `PersonaDeYosiftware.visible` (`datos/modelos/Espacios.kt`, 138 y 154), y `ui/comunidad/CentroDeAccesoViewModel.kt` (138) arma `@alias` a mano. Propuesta: una función `nombreVisible(nombre, alias)` en `datos/modelos/Espacios.kt`.
  - **Por qué se necesita / Qué se espera lograr:** una regla de presentación en un solo sitio.
  - **Peligros:** ninguno relevante; es pequeño.

- [ ] **4. El campo de la búsqueda de la Biblioteca y del Catálogo**
  - **Descripción:** `ui/biblioteca/PantallaBiblioteca.kt` (209-238) y `ui/catalogo/PantallaCatalogo.kt` (150-182) pintan el mismo campo (lupa, `BasicTextField` con su marcador, la X de limpiar y los chips). Cambian el marcador, la descripción, el color de la X (tinta en la Biblioteca, primario en el Catálogo) y los márgenes de los chips. Las sugerencias ya son `SugerenciasDeAmbito`.
  - **Por qué se necesita:** el mismo `m-scoped-search` en dos pantallas.
  - **Qué se espera lograr:** un `CampoDeBusquedaConAmbitos` con esos parámetros.
  - **Peligros si se mantiene como estaba:** que el buscador se comporte distinto en cada pantalla (el foco, la X).
  - **Peligros del cambio:** las diferencias de color y margen vienen de la APK de Capacitor; decidir si son a propósito (comparar con las capturas) antes de igualarlas.

- [ ] **5. Las filas de lista: ampliar `FilaDeLista` y usarla**
  - **Descripción:** `ui/componentes/FilaDeLista.kt` (`.m-list-item`) solo se usa una vez; las pantallas tienen sus copias: `FilaDeParticipante` (`ui/mensajes/PantallaConversacion.kt` 682), `FilaDePersona` y `FilaDeClub` (`ui/comunidad/PantallaClub.kt` 729 y 338), `FilaDeAccion` y `FilaDeEnlace` (`ui/cuenta/PanelDeCuentas.kt` 226 y 275) y `FilaDeConversacion` (`ui/mensajes/PantallaMensajes.kt` 190). Casi todas son `.m-list-item` con un borde, un avatar en lugar del icono o dos líneas de título.
  - **Por qué se necesita:** la fila de lista es la primitiva más repetida de Mobile.
  - **Qué se espera lograr:** `FilaDeLista` con `borde`, `inicio` (icono o avatar) y `lineasDelTitulo`, y las copias retiradas.
  - **Peligros si se mantiene como estaba:** cada fila nueva copia la anterior y el aspecto diverge.
  - **Peligros del cambio:** son píxeles: hay que comparar cada pantalla en el Honor (sin emulador) antes y después.

- [ ] **6. Los estilos de texto repetidos en línea**
  - **Descripción:** muchos `Textos.cuerpo.copy(…)` se repiten con los mismos valores en varias pantallas: `fontSize = rem(0.72), fontWeight = ExtraBold` en tinta suave (5), `rem(0.68)` (5), `rem(0.75)` en el color de error (4), `fontWeight = Bold` en la tinta (14, que es `Textos.filaPrincipal`)… La auditoría solo cambió los siete que eran la línea secundaria de una fila (`Textos.filaSecundaria`).
  - **Por qué se necesita:** los tokens de `ui/tema/Tipografia.kt` son los de `_primitives.sass`; lo que se copia en línea no sigue a la guía.
  - **Qué se espera lograr:** buscar cada combinación en el Sass Mobile (`src/assets/css/mobile/`) y, si es una clase (`.m-…`), darle su token; si no, dejarla.
  - **Peligros si se mantiene como estaba:** bajo.
  - **Peligros del cambio:** unir por casualidad dos textos que en la web son clases distintas.

- [ ] **7. La carga por páginas con cursor**
  - **Descripción:** «si hay cursor y no se está cargando, pedir la página siguiente y añadirla» está escrito a mano en `ui/avisos/CentroDeAvisosViewModel.kt` (130-143), `ui/comunidad/ActividadViewModel.kt` (69-80, y otra vez en los comentarios, 105-113), `ui/mensajes/ConversacionViewModel.kt` (198-220), `ui/comunidad/ClubViewModel.kt` (886-895) y `ui/comunidad/ClubesViewModel.kt` (125-150, dos veces).
  - **Por qué se necesita:** es la «carga paginada» de la lista de lógica de estado repetida.
  - **Qué se espera lograr:** un pequeño estado común (`ListaConCursor`: elementos, cursor, cargando, cargandoMás) con «primera página» y «más», sobre `cargar` de `ViewModelDeCuenta`.
  - **Peligros si se mantiene como estaba:** que una lista nueva olvide el «ya está cargando» o el cambio de cuenta.
  - **Peligros del cambio:** cada copia tiene matices a propósito: el chat pagina hacia atrás y conserva el cursor si ya había anteriores; Clubes quita los repetidos; los avisos vuelven a la primera página con `cursor_no_valido`. Hacerlo con las pruebas de cada ViewModel delante.

- [ ] **8. El borrador local con espera de la ficha y del capítulo**
  - **Descripción:** `ui/elementos/ElementosViewModel.kt` (175-181, 504-538) y `ui/libro/CapituloViewModel.kt` (177-185, 316-389) repiten la misma maquinaria: `borradorPendiente`, un trabajo que espera `esperaDelBorrador` y escribe el borrador, `abandonado`, escribirlo al cambiar de cuenta y en `onCleared`, y recuperarlo al abrir.
  - **Por qué se necesita:** es la regla de «autoguardado sin pérdidas» escrita dos veces.
  - **Qué se espera lograr:** un `BorradorConEspera` junto a `datos/BorradoresLocales.kt`, con sus pruebas, que usen los dos.
  - **Peligros si se mantiene como estaba:** arreglar un fallo del autoguardado en uno y no en el otro.
  - **Peligros del cambio:** **alto**. El propietario perdió media escena por un fallo de esto; el capítulo además envía al servidor (`autoguardado`) y la ficha no. No se toca sin las pruebas de cerrar la app del todo en el Honor.

## Lo que ya da (o debería dar) la librería de la sesión

Solo propuestas y peticiones a la plataforma (`C:\Users\Yosi\Desktop\administracion yosiftware\docs\peticiones\`): la librería no se edita.

- [ ] **9. Los espacios: las rutas y los modelos de la librería**
  - **Descripción:** `datos/repositorios/RepositorioEspacios.kt` (40-49 y 91-104) rehace rutas que `sesion.espacios` (`EspaciosYosiftware`, librería 1.7.1) ya da: `mios`, `espacio`, `entrar`, `salir`, `invitaciones`, `aceptar`, `rechazar`, `porCodigo`, `aceptarPorCodigo`; y `datos/modelos/Espacios.kt` (20-108) tiene sus propias `Espacio`, `YoEnEspacio` e `InvitacionRecibida`, que son `EspacioDeYosiftware`, `YoEnElEspacio` e `InvitacionAEspacio` (la 1.7.0 los hizo públicos «para que una app que llama a otras rutas de los espacios con su propio cliente no los vuelva a escribir»). Las propias se quedaron porque la librería no tiene las solicitudes (`pedirEntrar`, `retirarMiSolicitud`, `solicitudes`, `resolverSolicitud`), las invitaciones enviadas y su retirada, la búsqueda de personas ni el resumen social, y porque así todo pasa por `ClientePlataforma` con la generación de la cuenta.
  - **Por qué se necesita:** es lo que la plataforma pide no rehacer (decisión 4 del propietario).
  - **Qué se espera lograr:** primero, leer con los modelos de la librería (`EspacioDeYosiftware.de`…) y añadir `clubId` como extensión; después, pedir a la plataforma las rutas que faltan y que `EspaciosYosiftware` respete una generación (o un `Job`) para descartar lo de otra cuenta, y retirar las copias.
  - **Peligros si se mantiene como estaba:** dos lecturas del mismo JSON que divergen cuando la plataforma cambie un campo.
  - **Peligros del cambio:** la lectura de la librería exige campos (`getString`) que la de Libros toma por defecto: un JSON incompleto que hoy se pinta fallaría. Pruebas de `RepositorioEspaciosTest` y de Comunidad delante.

- [ ] **10. El `detalle` de los errores de la plataforma**
  - **Descripción:** `datos/red/Restricciones.kt` (15-50) vuelve a leer el cuerpo de la respuesta para componer la frase de `403 cuenta_restringida` (`detalle: { alcance, hasta }`), porque `ErrorSesion` no conserva el `detalle`; `ClientePlataforma.errorDe` rehace el error con esa frase.
  - **Por qué se necesita:** cada app nativa del ecosistema escribiría lo mismo.
  - **Qué se espera lograr:** petición a la plataforma: `ErrorSesion.detalle` (el JSON) o, mejor, la frase de la restricción hecha por la librería como `describePlatformRestriction` del SDK web.
  - **Peligros si se mantiene como estaba:** que el texto de la APK diverja del de la web.
  - **Peligros del cambio:** ninguno en Libros hasta que llegue la librería nueva.

- [ ] **11. El cliente HTTP propio**
  - **Descripción:** `datos/red/Red.kt` (31-82) monta un OkHttp con lo mismo que la librería (fast fallback, sin `Origin`, agente propio) porque su `TransporteHttp` es interno. `ClientePlataforma` usa `conTokenDePlataforma` para el token y el reintento, que es lo correcto.
  - **Qué se espera lograr:** si la plataforma expone su cliente (o su configuración), usarla; si no, dejarlo como está, que ya es uno solo para la API de Libros, la plataforma y las portadas.
  - **Peligros:** bajos en los dos sentidos. Prioridad baja.

## Entre la APK, la web y el backend (`../Libros API`, revisión `3fd9eef`)

Solo propuestas: no se tocan ni la web ni el backend.

- [ ] **12. Los textos de error por código, tercera copia**
  - **Descripción:** `datos/MensajesDeError.kt` (21-44) copia 22 frases de `src/app/shared/api-error-message.ts` de la web (punto 6 de `common/ROADMAP_PAUSADO_duplicados-frontend.md`), y el backend ya manda su `error`, con otro texto: `club_owner_limit_reached` es «Solo puedes crear un club» en `controllers/club_controller.py` (284) y «Ya administras un club propio. Solo puedes crear uno.» en las dos apps. La tabla solo se usa si la respuesta llega sin `error` (ERRORES.md).
  - **Por qué se necesita:** el mismo error, tres textos en tres repositorios.
  - **Qué se espera lograr:** decidir una fuente (la frase del backend) y quitar las tablas de la web y de la APK, o llevar sus frases al backend. Resolverlo junto con el punto 6 de la web.
  - **Peligros si se mantiene como estaba:** textos distintos según por dónde llegue el error.
  - **Peligros del cambio:** los errores sin `error` (el tiempo real) necesitan que el backend lo añada antes.

- [ ] **13. Los textos de los errores de los espacios**
  - **Descripción:** `ui/comunidad/MensajesDeEspacios.kt` (19-40) copia `SPACE_ERROR_MESSAGES` de `src/app/shared/club-spaces.ts` (33) para códigos de la plataforma (`dos_pasos_necesarios`, `espacio_lleno`…), y los pone por delante de la frase que manda la plataforma.
  - **Por qué se necesita:** los textos de errores de la plataforma deberían salir de la plataforma (o del kit), no de cada web y cada app.
  - **Qué se espera lograr:** petición a la plataforma para que su `mensaje` diga lo que hoy dice la tabla (en clave de club, si la marca de la web lo pide), y retirar las dos tablas.
  - **Peligros si se mantiene como estaba:** que la plataforma cambie un código y las tablas no se enteren.
  - **Peligros del cambio:** perder el «club» de los textos si la plataforma habla de «espacio».

- [ ] **14. Las estadísticas que calculan las dos apps**
  - **Descripción:** `ui/estadisticas/Estadisticas.kt` repite en Kotlin `src/app/shared/library-stats.ts` (recuentos, «más tiempo en espera», los más repetidos) sobre la colección entera, y `ui/catalogo/Peticiones.kt` (81-101) las validaciones de ISBN y fecha (punto 7 de la web).
  - **Qué se espera lograr:** lo que dependa solo de la colección, calculado por el backend en `estadisticas/` (ya hace las métricas generales) y leído por las dos; las validaciones, con sus casos de prueba compartidos en `docs/backend/api/`.
  - **Peligros:** bajos; prioridad baja, tras el clon.

## Dejado a propósito (no es duplicado)

- `BusquedaEnElLibro.normalizar` (`ui/libro/BusquedaEnElLibro.kt` 101) frente a `plegar` (`datos/Texto.kt`): la web también tiene dos (`normalizeSearchText` y `foldText`), quitan rangos de marcas distintos (`U+0300–036F` frente a `\p{M}`) y la búsqueda además deja solo letras y números.
- `TextosDelChat.instante` lee las fechas sin zona como UTC (para ordenar y para la ventana de edición), y `instanteDe` como hora local: así lo hacen la web del chat y la de Libros. Comparten `leerFecha`.
- Las barras de arriba: la del libro (`.m-book-bar`), la del editor de estado, la de las páginas públicas y la del shell son clases distintas de la web; solo la de la ficha y la de la antología eran la misma (`MarcoDeBarraDePantallaCompleta`).
- `FichaEditable` y `CapituloEditable` leen su JSON con `getString`/`getInt` estrictos: es el borrador propio, no la API, y uno roto se descarta.
- Las tablas de etiquetas (`Perfil`, `EtiquetasDeClubes`, `MensajesDeError`, `Restricciones`) se parecen en la forma (un `mapOf`), pero son de dominios distintos.
- La librería `yosiftware-sesion/` y la APK de Capacitor (`android/`, retirada): fuera de alcance.
