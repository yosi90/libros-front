# Especificación funcional: elementos narrativos de un libro (para el clon Kotlin/Compose)

Describe la vista móvil de la web tal como era en `3ea15a0` (2026-10-25), la que clonó la APK (`android-nativa/app/src/main/java/es/yosiftware/libros/ui/elementos/`). La web ha cambiado después (por ejemplo, la hoja rápida para crear personajes y entradas). La APK corrige a propósito las rarezas de §8.

## 0. Ficheros

Bajo `src/app/`:

- `components/shared/book-pages/narrative-entity-placeholder/narrative-entity-placeholder.component.ts`: toda la lógica, «el controlador». Su `.html` elige la vista móvil, la web o la plantilla clásica de escritorio.
- `components/mobile/book/mobile-narrative-entity-view/`: la vista móvil, **la que se clona**.
- Servicios: `services/entities/` (`narrative-entity`, `character`, `entry`, `book`), `services/auth/pending-work.service.ts`, `services/stores/` (`character-order-refresh`, `book-store`) y `modules/snackbar.module.ts`; rutas en `modules/book-router.module.ts`.
- Modelos y utilidades: `interfaces/character.ts`, `interfaces/organization.ts`, `interfaces/location.ts`, `interfaces/api-contract.ts`, y en `shared/` `character-groups`, `narrative-entity-links`, `narrative-entity-names`, `backend-field-error` y `api-error-message`.
- Contrato: `docs/backend/api/ENDPOINTS.md` y, para las formas de respuesta, `../Libros API/controllers/personaje_controller.py`.

Un único componente (`NarrativeEntityPlaceholderComponent`) sirve los seis tipos de elemento y sus tres modos (lista, ficha/edición, alta). Su plantilla delega: si la presentación móvil está activa pinta `<app-mobile-narrative-entity-view [controller]="mobileController">`; si es la web, la vista web; si no, la plantilla clásica. La vista móvil no tiene lógica propia: todo lo llama sobre `c` = el controlador, salvo un envoltorio de «Nueva entrada» que además desplaza la pantalla.

---

## 1. Rutas, tipos y navegación

### 1.1 Rutas

Todas cuelgan de `book/:id`, con `authGuard` y `canDeactivate: [pendingChangesGuard]`:

| Ruta (segmento) | Modo | Tipo (`getListPath()`) |
|---|---|---|
| `characters` | lista / ficha | `characters` |
| `character` | **alta** | `characters` |
| `character/:crid` | ficha (ruta antigua: abre el personaje `crid`) | `characters` |
| `organizations` / `organization` | lista-ficha / alta | `organizations` |
| `events` / `event` | lista-ficha / alta | `events` |
| `locations` / `location` | lista-ficha / alta | `locations` |
| `concepts` / `concept` | lista-ficha / alta | `concepts` |
| `quotes` / `quote` | lista-ficha / alta | `quotes` |

- `routePath` = primer segmento de la URL (`handleRoutePathChange`).
- `getListPath()` traduce la forma singular a la plural; si no reconoce el segmento lo deja tal cual, y `getConfig()` cae en la configuración de `concepts`.
- **Modo alta** (`isCreateMode`): `routePath` ∈ {`character`,`organization`,`event`,`location`,`concept`,`quote`} **y** la ruta no trae `:crid`.
- **Modo ficha** (`isUpdateMode`): `formMode === 'update'` y hay `selectedItem`.
- **Modo formulario** = alta o ficha. En cualquier otro caso se ve la lista.

### 1.2 Configuración de cada tipo

| listPath | `title` | `singular` | icono | clave del libro (`bookKey`) | ruta de alta |
|---|---|---|---|---|---|
| characters | Personajes | personaje | `co_present` | `Personajes` | `character` |
| organizations | Organizaciones | organización | `groups` | `Organizaciones` | `organization` |
| events | Eventos | evento | `event` | `Eventos` | `event` |
| locations | Localizaciones | localización | `my_location` | `Localizaciones` | `location` |
| concepts | Conceptos | concepto | `auto_awesome` | `Conceptos` | `concept` |
| quotes | Citas | cita | `format_quote` | `Citas` | `quote` |

Tipo de entrada para `/entradas/{entidad}` (`getEntryKind`): characters→`personajes`, locations→`localizaciones`, organizations→`organizaciones`, concepts→`conceptos`, events→`eventos`, quotes→`citas`.

### 1.3 Origen de los datos

- **Los elementos de la lista salen del libro en memoria** (`BookStoreService.book$`), no de una petición propia: `getItems()` = `book[bookKey]` si es un array. El libro lo carga la carcasa del libro con `GET /libros/{id}` (normalizado: todos los arrays vacíos por defecto, `Id` numérico).
- Al recibir un libro con `Id !== 0`: si es otro libro distinto del anterior se contrasta la lista de personajes con la API (`syncCharacterListWithApi`); se reconstruyen los enlaces narrativos (`buildNarrativeEntityLinks`); se combinan los estados de localización del libro; se eligen los valores por defecto (localización del evento, estado del personaje) y **se reabre el elemento pendiente de `?selected=`** (ver 1.4). Esto ocurre en **cada** emisión del libro.

### 1.4 Elemento seleccionado (`?selected=`) y ruta antigua `:crid`

- `?selected=N`: si `N` es un número finito > 0 se guarda en `pendingSelectedItemId` y se llama a `openPendingSelectedItem()`. Si el parámetro desaparece y se está en modo ficha (no alta), se cierra la ficha (`closeUpdateForm`, **sin guardar**).
- `:crid`: número ≥ 1 → `pendingSelectedItemId = crid` y se abre.
- `openPendingSelectedItem()`: no hace nada si no hay id pendiente, si el libro aún no está (`book.Id` = 0) o si se está en modo alta. Busca el elemento en el libro por id **comparando como número** (`findItemInBook`) y, si está, `openItem(item)`. Si no está (aún) no hace nada; se reintenta en la siguiente emisión del libro.
- `pendingSelectedItemId` **nunca se borra** al cerrar la ficha (ver «Dudas»).
- Los enlaces narrativos de los textos RTF apuntan a `/book/{libroId}/{tipo}?selected={id}` y se abren con `router.navigateByUrl`.

### 1.5 Navegación

- **Lista → alta**: botón «Crear {singular}» → `navigateToCreate()` → `../{createRoute}` relativo.
- **Lista → ficha**: tocar una fila → `openItem(item)`. No cambia la URL (no añade `?selected=`).
- **Ficha → lista**: flecha atrás de la cabecera (solo visible en modo formulario) → `requestCloseUpdateForm()`: pasa por `canDeactivate()` (autoguardado, ver §5) y, si se puede, `completeFormClose()`: en alta navega a la lista (`../{listPath}`); en ficha llama a `closeUpdateForm()`, que vacía el estado y vuelve a pintar la lista **sin navegar** (la URL conserva `?selected=` si lo tenía).
- **Alta → lista**: tras crear con éxito se navega a la lista si la pantalla sigue viva. La flecha atrás en alta navega a la lista **sin confirmar ni guardar** lo escrito.
- **Salir de la ruta** (otra pantalla del libro, atrás del sistema): `pendingChangesGuard` llama a `canDeactivate()`.

### 1.6 Apertura de una ficha (`openItem`)

En orden: `selectedItem = item`; `formMode = 'update'`; `resetEntryForm()`; `resetRelationEdit()`; `populateEditForm(item)` (formulario secundario de la tarjeta de detalle); `populateMainFormForUpdate(item)`; `loadSelectedItemDetails()`. Si algo lanza una excepción: se deja `selectedItem`/`formMode`, se pone el nombre y las entradas, y aviso de error «No se pudieron precargar todos los datos del objeto».

`populateMainFormForUpdate`: `resetCreateForm()`; vuelve a fijar `selectedItem`/`formMode`; rellena:
- `name` ← `item.Nombre`.
- `locationStatusId` ← `getItemLocationStatusId(item)`: `Id_Estado ?? EstadoId` (como número); si no, busca en `locationStates` por nombre (`item.Estado`, sin tildes ni mayúsculas); si no, `item.Estados[0].Id`; si no, null.
- `characterStatusId` ← `getItemCharacterStatusId(item)`: `Id_Estado ?? EstadoId`; si no, del array `Estados` toma el de `Origen === book.Id` o, si no hay, el último; su id es `Estado.Id ?? EstadoId ?? Id`; si no, busca por nombre en el catálogo de estados de personaje.
- `characterSex` ← `getItemCharacterSex(item)`: null/undefined→null; booleano: `true→0`, `false→1`; número tal cual; texto (sin tildes): `0|chico|hombre|masculino|varon`→0, `1|chica|mujer|femenino`→1, `2|no se|nose|desconocido|desconocida`→2; si no, `Number(...)` si es finito.
- `locationId` ← `item.Id_Localizacion`; `page` ← `item.Pagina`; `characterId` ← `getQuoteCharacterId(item)` (`Id_Personaje ?? PersonajeId ?? Personaje.Id`, número > 0).
- `selectedCharacterIds` ← ids de `item.Personajes` (acepta números u objetos `{Id}`).
- Textos de los autocompletados (localización del evento, personaje de la cita; el de la cita usa de reserva `Personaje.Nombre ?? PersonajeNombre ?? NombrePersonaje`).
- Entradas ← `item.Entradas` (`populateCreateEntries`): cada una con su `id`, título `Nombre ?? 'Descripción'` y descripción `Descripcion ?? ''`; si no hay ninguna, una entrada por defecto.
- Personajes: relaciones y apodos (`populateCharacterDrafts`).
- Toma la foto de referencia (`refreshUpdateSnapshot`) y **después** restaura el borrador local si lo hay (`restoreEntityDraft`, §5.3).

