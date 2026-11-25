# Duplicados pendientes de la APK Kotlin

**Pausado.** Recoge lo que la auditoría completa de duplicados de la APK (hito 14 de `ROADMAP_FINALIZADO_adhesion-yosiftware-y-apk-kotlin.md`, base `6826083`, 26/10/2026) no aplicó: cambios delicados (el autoguardado), que hay que ver en el móvil o que dependen de la plataforma o del backend. Quedan los puntos 8 y 11. Se retoma cuando el propietario lo decida.

Alcance: `android-nativa/app/`, rutas bajo `android-nativa/app/src/main/java/es/yosiftware/libros/`. La librería `android-nativa/yosiftware-sesion/` no se toca nunca; lo que le falta va como petición a la plataforma (`C:\Users\Yosi\Desktop\administracion yosiftware\docs\peticiones\`).

## Dentro de la APK

- [x] **1.** Una sola `fechaCorta` (`datos/Fechas.kt`), en la zona del móvil como la web Mobile (29/10/2026).
- [x] **2.** `BotonesDeDialogo` en `ui/componentes/Superficies.kt`, con el margen de cada diálogo en `arriba` (29/10/2026).
- [x] **3.** `nombreVisible(nombre, alias)` en `datos/modelos/Espacios.kt`; el de `CentroDeAccesoViewModel` es otra regla y se queda (29/10/2026).
- [x] **4.** `CampoDeBusquedaConAmbitos` (`ui/biblioteca/PantallaBiblioteca.kt`) para la Biblioteca y el Catálogo (29/10/2026).
- [x] **5.** `FilaDeLista` con `borde`, `inicio`, `lineasDelTitulo` y `debajo`, usada por las filas del chat, del club y de la bandeja; `FilaDeClub` y las filas del panel de cuenta son otras clases de la web y se quedan (06/11/2026). De paso, a petición del propietario, el club no gasta una línea por botón.
- [x] **6.** Se queda: los estilos de texto repetidos en línea se revisan caso a caso al tocar cada pantalla, porque unir dos que coinciden por casualidad arrastraría a la otra (06/11/2026).
- [x] **7.** `conLaPaginaSiguiente` (`datos/Listas.kt`) añade la página siguiente sin repetir; el cursor y el «ya está cargando» se quedan en cada ViewModel por sus matices (06/11/2026).

- [ ] **8. El borrador local con espera de la ficha y del capítulo**
  - **Descripción:** `ui/elementos/ElementosViewModel.kt` y `ui/libro/CapituloViewModel.kt` repiten la misma maquinaria: `borradorPendiente`, un trabajo que espera `esperaDelBorrador` y escribe el borrador, `abandonado`, escribirlo al cambiar de cuenta y en `onCleared`, y recuperarlo al abrir.
  - **Por qué se necesita:** es la regla de «autoguardado sin pérdidas» escrita dos veces.
  - **Qué se espera lograr:** un `BorradorConEspera` junto a `datos/BorradoresLocales.kt`, con sus pruebas, que usen los dos.
  - **Peligros si se mantiene como estaba:** arreglar un fallo del autoguardado en uno y no en el otro.
  - **Peligros del cambio:** **alto**. El propietario perdió media escena por un fallo de esto; el capítulo además envía al servidor (`autoguardado`) y la ficha no. No se toca sin las pruebas de cerrar la app del todo en el Honor.

## Lo que ya da (o debería dar) la librería de la sesión

- [x] **9.** Los espacios van por `sesion.espacios` y `sesion.social` de la librería 1.10.0 (kit 1.83), detrás de `EspaciosDeLaPlataforma`; `cuenta_cambiada` se convierte en `RespuestaDeOtraCuenta` y no se enseña nunca (06/11/2026).
- [x] **10.** El `detalle` de los errores lo trae la librería (`ErrorSesion.detalle` y `restriccion`); fuera `Restricciones.kt` (06/11/2026).

- [ ] **11. El cliente HTTP propio**
  - **Descripción:** `datos/red/Red.kt` monta un OkHttp con lo mismo que la librería (fast fallback, sin `Origin`, agente propio) porque su `TransporteHttp` es interno. `ClientePlataforma` usa `conTokenDePlataforma` para el token y el reintento, que es lo correcto.
  - **Qué se espera lograr:** si la plataforma expone su cliente (o su configuración), usarla; si no, dejarlo como está, que ya es uno solo para la API de Libros, la plataforma y las portadas.
  - **Peligros:** bajos en los dos sentidos. Prioridad baja.

## Entre la APK, la web y el backend

- [x] **12.** Los textos de error por código salen de la API de Libros; fuera las tablas de la web y de la APK: sin frase del servidor, la de la pantalla (06/11/2026).
- [x] **13.** Los errores de los espacios enseñan el `mensaje` de la plataforma, que ya los llama «clubes»; se quedan los códigos que deciden qué hacer y el texto propio de `sin_sesion` (06/11/2026).
- [x] **14.** Las validaciones de ISBN y fecha comparten casos (`src/app/shared/casos-de-validacion.json`, leído por la web y por `CasosDeValidacionTest`). Las estadísticas se quedan en cada app: ya tienen la colección cargada, y calcularlas en la API añadiría una espera; si divergen, el remedio es el mismo, casos compartidos (06/11/2026).

## Dejado a propósito (no es duplicado)

- `BusquedaEnElLibro.normalizar` frente a `plegar` (`datos/Texto.kt`): la web también tiene dos (`normalizeSearchText` y `foldText`), quitan rangos de marcas distintos (`U+0300–036F` frente a `\p{M}`) y la búsqueda además deja solo letras y números.
- `TextosDelChat.instante` lee las fechas sin zona como UTC (para ordenar y para la ventana de edición), y `instanteDe` como hora local: así lo hacen la web del chat y la de Libros. Comparten `leerFecha`.
- Las barras de arriba: la del libro (`.m-book-bar`), la del editor de estado, la de las páginas públicas y la del shell son clases distintas de la web; solo la de la ficha y la de la antología eran la misma (`MarcoDeBarraDePantallaCompleta`).
- `FichaEditable` y `CapituloEditable` leen su JSON con `getString`/`getInt` estrictos: es el borrador propio, no la API, y uno roto se descarta.
- Las tablas de etiquetas (`Perfil`, `EtiquetasDeClubes`) se parecen en la forma (un `mapOf`), pero son de dominios distintos.
- La librería `yosiftware-sesion/`: fuera de alcance.