`loadSelectedItemDetails`:
- Personajes: `selectedEntries = item.Entradas` y vuelve a rellenar relaciones y apodos. Sin peticiones.
- Resto: muestra el cargador global y pide `GET /entradas/{tipo}/{id}?libroId={libro}` → `selectedEntries` (solo lo usa la tarjeta de detalle, ver §3.6). Si es organización, a continuación `loadOrganizationRelations(false)`: `forkJoin` de `GET /organizaciones/{id}/personajes?libroId=` y `GET /organizaciones/{id}/localizaciones?libroId=`; guarda las filas, **sustituye** los borradores de relaciones del formulario (`populateOrganizationRelationDrafts`) y **vuelve a tomar la foto de referencia**. Error de entradas → `selectedEntries = item.Entradas`; error de relaciones → listas vacías, sin aviso.

---

## 2. Formularios de alta y de edición (el mismo formulario)

El alta y la ficha usan **el mismo formulario** (`entityForm`, `id="mobile-narrative-form"`). En la ficha se rellena con los datos del elemento. Los validadores dependientes del tipo se fijan al cambiar de ruta.

### 2.1 Cabecera móvil

- Línea pequeña: nombre del libro (`book.Nombre`).
- Título: en formulario `'Modificar ' + singular` (ficha) o `'Crear ' + singular` (alta); en lista, `title` (p. ej. «Personajes»).
- Lista: botón «Crear {singular}» (icono `add`, `aria-label` «Crear {singular}»).
- Formulario: botón de icono `save`, `type="submit"` del formulario, deshabilitado si `!canSubmit() || isSubmittingEntity`, `aria-label` «Actualizar {singular}» / «Crear {singular}».
- Flecha atrás (`arrow_back`, `aria-label` «Volver al listado»), oculta (clase `is-hidden`) en la lista.
- Al final del formulario, otro botón de envío: «Guardar cambios» (ficha) o «Crear {singular}» (alta), con la misma condición de deshabilitado.

### 2.2 Campos comunes

| Campo | Control | Validación | UI móvil |
|---|---|---|---|
| Nombre / Título | `name` | `required`, `minLength(3)`, `maxLength(100)` | Etiqueta «Título» si `singular === 'cita'`, si no «Nombre de {singular}»; `maxlength="100"`; error «Indica un nombre de al menos 3 caracteres.» |
| Entradas narrativas | `createEntryDrafts[]`, cada una `{ id?, title, description }` | título: `required`, `minLength(3)`, `maxLength(100)`; descripción: `entryDescriptionValidator` | Sección «Entradas narrativas» |

**Validador de descripción**: convierte el RTF a texto plano (`rtfToPlainText`), recorta espacios; vacío → `{required}`; menos de 15 caracteres → `{minlength}`; si no, válido.

**Entrada por defecto**: título `Descripción`; descripción = RTF (`plainTextToRtf`) del texto `Descripción {de la|del} {singular}`, con «de la» para organización, localización y cita, y «del» para el resto. Textos exactos: «Descripción del personaje», «Descripción de la organización», «Descripción del evento», «Descripción de la localización», «Descripción del concepto», «Descripción de la cita». Todos tienen ≥ 15 caracteres, así que la entrada por defecto **ya es válida**.

**UI de cada entrada**:
- Atributo `data-entry-index` = índice (para desplazarse a la nueva).
- Campo «Título» (`maxlength="100"`); al enfocar, si su valor es exactamente `Descripción`, se selecciona todo (`selectDefaultText`).
- Botón papelera (`aria-label` «Eliminar entrada», clase peligro) solo si hay más de una entrada → `removeCreateEntry(i)` (si solo queda una, la restablece al título y descripción por defecto; si no, la quita).
- Editor RTF (`app-narrative-rtf-editor`) con: enlaces narrativos (`getEntryNarrativeLinks()`, que excluye el propio elemento en la ficha), `preferenceBookId = book.Id` (preferencia de fuente por libro), `selectAllOnFocus` = la descripción es la de por defecto, y al activar un enlace `openNarrativeEntityLink`.
- Si la descripción no es válida (en cualquier momento, no solo tras tocarla): «La descripción debe tener al menos 15 caracteres.»
- La vista móvil **no muestra error del título**; la clásica sí: «El título debe tener al menos 3 caracteres.».

**Botón «Nueva entrada»** (`m-button--tonal`, icono `add`) → `addCreateEntry()` de la vista → `c.addCreateEntry()`: si alguna entrada existente no es válida, marca todas como tocadas y muestra el aviso informativo «Para añadir una nueva entrada, primero las entradas existentes deben ser válidas.» (tipo info, 4200 ms, título «Completa las entradas», icono `help_outline`, `dedupeKey` `narrative:add-entry:invalid`) y no añade. Si son válidas, añade una entrada por defecto y la vista móvil la centra en pantalla con desplazamiento suave (`scrollMobileFormBlockIntoView`, dos `requestAnimationFrame`, `behavior` `auto` si el sistema pide movimiento reducido).

### 2.3 Personajes (`characters`)

| Campo | Control | Validación (solo en personajes) | UI móvil |
|---|---|---|---|
| Tipo de cambio de nombre | `characterNameChangeMode`, `'narrative'` por defecto, no nulo | — | Solo si `isCharacterNameChanged()` (ficha de personaje y `name` distinto del `Nombre` original, comparación exacta). Desplegable «Tipo de cambio» con «Nuevo nombre; conservar el anterior como apodo» (`narrative`) y «Corrección de errata» (`correction`). En la clásica la segunda opción es «Corrección de errata del nombre actual». |
| Estado | `characterStatusId` | `required` | Desplegable «Estado» con `characterStates` (`{Id, Nombre}` del catálogo) |
| Sexo / género | `characterSex` | `required` | Desplegable «Sexo / género»: «Chico» = 0, «Chica» = 1, «No sé» = 2 |
| Apodos | `characterAliases: string[]` + `characterAliasDraft` | borrador: `minLength(3)`, `maxLength(100)` | ver abajo |
| Relaciones | `createCharacterRelations[]` | parentesco: `required`, `minLength(2)`, `maxLength(100)` | ver abajo |

- **Catálogo de estados de personaje** (`loadCharacterStates`): `GET /personajes/estados/catalogo` al entrar en la ruta de personajes. Éxito → `characterStates`; en ficha, si el estado está vacío, se rellena con el del elemento; luego valor por defecto. Error → lista vacía (sin aviso; el formulario no se puede enviar porque el estado es obligatorio).
- **Estado por defecto**: si está vacío, el estado cuyo nombre sin tildes/mayúsculas es `vivo`.
- **Apodos**: sección «Apodos» (icono `badge`). Campo de texto siempre visible, `placeholder` «Nuevo apodo», Intro → `addCharacterAlias()`; botón `add` (`aria-label` «Añadir apodo») deshabilitado si `!canAddCharacterAlias()`. Debajo, una ficha (chip) por apodo con botón `close` (`aria-label` «Eliminar {apodo}») → `removeCharacterAlias` (quita por igualdad exacta). Sin apodos: «Este personaje aún no tiene apodos.»
  - `addCharacterAlias()`: si el «formulario de apodo» está cerrado (`isCharacterAliasFormOpen === false`, estado inicial), **solo lo abre y no añade** (ver «Dudas»). Abierto: recorta; si `canAddCharacterAlias()` lo añade, vacía el campo y vuelve a cerrar el formulario.
  - `canAddCharacterAlias()`: cerrado → `true`; abierto → recortado ≥ 3, control válido (≤ 100) y no repetido (**comparación exacta, sensible a mayúsculas y tildes**).
  - Validación del envío (`isCharacterAliasDraftValid`): el texto pendiente del campo debe estar vacío o ser válido (3-100). Un apodo escrito y no añadido **no se guarda**, pero si es inválido (1-2 letras) bloquea el envío.
  - En la ficha, los apodos vienen de `item.Apodos[].Apodo`. La API incluye ahí también el nombre actual (`Apodos: [{ …, "Apodo": "Kaladin" … }]` con `Nombre: "Kaladin"`), así que el nombre aparece como chip.
- **Relaciones**: sección «Relaciones» (icono `hub`). Buscador (`placeholder` «Buscar personaje», `createCharacterRelationFilter`). Lista de todos los personajes del libro (`getFilteredCreateCharacterRelations`: orden por estado del libro, §3.3, filtrado por nombre sin tildes); icono `check_circle` si ya está relacionado, `person_add` si no; tocar → `addCreateCharacterRelation`: ignora al propio personaje (en ficha) y a los ya añadidos (**no alterna: no se quita tocando otra vez**). Debajo, una fila por relación: nombre en negrita, campo «Parentesco» y botón `close` (`aria-label` «Eliminar relación») → `removeCreateCharacterRelation`.
  - En la ficha: cada `item.Relaciones[]` → `{ relationId: relation.Id, id: Relativo.Id ?? PersonajeRelacionadoId ?? 0, name: Relativo.Nombre ?? getCharacterName(id, relation.Nombre), relation: Parentesco }`; se descartan las de id 0. **Ojo: `relation.Id` en la API es el id del personaje relacionado, no el de la relación** (ver «Dudas»).
  - Nombre visible de un personaje relacionado (`getCharacterName`): el de la lista del libro (ids comparados como número), si no el `Nombre` de la fila de la API, si no «Personaje {id}».

### 2.4 Localizaciones (`locations`)

| Campo | Control | Validación | UI móvil |
|---|---|---|---|
| Estado | `locationStatusId` | `required` | Desplegable «Estado» con `locationStates` |

- **Estados de localización** (`loadLocationStates`): `GET /estado_localizacion/catalogo` (acepta array, `{Estados: []}` o `{Items: []}`). Se combinan con los que traen las localizaciones del libro (`Localizaciones[].Estados`): por id **numérico** (la API los mandaba como texto hasta el 24/10/2026), solo con id y nombre, **ordenados por `Nombre`**. Error del catálogo → solo los del libro.
- **Estado por defecto**: si está vacío, el de nombre `buen estado` (sin tildes/mayúsculas).
- En ficha, si el estado sigue vacío cuando llega el catálogo, se rellena con el del elemento.

### 2.5 Eventos (`events`)

| Campo | Control | Validación | UI móvil |
|---|---|---|---|
| Localización | `locationId` + texto del buscador `eventLocationSearch` | `required` | Autocompletado «Localización» |
| Personajes (participantes) | `selectedCharacterIds: number[]` | — | Sección «Personajes» |

- **Autocompletado**: abre el panel al enfocar o tocar; opciones = `book.Localizaciones` filtradas por el texto (sin tildes, `includes`); se muestra `Nombre`; se activa la primera opción; elegir → `locationId = Id` y el texto pasa a ser el objeto. **Escribir** borra `locationId`: hay que elegir una opción. Sin coincidencias: opción deshabilitada «No hay localizaciones disponibles». Si el libro no tiene localizaciones, pista «Falta la localización base del libro.».
- **Localización por defecto**: si está vacía, la de nombre `sin localizacion` (sin tildes). En la API es la global `Id = 1`.
- **Participantes**: cabecera «Personajes» con el contador `selectedCharacterIds.length`; buscador `placeholder` «Buscar personaje» (`characterFilter`); los personajes agrupados por grupo (`getCharacterGroups`), con el nombre del grupo como subtítulo (`Principales`, `Recurrentes`, `Secundarios`, `Desaparecidos`, `Muertos`, `Antiguos` o «Sin grupo»); cada personaje es un botón que alterna (`prepareEventCharacter` → `toggleEventCharacter`) con icono `check_circle` / `radio_button_unchecked`.
  - Agrupación: filtra por nombre (sin tildes); conserva el orden recibido (el de `getCharacters()`, §3.3) dentro de cada grupo; ordena los grupos por el menor `OrdenGrupo` de sus miembros (sin `OrdenGrupo` = infinito) y, a igualdad, por el nombre del grupo. Incluye personajes heredados de libros/sagas previas.

### 2.6 Conceptos (`concepts`)

Solo nombre y entradas.

### 2.7 Citas (`quotes`)

| Campo | Control | Validación | UI móvil |
|---|---|---|---|
| Página | `page` | `required`, `min(1)` | Campo numérico «Página», `min="1"` |
| Personaje | `characterId` + texto `quoteCharacterSearch` | `required` | Autocompletado «Personaje» |

- Nombre: la etiqueta es «Título».
- Autocompletado del personaje: opciones = `getCharacters()` (§3.3) filtradas por nombre; elegir fija `characterId`; escribir lo borra; sin coincidencias «No hay personajes disponibles».

### 2.8 Organizaciones (`organizations`)

| Campo | Control | Validación | UI móvil |
|---|---|---|---|
| Relaciones con personajes y localizaciones | `createOrganizationRelations[]`, cada una `{ kind: 'character'|'location', id, name, description }` | **ninguna en el formulario** (la API exige ≥ 15 caracteres en `Descripcion`) | Sección «Relaciones» |

- Buscador `placeholder` «Buscar entidad» (`createOrganizationRelationFilter`), común a las dos columnas.
- Columna «Personajes»: todos los personajes por orden de estado del libro (§3.3), filtrados por nombre; icono `person_add` siempre (la clásica cambia a `check_circle`); clase `is-selected` si ya está.
- Columna «Localizaciones»: las del libro **sin** la de nombre `sin localizacion`, filtradas, ordenadas por nombre (`localeCompare` `es`); icono `add_location_alt`.
- Tocar añade, sin alternar; duplicados ignorados.
- Una fila por relación: nombre, campo «Descripción», botón `close` («Eliminar relación»). La clásica pone `maxlength="250"` y «Sin relaciones.» si no hay; la móvil no tiene límite ni texto vacío.
- En la ficha, las relaciones llegan después, con la petición de relaciones (§1.6); el nombre de la localización es `Localizacion.Nombre ?? LocalizacionNombre ?? getLocationName(id, Nombre)` (reserva «Localización {id}»).

### 2.9 Condición de envío y pistas

`canSubmit()`: `entityForm` válido **y** todas las entradas válidas **y** (si personajes) todos los parentescos válidos **y** (si personajes) el apodo pendiente vacío o válido **y** `book.Id` no nulo.

Pista para el botón deshabilitado (solo la usa la clásica, como `matTooltip`; la móvil no la muestra) — `getCreateSubmitHint()`, en este orden:
1. «Espera a que el libro esté cargado.»
2. «El nombre debe tener al menos 3 caracteres.»
3. (personajes) «Selecciona un estado para el personaje.»
4. (personajes) «Selecciona sexo o género del personaje.»
5. (personajes) «Completa el parentesco de las relaciones seleccionadas.»
6. (personajes) «El apodo pendiente debe tener al menos 3 caracteres.»
7. (localizaciones) «Selecciona un estado para la localización.»
8. (eventos) «Selecciona una localización para el evento.»
9. (citas) «Indica la página de la cita.»
10. (citas) «Selecciona el personaje de la cita.»
11. «Completa las entradas existentes: título mínimo 3 caracteres y descripción mínima 15.»

Límites del cliente frente a la API: nombre 3-100 (API 2-100), título de entrada 3-100 (API 2-100), descripción ≥ 15 (API ≥ 15), apodo 3-100 (API 2-100), parentesco 2-100 (API 2-100 vía `validate_name`), descripción de relación de organización sin límite (API ≥ 15).

### 2.10 Restablecer el formulario (`resetCreateForm`)

Borra el `IdCliente` del alta de personaje, `entityForm.reset()`, vacía buscadores, relaciones, apodos, cierra el formulario de apodo, `characterNameChangeMode = 'narrative'`, una sola entrada por defecto, y vuelve a poner los valores por defecto (estado de localización, localización del evento, estado de personaje). Se llama al entrar en una ruta de alta, al abrir una ficha, al cerrarla y tras crear.

---

## 3. La lista

### 3.1 Barra superior de la lista

- Total: `{n} {etiqueta}`, con etiqueta = `singular` si n = 1, si no `title` en minúsculas. Ej.: «1 personaje», «12 localizaciones».
- Selector «Mezclados» / «Por libro» (`aria-label` «Orden del listado») solo si `shouldShowViewMode()`: no en formulario y algún elemento heredado tiene `OrigenContexto === 'libro_previo'`. Cambia `groupItemsByOrigin` (por defecto `true`). No se recuerda entre visitas.

### 3.2 Modo «Por libro» (por defecto)

- Primer bloque, título fijo «Libro actual» (se pinta aunque esté vacío): `getCurrentItems()`.
- Después, un bloque por origen heredado: `getOriginGroups()`, con título = etiqueta de origen, ordenados por su clave de orden.
- **Elemento del libro actual**:
  - Personajes: no si `EsLibroActual === false`, ni si `EsSagaPrevia` o `EsSeccionOrigen`, ni si `OrigenContexto` ∈ {`libro_previo`,`saga_previa`,`saga_base`}.
  - Resto: `EsLibroActual !== false` y `OrigenContexto` ∉ {`libro_previo`,`saga_previa`,`saga_base`} (aquí `EsSagaPrevia`/`EsSeccionOrigen` no cuentan).
- **Etiqueta del origen heredado** (`getInheritedOriginLabel`), con prefijo `"{OrdenOrigen}º - "` si `OrdenOrigen` no es nulo:
  - `libro_previo` → `"{OrdenOrigen}º - {nombre del libro previo}"` buscando en `book.LibrosPrevios` el de `Orden` ≈ `OrdenOrigen` (tolerancia 0,0001), o «Libro previo».
  - `EsSagaPrevia` o `saga_previa` → «Saga previa».
  - `EsSeccionOrigen` → «Sección de saga».
  - `saga_base` → «Saga base».
  - otro → «Contexto actual».
- **Clave de orden del origen**: actual = −∞; si hay `OrdenOrigen`, ese número; si no, `libro_previo` 1000, saga previa 2000, sección 3000, `saga_base` 4000, otro `MAX_SAFE_INTEGER`.

### 3.3 Orden de los elementos

- **Personajes, `getCharacters()`**: por clave de origen (§3.2), luego `OrdenGrupo` (sin él, al final), luego `Nombre` (`localeCompare`). Es el orden de «Por libro», del autocompletado de citas y de los grupos de eventos.
- **Resto, «Por libro»** (`getSortedItemsByOrigin`): por clave de origen y después `Nombre` (`localeCompare`).
- **«Mezclados»** (`getMixedItems`): personajes por «orden de estado del libro» (`getCharactersByBookStateOrder`: `OrdenGrupo` o, si falta, el rango del grupo `Principales`=1…`Antiguos`=6, sin grupo = `MAX_SAFE_INTEGER`; luego nombre); resto, alfabético por `Nombre`.
- `OrdenGrupo` y `Grupo` los da la API (y los refresca `GET /libros/{id}/personajes/orden`, §4.4).

### 3.4 Qué muestra cada fila

Botón de fila completa: icono + nombre (`item.Nombre`, negrita) + meta (texto pequeño) + `chevron_right`. Al tocar → `openItem(item)`.

- **Icono** (`getItemIcon`): tipo distinto de personaje → el icono del tipo (§1.2). Personaje → `getCharacterIcon`:
  1. Símbolo de texto (no Material): estado actual con «asesinad» → `✕`; con «muert» → `☠`; grupo `Muertos` → `☠`.
  2. Estado con «desaparecid» → Material `wrong_location`.
  3. Por grupo: `Principales` → `star`; `Recurrentes` → `sync_alt`; `Secundarios` → **ninguno** (cadena vacía); `Desaparecidos` → `wrong_location`; `Antiguos` → `history`; sin grupo/otro → `person_outline`.
  - En la móvil, si el icono es Material se pinta `mat-icon`; si no, un `span` con el símbolo (en `Secundarios`, un `span` vacío).
  - «Estado actual» = `Estados[último].Estado.Nombre` — ver «Dudas»: con la forma actual de la API esto siempre da vacío.
- **Meta** (`getItemMeta`), en orden: cita con `Pagina` → «Página {n}»; si el elemento tiene `Estado` (localizaciones: texto del estado, p. ej. «Buen estado» o «Desconocido») → ese texto; `OrigenContexto === 'libro_previo'` → etiqueta del libro previo; `EsSagaPrevia` → «Saga previa»; `EsLibroActual === false` → «Heredado»; si no → «Libro actual».
- La clásica, además, colorea las fichas por grupo/estado y marca las heredadas (`getItemClasses`/`getCharacterClasses`) y pone un `tooltip`: personajes «{Grupo|Sin grupo}[ · {estado}]»; resto «{meta} · {descripción en texto plano de la primera entrada}». La móvil no.

### 3.5 Lista vacía

Icono del tipo, título «Aún no hay {title en minúsculas}» y texto «Créalo desde el botón superior cuando aparezca en la historia.» (La clásica: «No hay {title en minúsculas} registrados.».)

### 3.6 Lo que no se puede editar / tarjeta de detalle

- No hay buscador ni filtros en la lista (solo «Mezclados»/«Por libro»).
- Los elementos heredados (libros/sagas previas) se abren y editan igual que los del libro actual: el formulario no distingue origen.
- **Tarjeta de detalle** (y en la clásica): en teoría muestra, para tipos distintos de personaje, «Detalle», un formulario secundario de datos raíz (`editForm`: nombre, estado de localización, localización del evento como desplegable, página y personaje de la cita como desplegable; botón «Guardar datos»), «Personajes del evento», la lista de «Entradas narrativas» con editar/borrar una a una y un editor para añadir («Añadir entrada» / «Actualizar», «Cancelar»), las relaciones de la organización («Vincular personaje», «Vincular localización», editar/borrar cada relación) y el botón «Quitar del libro» (`link_off`). **Está condicionada a `canEditSelectedItem()` dentro de la rama de lista (no formulario)**, y esa combinación no se da nunca: `selectedItem` solo es no nulo con `formMode = 'update'`, que lleva al formulario (ver «Dudas»). Es código muerto en la práctica; se documenta en §4.3 y §6.2 por si se quiere recuperar.
- Personajes: `canEditSelectedItem()` y `canDetachSelectedItem()` excluyen siempre a los personajes: no hay «Quitar del libro» para personajes.

---

## 4. Llamadas a la API

Base: `environment.apiUrl` (producción `https://libros-api.yosiftware.es/`, QA `https://qa-api.yosiftware.es/`). Autenticación JWT por el interceptor común. Todas las rutas siguientes son relativas a esa base.

### 4.1 Catálogo de llamadas

| # | Método y ruta | Cuerpo (campos exactos) | Respuesta esperada |
|---|---|---|---|
| L1 | `GET libros/{libroId}` | — | `Book` (se normaliza) |
| L2 | `GET libros/{libroId}/personajes/orden` | — | `[{ Id, Nombre, Grupo, OrdenGrupo }]` |
| L3 | `GET personajes/estados/catalogo` | — | `[{ Id, Nombre }]` |
| L4 | `GET estado_localizacion/catalogo` | — | `[{ Id, Nombre }]` (o `{Estados}`/`{Items}`) |
| L5 | `POST personajes` | `{ LibroId, Apodo, Sexo, Entradas: [{ Nombre, Descripcion }], IdCliente? }` | `Character` (201 al crear; **200** con el ya creado si se repite el `IdCliente` en el mismo libro) |
| L6 | `GET personajes/{id}?libroId={libroId}` | — | `Character` |
| L7 | `PATCH personajes/{id}` | `{ Sexo }` (número) | `Character` o `{success, message}` |
| L8 | `PUT personajes/{id}/estados/libros/{libroId}` | `{ EstadoId }` | estado |
| L9 | `POST personajes/{id}/relaciones` | `{ LibroId, PersonajeRelacionadoId, Parentesco, Reflejada: false }` | relación (201) |
| L10 | `PUT personajes/{id}/relaciones/{idRelacion}` | `{ LibroId, PersonajeRelacionadoId, Parentesco, Reflejada: false }` | relación |
| L11 | `DELETE personajes/{id}/relaciones/{idRelacion}` | — | `{ success, message }` (la interfaz dice `{eliminado}`) |
| L12 | `POST personajes/{id}/apodos` | `{ LibroId, Apodo }` | apodo |
| L13 | `DELETE personajes/{id}/apodos/{ApodoId}` | — | `{eliminado}`; **409 `nickname_used_as_contextual_name`** si es el nombre contextual |
| L14 | `PATCH personajes/{id}/libros/{libroId}/apodo` | `{ Apodo }` | `Character` — cambio narrativo: el nombre anterior queda como apodo histórico |
| L15 | `PUT personajes/{id}/libros/{libroId}/apodo` | `{ Apodo }` | `Character` — corrección de errata: repunta el contexto al apodo correcto |
| L16 | `POST localizaciones` | `{ LibroId, Nombre, Entradas: [...], EstadoId? }` | `{ Id, Nombre, Id_Estado, Estado, Entradas }` |
| L17 | `PATCH localizaciones/{id}` | `{ LibroId, Nombre, EstadoId }` | localización o `{success,message}` |
| L18 | `POST conceptos` | `{ LibroId, Nombre, Entradas }` | `{ Id, Nombre, Entradas }` |
| L19 | `PATCH conceptos/{id}` | `{ LibroId, Nombre }` | |
| L20 | `POST organizaciones` | `{ LibroId, Nombre, Entradas }` | `{ Id, Nombre, Entradas, Personajes, Localizaciones }` |
| L21 | `PATCH organizaciones/{id}` | `{ LibroId, Nombre }` | |
| L22 | `POST eventos` | `{ LibroId, Nombre, Entradas, Id_Localizacion, Personajes: [ids] }` | `{ Id, Nombre, Id_Localizacion, Entradas, Personajes }` |
| L23 | `PATCH eventos/{id}` | `{ LibroId, Nombre, Id_Localizacion, Personajes: [ids] }` (la API conserva los participantes ocultos en ese libro) | |
| L24 | `POST citas` | `{ LibroId, Nombre, Entradas, Pagina, PersonajeId }` | `{ Id, Nombre, Pagina, Id_Personaje, Entradas }` |
| L25 | `PATCH citas/{id}` | `{ LibroId, Nombre, Pagina, PersonajeId }` | |
| L26 | `GET organizaciones/{id}/personajes?libroId=` | — | `[{ OrganizacionId, PersonajeId, Nombre, Descripcion, Origen, Orden }]` |
| L27 | `POST organizaciones/{id}/personajes` | `{ LibroId, PersonajeId, Descripcion }` | fila; 409 `…_relation_exists` si ya existe; 400 `invalid_description` (`field: Descripcion`) si < 15 |
| L28 | `PUT organizaciones/{id}/personajes/{personajeId}` | `{ LibroId, Descripcion }` | fila |
| L29 | `DELETE organizaciones/{id}/personajes/{personajeId}` | — | `{eliminado}` |
| L30 | `GET organizaciones/{id}/localizaciones?libroId=` | — | `[{ OrganizacionId, LocalizacionId, Localizacion?, LocalizacionNombre?, Nombre, Descripcion, Origen, Orden }]` |
| L31 | `POST organizaciones/{id}/localizaciones` | `{ LibroId, LocalizacionId, Descripcion }` | fila (mismas reglas que L27) |
| L32 | `PUT organizaciones/{id}/localizaciones/{localizacionId}` | `{ LibroId, Descripcion }` | fila |
| L33 | `DELETE organizaciones/{id}/localizaciones/{localizacionId}` | — | `{eliminado}` |
| L34 | `GET entradas/{tipo}/{id}?libroId=` | — | `[{ Id, Nombre, Descripcion, Origen, Orden }]` |
| L35 | `POST entradas/{tipo}/{id}` | `{ LibroId, Entradas: [{ Nombre, Descripcion }] }` | entradas creadas |
| L36 | `PUT entradas/{idEntrada}` | `{ Nombre, Descripcion }` | entrada |
| L37 | `DELETE entradas/{idEntrada}` | — | `{eliminado}` (borrado lógico) |
| L38 | `DELETE {localizaciones|conceptos|organizaciones|eventos|citas}/{id}/libros/{libroId}` | — | `{success,message}` — quitar del libro (solo desde la tarjeta muerta) |

`Descripcion` de las entradas es **RTF** (cadena que empieza por `{\rtf`, generada por el editor con `htmlToRtf`).

Forma de un personaje en la API: `{ Id, Nombre, Sexo (0|1|2), Apodos: [{ Id, ApodoId, Apodo, Origen, Orden, Borrado }], Estados: [{ Id (=EstadoId), RelacionId, EstadoId, Estado: "Vivo" (texto), Origen, Orden }], Relaciones: [{ Id (=PersonajeRelacionadoId), RelacionId, PersonajeRelacionadoId, Nombre, Parentesco, Origen, Orden, Reflejada, Borrada }], Entradas, Grupo, OrdenGrupo, OrigenContexto, EsLibroActual, EsSagaPrevia, EsSeccionOrigen, OrdenOrigen, … }`. Las interfaces del front declaran `Estados[].Estado` como objeto `{Id, Nombre}` y `Relaciones[].Id` como id de relación: **no coinciden** con la API (ver «Dudas»).

### 4.2 Encadenado al **crear**

**Común**: `submitEntityForm` → si se abandonó (cambio de cuenta) nada; en ficha → actualizar; si no → `createEntity()`: si ya hay un envío en curso, nada; si `!canSubmit()` → aviso «Completa los campos obligatorios» (error) y fin. Construye `basePayload`: `{ LibroId: book.Id, Nombre: name (sin recortar), Entradas: drafts.map({ Nombre: título ?? nombre, Descripcion: descripción ?? '' }) }`.

**Localización / concepto / evento / cita**:
1. Cargador global activado + `isSubmittingEntity = true`.
2. Una sola petición: L16 (con `EstadoId` solo si hay estado) / L18 / L22 (`Id_Localizacion: Number(locationId)`, `Personajes: selectedCharacterIds`) / L24 (`Pagina: Number(page)`, `PersonajeId: Number(characterId)`).
3. Al responder: L1 (recarga el libro entero).
4. Éxito: guarda el libro en la tienda y en local, indicador «guardado» (`saveIndicator.notifySaved`), `resetCreateForm()`, vacía participantes, aviso «{Singular con mayúscula} creado» (éxito; p. ej. «Localización creado», ver «Dudas»), y vuelve a la lista si la pantalla sigue viva.
5. Error (de cualquiera de los pasos): marca el campo señalado por la API (§6.4) y aviso de API con título «Error al crear entidad narrativa».
6. Siempre: cargador fuera e `isSubmittingEntity = false` (`finalize`: solo retira el cargador si la pantalla sigue viva).

**Organización**: igual que arriba, pero el paso 2 es: L20 → con el `Id` devuelto, **en paralelo** (`forkJoin`) una L27 por cada relación de personaje (`{LibroId, PersonajeId, Descripcion}`) y una L31 por cada localización (`{LibroId, LocalizacionId, Descripcion}`); sin relaciones, se sigue directamente. Si alguna relación falla, todo el alta se da por fallida aunque la organización ya exista (ver «Dudas»).

**Personaje**:
1. Aviso de nombre repetido: si algún personaje del libro tiene el mismo nombre (recortado, sin tildes ni mayúsculas), `window.confirm("Ya hay un personaje llamado «{Nombre}» en este libro. ¿Quieres crear otro con el mismo nombre?")`; cancelar → fin. La API no rechaza nombres repetidos.
2. Se fija el libro y la cuenta (`pendingWork.scope`) del momento. `characterCreateClientId ??= createClientRequestId()` (UUID v4; `shared/client-request-id.ts`): **se conserva entre reintentos** del mismo formulario.
3. Cargador + `isSubmittingEntity`.
4. L5 con `{ LibroId, Apodo: Nombre, Sexo: Number(characterSex), Entradas, IdCliente }`, con **tiempo máximo de 30 000 ms** hasta la primera respuesta (`CHARACTER_CREATE_STEP_TIMEOUT_MS`).
5. En cuanto responde: `bookStore.upsertCharacter(libro, personaje)`: si ya estaba (mismo id numérico) se mezcla; si no, se añade al final con `EsLibroActual: true, OrigenContexto: 'actual', EsSagaPrevia: false, EsSeccionOrigen: false`. **La lista lo muestra ya, sin recargar el libro.**
6. Si la cuenta cambió entretanto → se corta (`EMPTY`): no se envía nada más con la cuenta nueva; el observable termina sin resultado (sin aviso ni navegación; el cargador sí se retira).
7. Pasos posteriores, **todos en paralelo** (`forkJoin`), cada uno con 30 s de tiempo máximo y cuyo fallo no deshace el alta sino que devuelve su etiqueta:
   - Estado: solo si el personaje devuelto no tiene ya un estado con `Origen === libro` y id = el elegido (`hasBookState`; id leído de `EstadoId ?? Estado.Id ?? Id`). La API pone «Vivo» por defecto. → L8 `{ EstadoId }`. Etiqueta «el estado».
   - Una L9 por relación: `{ LibroId, PersonajeRelacionadoId, Parentesco, Reflejada: false }`. Etiqueta «las relaciones».
   - Una L12 por apodo: `{ LibroId, Apodo }`. Etiqueta «los apodos».
8. Etiquetas únicas de los fallos → `failedDetails`.
9. Si hubo pasos: L6 (30 s; si falla o tarda, vale el personaje del alta). Si no, el del alta.
10. `upsertCharacter` con la ficha final y, si sigue la misma cuenta, `characterOrderRefreshSrv.refresh(libro)` (§4.4) para grupo y posición.
11. Éxito: `characterCreateClientId = null`, indicador «guardado», `resetCreateForm()`, aviso: sin fallos «Personaje creado» (éxito); con fallos «Personaje creado, pero no se ha podido guardar {etiquetas}. Revísalo en su ficha.» (error), donde las etiquetas se unen como «A, B ni C» (p. ej. «el estado ni los apodos»). Vuelve a la lista si la pantalla sigue viva. **No se recarga el libro entero.**
12. Error (solo del alta L5 o de la tubería):
    - Marca el campo de la API (§6.4).
    - Si el código es `invalid_client_request_id` o `character_client_request_conflict` → se descarta el `IdCliente` (el siguiente intento genera otro).
    - Si fue el tiempo máximo (`TimeoutError`): «La API no ha respondido a tiempo. Si el personaje se ha creado aparecerá en la lista; si vuelves a guardar este formulario no se duplicará.» (error).
    - Si no: aviso de API con título «Error al crear el personaje».
    - Si sigue la misma cuenta: refresco del orden (§4.4), que añade a la lista un alta que sí se guardó aunque su respuesta se perdiera.
13. Siempre: cargador fuera (`finalize`).

### 4.3 Encadenado al **guardar una ficha** (`persistCurrentEntityUpdate`)

Se usa desde el botón Guardar (`updateEntityFromForm`) y desde el autoguardado al salir (`canDeactivate`). Secuencia **estrictamente en serie** (cada paso espera al anterior):

1. **Raíz** (`getFormUpdateRequest`), con `base = { LibroId, Nombre: name }`:
   - locations → L17 `{ LibroId, Nombre, EstadoId: Number(locationStatusId) }`
   - concepts → L19 `{ LibroId, Nombre }`
   - organizations → L21 `{ LibroId, Nombre }`
   - events → L23 `{ LibroId, Nombre, Id_Localizacion: Number(locationId), Personajes: selectedCharacterIds }`
   - quotes → L25 `{ LibroId, Nombre, Pagina: Number(page), PersonajeId: Number(characterId) }`
   - characters → `updateCharacterFromMainForm`: en paralelo L7 `{ Sexo: Number(characterSex) }` + L8 `{ EstadoId: Number(characterStatusId) }` (**siempre**, haya cambiado o no) + solo si el nombre cambió (comparación exacta) L15 (si `characterNameChangeMode === 'correction'`) o L14 (si no) con `{ Apodo: name }`. **El nombre del personaje no va en ninguna PATCH raíz**: solo por L14/L15.
2. **Entradas** (`syncEntriesFromForm`), todo en paralelo, comparando con `selectedItem.Entradas` (las del libro):
   - una L36 `{ Nombre, Descripcion }` por **cada** entrada que ya tenía id (aunque no haya cambiado);
   - una sola L35 `{ LibroId, Entradas: [nuevas] }` con todas las entradas sin id;
   - una L37 por cada entrada original cuyo id ya no está.
3. **Relaciones propias** (`syncSpecificRelationsFromForm`):
   - Organizaciones, en paralelo, comparando con las filas cargadas (`organizationCharacterRelations`/`organizationLocationRelations`): L29/L33 por cada relación que ya no está; por cada relación del formulario, L28/L32 `{ LibroId, Descripcion }` si ya existía (**siempre, aunque no cambie**) o L27/L31 si es nueva.
   - Personajes, en paralelo, comparando con `selectedItem.Relaciones` y `selectedItem.Apodos`:
     - L11 por cada relación original cuyo `Id` ya no está entre los `relationId` del formulario;
     - por **cada** relación del formulario: L10 `{ LibroId, PersonajeRelacionadoId, Parentesco, Reflejada: false }` si tiene `relationId`, si no L9 con el mismo cuerpo;
     - L13 (con `ApodoId`) por cada apodo original cuyo texto (sin tildes, recortado) ya no está;
     - L12 `{ LibroId, Apodo }` por cada apodo del formulario cuyo texto no estaba.
   - Resto: nada.
4. **L1** (recarga del libro).
5. Con el libro: lo guarda (local y tienda), vuelve a buscar el elemento en él, **toma la foto de referencia**, actualiza el borrador local (que, sin cambios, se retira) e indicador «guardado».

Tras el botón Guardar: éxito → aviso «{Singular} actualizado» (éxito) y `closeUpdateForm()` (vuelve a la lista); error → marca el campo (§6.4) y aviso de API «Error al actualizar entidad narrativa». Si `!canSubmit()` o no hay elemento: marca todo como tocado y aviso «Revisa los datos de la entidad» (error). No hay deshacer: si falla el paso 3, los pasos 1 y 2 ya están guardados.

**Tarjeta de detalle (inaccesible, §3.6)**, por si se recupera:
- «Guardar datos» → `saveRootEdit`: requiere `canSubmitRootEdit` (nombre válido, evento con localización, cita con página y personaje); L17 (`EstadoId` solo si hay) / L19 / L21 / L23 (`Personajes: editEventCharacterIds`) / L25 → L1 → «{Singular} actualizado»; error «Error al actualizar entidad narrativa» (aviso de API).
- Entrada: «Añadir entrada»/«Actualizar» → `saveEntry`: L36 si se edita, si no L35 con una entrada → L1 → «Entrada guardada»; error «Error al guardar la entrada». Validación: título 3-100 (`detailEntryTitle`) y descripción ≥ 15; si no, «Completa la entrada narrativa».
- Borrar entrada (`deleteEntry`): **sin confirmación**, L37 → L1 → «Entrada eliminada»; error «Error al eliminar la entrada».
- Relaciones de organización: «Vincular personaje» L27 / «Vincular localización» L31 con `relationDescription` (15-250) → recarga de relaciones → «Relación con personaje guardada» / «Relación con localización guardada»; error «Error al guardar la relación». Editar: L28/L32 con `relationEditDescription` (15-250) → «Relación actualizada»; error aviso de API «Error al actualizar la relación». Borrar (sin confirmación): L29/L33 → «Relación eliminada»; error «Error al eliminar la relación». En las filas: «Sin descripción» si no tiene.
- «Quitar del libro» (`detachSelectedItem`): solo tipos distintos de personaje y elementos del libro actual; `window.confirm("¿Quitar {Nombre} de este libro?")`; L38 → L1 → «{Singular} quitado del libro»; error «Error al quitar la entidad del libro».

### 4.4 Refresco del orden de personajes

`characterOrderRefreshSrv.refresh(libroId)`: una sola petición a la vez por libro (las llamadas simultáneas comparten la misma). L2 → busca los ids que la lista local no tiene; si son entre 1 y 5, pide cada ficha con L6 (los fallos se ignoran); si son más de 5 no los pide. Después mezcla: la lista queda **en el orden de L2**, cada personaje conocido con `Nombre`, `Grupo` y `OrdenGrupo` de L2 encima de sus datos; los nuevos con su ficha (marcados `EsLibroActual: true, OrigenContexto: 'actual'`) o, sin ficha, con datos mínimos (`Sexo: null`, arrays vacíos); y al final los locales que L2 no trae. Cualquier error se ignora en silencio. Mientras dura, `isRefreshing$` = true (la clásica muestra «Actualizando orden» en los paneles de personajes; la móvil no).

Se llama: al entrar en la lista de personajes y cada vez que cambia el libro; tras crear un personaje (éxito o error).

---

## 5. Guardado, salida y borradores

### 5.1 Foto de referencia (snapshot)

`createUpdateSnapshot()` es un JSON con: `listPath`, `entityId`, `name`, `locationStatusId`, `characterStatusId`, `characterSex`, `characterNameChangeMode`, `locationId`, `page`, `characterId`, `eventCharacterIds` (ordenados de menor a mayor), `entries: [{ id|null, title, description }]` (en su orden), `aliases` (ordenados con `localeCompare('es', {sensitivity: 'base'})`), `characterRelations: [{ id, relationId|null, value }]` (por `id`), `organizationRelations: [{ kind, id, value }]` (por `"kind:id"`).

- Se toma (`refreshUpdateSnapshot`) al abrir la ficha, al llegar las relaciones de una organización y tras guardar. En alta vale `''`.
- **Hay cambios pendientes** (`hasPendingUpdateChanges`) solo en modo ficha, con foto tomada, y si la foto actual difiere. **El alta nunca tiene «cambios pendientes»**.

### 5.2 `canDeactivate` y guardado al salir

1. Si la ficha está abandonada (cambio de cuenta) o no hay cambios pendientes → se puede salir.
2. Si hay cambios pero el formulario no es válido (`!canSubmit()`) → aviso «No se puede salir: revisa los cambios pendientes de la entidad y sus entradas» (error) y **no se sale**.
3. Si no, se guarda con la misma secuencia de §4.3 (sin cargador global ni aviso de éxito) y se sale al terminar; si falla, aviso de API «No se pudieron autoguardar los cambios antes de salir» y **no se sale**.

Lo usan el guard de la ruta y la flecha atrás de la ficha (§1.5). En alta siempre se sale sin aviso y lo escrito se pierde.

### 5.3 Borrador local (PendingWorkService)

- **Clave lógica**: `entidad:{libroId}:{listPath}:{entidadId}`. **Clave real en `localStorage`**: `libros:pendiente:{ámbito}:{clave}`, donde ámbito = entorno + cuenta presentada. Valor: `{ "guardado": ISO-8601, "borrador": <foto §5.1> }`. Sin almacenamiento, se ignora.
- **`keepEntityDraft()`**: si no está abandonada, hay ámbito, libro y elemento: con cambios pendientes guarda la foto; sin ellos **retira** el borrador. Se llama:
  - 400 ms después del último evento DOM `input` o `change` dentro del componente;
  - al ocultarse la página (`visibilitychange` → `hidden`) y en `pagehide`;
  - tras cada guardado correcto.
- **`restoreEntityDraft(id)`**, al abrir la ficha justo después de tomar la foto: fija el ámbito de la ficha (`accountScope`); si hay ámbito, no está abandonada y hay libro, **saca** (lee y borra) el borrador; si es de la misma entidad y tipo, vuelca todos los campos (las entradas se recrean con sus validadores; los nombres de relaciones se resuelven con la lista del libro). Si tras volcarlo ya no difiere de la foto (el servidor ya lo tenía) no hace nada más; si difiere, lo vuelve a guardar y avisa «Hemos recuperado los cambios de esta ficha que no llegaron a guardarse» (éxito). Los cambios recuperados se guardan con Guardar o al salir.
- Solo hay borrador en **modo ficha**; el formulario de alta no se protege.

### 5.4 Cambio de cuenta (`abandon`)

`PendingWorkService.abandonAll()` (lo llama el servicio de ámbito de cuenta antes de presentar otra identidad) pone el ámbito a `null` y llama a `abandon()` de cada editor registrado (el componente se registra en el constructor, y se da de baja en `ngOnDestroy`). `abandon()`: marca `abandoned = true` y, si había cambios pendientes, guarda la foto con el **ámbito de la cuenta anterior**. A partir de ahí: `submitEntityForm` y `saveRootEdit` no hacen nada; `canDeactivate` deja salir sin guardar; `keepEntityDraft` y `restoreEntityDraft` no actúan. Solo la misma cuenta, en el mismo entorno, recupera el borrador al volver a abrir la ficha.

En el alta de personaje (§4.2), los pasos posteriores y el refresco del orden solo se hacen si sigue la misma cuenta (`isSameAccount`).

### 5.5 Al destruir la pantalla

Se da de baja del `PendingWorkService`; si había un alta en curso, retira el cargador global (el alta sigue y su resultado llega a la lista, pero no se navega); marca `isDestroyed`.

---

## 6. Borrados, confirmaciones, avisos, carga y errores

### 6.1 Confirmaciones

| Situación | Texto literal |
|---|---|
| Crear personaje con nombre repetido | «Ya hay un personaje llamado «{Nombre}» en este libro. ¿Quieres crear otro con el mismo nombre?» |
| Quitar del libro (tarjeta inaccesible) | «¿Quitar {Nombre} de este libro?» |

No hay confirmación para quitar entradas, apodos ni relaciones del formulario: se quitan en local y se borran en la API al guardar.

### 6.2 Avisos (`SnackbarModule`, duración por defecto 3000 ms)

Tipos: `successBar` → éxito, `errorBar` → error, `infoBar` → información. `openApiError(error, título)`: título = el texto genérico; mensaje = texto del backend (`error` del cuerpo) o, sin él, el genérico; con estado HTTP 0, «No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.»; con `403 platform_restriction_active`, la frase de restricción; **no se muestra nada** si el código es `usage_policy_acceptance_required`, `creation_policy_acceptance_required` o `platform_rules_acceptance_required`.

| Texto | Tipo | Cuándo |
|---|---|---|
| Hemos recuperado los cambios de esta ficha que no llegaron a guardarse | éxito | borrador restaurado |
| No se pudieron precargar todos los datos del objeto | error | excepción al abrir |
| Para añadir una nueva entrada, primero las entradas existentes deben ser válidas. (título «Completa las entradas», 4200 ms) | info | «Nueva entrada» con entradas inválidas |
| Completa los campos obligatorios | error | crear con formulario inválido |
| {Singular} creado | éxito | alta correcta (no personaje) |
| Error al crear entidad narrativa | error API | alta fallida (no personaje) |
| Personaje creado | éxito | alta de personaje completa |
| Personaje creado, pero no se ha podido guardar {etiquetas}. Revísalo en su ficha. | error | alta con pasos fallidos |
| La API no ha respondido a tiempo. Si el personaje se ha creado aparecerá en la lista; si vuelves a guardar este formulario no se duplicará. | error | 30 s sin respuesta del alta |
| Error al crear el personaje | error API | alta de personaje fallida |
| Revisa los datos de la entidad | error | guardar ficha inválida |
| {Singular} actualizado | éxito | ficha guardada |
| Error al actualizar entidad narrativa | error API | guardar ficha fallido |
| No se puede salir: revisa los cambios pendientes de la entidad y sus entradas | error | salir con cambios inválidos |
| No se pudieron autoguardar los cambios antes de salir | error API | autoguardado al salir fallido |
| {Singular} quitado del libro / Error al quitar la entidad del libro | éxito / error API | tarjeta inaccesible |
| Completa la entrada narrativa / Entrada guardada / Error al guardar la entrada / Entrada eliminada / Error al eliminar la entrada | — | tarjeta inaccesible |
| Relación con personaje guardada / Relación con localización guardada / Error al guardar la relación / Relación eliminada / Error al eliminar la relación / Relación actualizada / Error al actualizar la relación | — | tarjeta inaccesible |

`{Singular}` = `singular` con la primera letra en mayúscula: Personaje, Organización, Evento, Localización, Concepto, Cita.

### 6.3 Carga

- Cargador global (`LoaderEmmitterService.activateLoader/deactivateLoader`) durante: alta, guardado con el botón, peticiones de la tarjeta, y la carga de entradas al abrir una ficha que no es de personaje. **El autoguardado al salir no lo muestra.**
- `isSubmittingEntity` bloquea un segundo envío (los dos botones de guardar se deshabilitan y `createEntity`/`updateEntityFromForm` salen al principio) y garantiza que el cargador se retira siempre (`finalize`).
- Indicador de guardado del libro (`BookSaveIndicatorService.notifySaved(libroId)`) tras cada escritura correcta.

### 6.4 Errores de la API tratados aparte

- **Campo señalado** (`markBackendField`): si el cuerpo trae `field` (o `raw.field`), sin distinguir mayúsculas, se marca el control: `Nombre`→nombre, `Apodo`→nombre, `EstadoId`→**estado de localización**, `Id_Localizacion`→localización, `Pagina`→página, `PersonajeId`→personaje de la cita. El control recibe el error `server` con el texto del backend (o «Revisa este campo.») y se marca como tocado; se quita al cambiar el campo. La plantilla móvil **no** muestra el texto `server`: solo se ve el campo en rojo con su mensaje fijo («Indica un nombre de al menos 3 caracteres.» para el nombre). Otros campos (`Entradas`, `Descripcion`, `IdCliente`, `Parentesco`, `Personajes`) no se marcan.
- **Códigos del alta de personaje**: `invalid_client_request_id` (400, `field: IdCliente`) y `character_client_request_conflict` (409) → se descarta el `IdCliente`.
- **Tiempo máximo** (`TimeoutError`) del alta de personaje → mensaje propio (§6.2).
- **Nombres duplicados**: la API no los rechaza en ningún tipo; el único aviso es la confirmación del alta de personaje (§6.1). No hay comprobación de duplicados para los demás tipos.
- Códigos útiles de la API (no tratados aparte por el front, llegan como texto en el aviso): `invalid_name`/`field: Nombre`, `invalid_entries`/`field: Entradas`, `book_id_required`, `location_state_not_found`/`EstadoId`, `location_id_required`/`location_not_found`/`Id_Localizacion`, `invalid_event_characters`/`Personajes`, `page_required`/`Pagina`, `character_id_required`/`character_not_found`/`PersonajeId`, `invalid_description`/`Descripcion` (relaciones de organización), `…_relation_exists` (409), `nickname_used_as_contextual_name` (409, borrar apodo), `self_relationship_not_allowed` (400), `related_character_not_found`.

---

## 7. Casos especiales y detalles no obvios

1. **Alta de personaje robusta** (commit `9d98454`, §4.2): el cargador siempre termina (`finalize` + `ngOnDestroy`); el personaje entra en la lista con la respuesta del alta, sin recargar el libro; un reintento del mismo formulario reenvía el mismo `IdCliente` y la API devuelve el ya creado (200) en vez de duplicar; el `IdCliente` se borra tras un éxito, al restablecer el formulario o con los dos códigos de §6.4; 30 s de tiempo máximo por paso; tras un error se refresca el orden para mostrar un alta que sí llegó. Un segundo envío mientras el primero espera se ignora. Si se sale de la pantalla durante el alta, no se vuelve a la lista.
2. **Estado, relaciones y apodos del alta** no caben en `POST /personajes`: van después y su fallo solo se avisa («Revísalo en su ficha»).
3. **Cambio de nombre de personaje** (`characterNameChangeMode`): el selector aparece solo si el nombre escrito difiere exactamente del original. `narrative` (por defecto) → `PATCH …/libros/{libro}/apodo`: en la historia pasa a llamarse así y el nombre anterior queda como apodo histórico. `correction` → `PUT …/libros/{libro}/apodo`: errata; el contexto apunta al apodo correcto. Se vuelve a `narrative` al restablecer el formulario.
4. **Apodos**: en la ficha incluyen el nombre actual (la API lo lista en `Apodos`). Borrarlos se calcula por texto sin tildes ni mayúsculas, y se borra con `ApodoId`. La API los capitaliza (`Capitalizador`). Los apodos alimentan los enlaces narrativos.
5. **Relaciones reflejadas**: el front envía siempre `Reflejada: false` y no crea la relación inversa; la API tampoco la crea. El campo `Reflejada` de las relaciones existentes se ignora (y al guardar se sobrescribe a `false` con el `PUT`).
6. **Estados de localización**: catálogo + estados embebidos en el libro, ids normalizados a número, orden alfabético, «Buen estado» por defecto. En la lista, la meta de la localización es su `Estado` (texto de la API, «Desconocido» si no tiene).
7. **Localización global «Sin localización»** (`Id = 1` en la API): por defecto en eventos; excluida de las relaciones de organización; aparece en la lista de localizaciones y se puede abrir, pero la API no deja editarla.
8. **Orden de personajes**: depende de `OrdenGrupo`/`Grupo` de la API, refrescados con `GET …/personajes/orden`; el refresco reordena la lista entera del libro en memoria.
9. **Ids como texto**: todas las búsquedas por id comparan como número (`Number(...)`), porque hasta el 24/10/2026 la API mandaba algunos ids como texto.
10. **Enlaces narrativos**: se construyen con nombres de personajes y sus apodos, localizaciones, organizaciones, conceptos, eventos y citas (texto ≥ 2 caracteres), se ordenan por longitud descendente, prioridad (personajes 0 … citas 5) y texto; en el texto solo se enlazan menciones que empiezan por mayúscula y con límites de palabra. En la ficha se excluye el propio elemento.
11. **Restauración del estado de personaje**: si el personaje no tiene estado para este libro se usa el último de la lista (estado heredado de un libro anterior); al guardar se crea el de este libro (L8 «actualiza o crea»).
12. **Sexo**: la API devuelve 0/1/2; un `boolean` heredado se traduce `true→0 (Chico)`, `false→1 (Chica)`.
13. **Participantes de eventos ocultos**: la API conserva al guardar los participantes que no son visibles en el libro abierto.
14. **Personajes del libro en citas, eventos y relaciones**: siempre `book.Personajes` completo (incluidos los heredados).

---

## 8. Dudas o rarezas (posibles fallos)

> En la web se corrigieron el 1 (relaciones por `RelacionId`) y el 6 (no borrar el apodo del nombre actual) en `1296886`, y el 8 solo en el aviso del alta. La APK corrige además el 7, el 8, el 9, el 13 y el 14 (`ElementosViewModel.kt`).

1. **Relaciones de personaje con el id equivocado (grave).** `populateCharacterDrafts` usa `relation.Id` como id de la relación y lo usa en `PUT/DELETE personajes/{id}/relaciones/{relationId}`. En la API, `Id` es el id del **personaje relacionado** y el de la relación es `RelacionId`. Consecuencia probable: al guardar cualquier ficha de personaje con relaciones, los `PUT` van a una fila inexistente o ajena (404 `…relation_not_found` → falla todo el guardado y el autoguardado impide salir) y quitar una relación no la borra. En el clon: usar `RelacionId`.
2. **Estado del personaje en la lista siempre vacío.** `getCharacterStatusLabel` lee `Estados[último].Estado.Nombre`, pero la API manda `Estado` como texto («Vivo»). Los iconos por estado (`✕` asesinado, `☠` muerto, `wrong_location` desaparecido) y el `tooltip` de estado nunca salen; solo los del grupo. Además «último» es el último del array, no necesariamente el de este libro.
3. **La tarjeta de detalle es inaccesible** (§3.6): `canEditSelectedItem()` está dentro de la rama de lista, y `selectedItem` solo existe en modo formulario. Por tanto, desde la app no se puede «Quitar del libro» ningún elemento, ni vincular relaciones de organización con 15-250 caracteres desde ahí. Las entradas de `GET /entradas` se piden al abrir cada ficha (con cargador) solo para esa tarjeta.
4. **Apodos en el móvil: dos pulsaciones.** El campo de apodo está siempre visible, pero `isCharacterAliasFormOpen` empieza en `false`: la primera pulsación de «+» o Intro solo «abre» el formulario y no añade; hay que pulsar otra vez. (En la clásica el campo solo aparece tras la primera pulsación, así que allí tiene sentido.)
5. **Un apodo escrito y no añadido no se guarda**, sin aviso (si tiene ≥ 3 letras). Si tiene 1-2 letras, bloquea el envío sin mensaje en la móvil.
6. **Borrar el chip del nombre actual** del personaje: el front pide `DELETE` del apodo y la API responde 409 `nickname_used_as_contextual_name` → falla todo el guardado (y el autoguardado impide salir hasta reponerlo).
7. **Relaciones de organización sin validación en el formulario**, pero la API exige `Descripcion` ≥ 15. Al **crear** una organización con relaciones con descripción corta o vacía, la organización se crea, las relaciones fallan y se muestra «Error al crear entidad narrativa» quedándose en el formulario: reintentar **duplica la organización** (no hay `IdCliente` para los demás tipos). Al **editar**, el guardado falla tras haber guardado nombre y entradas.
8. **Concordancia de género en los avisos**: «{Singular} creado/actualizado/quitado del libro» da «Organización creado», «Localización actualizado», «Cita creado».
9. **`?selected=` no se borra nunca.** Tras cerrar una ficha abierta por enlace, cualquier emisión posterior del libro (`book$`: refresco del orden, guardar otra cosa…) la **vuelve a abrir**. Y como `openItem` se ejecuta en cada emisión mientras la ficha está abierta por enlace, una emisión durante la edición **reinicia el formulario** con los datos del libro (lo escrito solo sobrevive en el borrador local si ya se había apartado).
10. **Cambiar de ficha dentro del mismo tipo no guarda**: navegar de `?selected=5` a `?selected=7` (enlace narrativo del mismo tipo) abre la 7 sin pasar por `canDeactivate` (mismo componente); y quitar `?selected=` cierra la ficha sin guardar. Solo queda el borrador local si se llegó a apartar.
11. **Borrador restaurado de una organización se pierde**: al llegar las relaciones, `loadOrganizationRelations` sustituye las relaciones del formulario por las del servidor y **vuelve a tomar la foto**, con lo que el resto de cambios recuperados pasan a contar como guardados y no se envían al salir.
12. **El borrador local solo se aparta con eventos DOM `input`/`change`**: tocar botones (relaciones, participantes, quitar entradas/apodos, opciones de `mat-select`) no lo dispara hasta pasar a segundo plano o `pagehide`.
13. **El alta no tiene protección**: salir (flecha, atrás, otra pantalla) descarta el formulario de alta sin aviso ni borrador.
14. **Se envía todo en cada guardado**: `PATCH` del sexo y `PUT` del estado del personaje, `PUT` de **todas** las entradas existentes y de todas las relaciones existentes, aunque no hayan cambiado. El guardado no es atómico: los pasos ya hechos no se deshacen si falla uno posterior.
15. **`markBackendField` asigna `EstadoId` al estado de localización** también en personajes, y la vista móvil no enseña el texto del backend en el campo (solo el aviso).
16. **Nombre sin recortar**: `Nombre`/`Apodo` se envían con los espacios que tenga; la validación de 3 caracteres cuenta espacios. Solo la comparación de nombre repetido recorta.
17. **Comparación de nombre cambiado exacta**: cambiar solo mayúsculas o un espacio cuenta como cambio de nombre y dispara `PATCH/PUT …/apodo`.
18. **Libro de una sección de antología**: tras guardar se recarga con `GET libros/{id}`, aunque la carcasa carga las secciones con `GET antologias/secciones/{id}`. No comprobado si `GET libros/{id}` sirve para una sección.
19. **Interfaces del front desalineadas con la API**: `CharacterStatus.Estado` (objeto vs. texto), `CharacterRelation.Id` (relación vs. personaje), respuestas de borrado `{eliminado}` vs. `{success, message}`. El clon debería modelar la forma real.
20. **Fila de «Secundarios»** sin icono: en la móvil queda un `span` vacío en lugar del icono.
21. **Bloque «Libro actual» siempre visible** en «Por libro», aunque esté vacío.
22. **Pick-lists que no alternan**: en relaciones de personaje y de organización, tocar de nuevo un elemento ya añadido no lo quita; en la móvil, la columna de personajes de la organización no cambia el icono al añadir.
23. **Catálogo de estados de personaje fallido** → lista vacía sin aviso y el formulario de personaje no se puede enviar (estado obligatorio) sin explicación en la móvil.
24. **Entradas heredadas cortas**: una entrada antigua con descripción < 15 caracteres bloquea el guardado de toda la ficha (y la salida si hay otros cambios), aunque el usuario no la toque.
