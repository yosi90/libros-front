# Cambios De Paridad Con App De Escritorio Para El Front

Este documento resume los cambios cerrados en el roadmap de paridad con la app de escritorio y explica por que existen. La idea es que el Codex del front adapte la UI respetando el modelo real del backend, no solo el nombre de los endpoints.

Referencias utiles:

- Contrato humano: `docs/front/ENDPOINTS.md`.
- Swagger/OpenAPI: `docs/front/openapi.yaml`.
- Roadmap finalizado: `docs/roadmaps/paridad-app-escritorio/ROADMAP_FINALIZADO_paridad_app_escritorio.md`.
- Contexto de dominio: `docs/codex/PROJECT_CONTEXT.md`.

## Principio General

La API se ha alineado con la app de escritorio, que es la referencia canonica de intencion. Esa referencia puede tener bugs, asi que el backend no copia patrones sospechosos: reproduce reglas de dominio comprobadas.

Para el front esto implica dos cosas:

- No asumir que una entidad visible en un libro pertenece necesariamente a ese libro. Puede venir del libro actual, de un libro previo de la saga o de una saga previa.
- No asumir que todos los campos visibles son editables directamente. Algunos, como `Orden` o `Nombre` de personaje, son valores derivados/contextuales.

## Libros, Sagas Y Procedencia

`GET /libros/{id_libro}` devuelve objetos del contexto completo de lectura:

- entidades del libro actual;
- entidades de libros previos de la misma saga;
- entidades de secciones de saga;
- entidades heredadas de sagas previas.

El backend incluye metadatos como `OrigenContexto`, `EsLibroActual`, `EsSagaPrevia`, `EsSeccionOrigen`, `OrdenOrigen` e `Id_Saga_Origen`.

Por que: en la app de escritorio, al abrir un libro de saga, el usuario ve el conocimiento acumulado hasta ese punto. El front debe evitar presentar todo como si hubiera sido creado en el libro actual.

Recomendacion para el front:

- Mostrar o usar la procedencia cuando se editen entidades heredadas.
- Al crear algo nuevo desde un libro abierto, enviar siempre `LibroId`; el backend decide si se guarda en `libro_*` o `saga_*`.
- No mover entidades heredadas al cambiar un libro de saga. El backend ya protege esto: solo migra entidades cuyo `id_libro_origen` sea el libro actual.

## Ordenes De Saga

Hay dos ideas de orden:

- `OrdenPropio`: orden dentro de la saga actual.
- `OrdenEnSagas`: orden acumulado teniendo en cuenta sagas previas.

Ademas, los ordenes pueden ser decimales, por ejemplo `3.5` para una historia corta entre dos libros.

Por que: algunas sagas tienen relatos intermedios. La API necesita conservar ese orden para nombres, estados, entradas y relaciones contextuales.

Recomendacion para el front:

- Tratar `Orden` como numero decimal cuando se muestre o edite orden de saga.
- No truncar ni convertir a entero.
- No enviar `Orden` en endpoints que no lo pidan expresamente.

## Personajes Y Nombres Contextuales

Los personajes no tienen un nombre global editable. Su `Nombre` visible se resuelve desde apodos y desde `personaje_nombre` segun el libro/contexto.

Hay dos operaciones distintas:

- `PATCH /personajes/{id_personaje}/libros/{id_libro}/apodo`: cambio narrativo de nombre. Ejemplo: un personaje pasa a ser conocido por otro nombre en este punto de la saga.
- `PUT /personajes/{id_personaje}/libros/{id_libro}/apodo`: correccion de errata. Ejemplo: se escribio mal el nombre al crearlo y hay que repuntar el contexto al apodo correcto.

Por que: si un personaje cambia de nombre dentro de la historia, el nombre anterior sigue siendo historico. Si fue una errata, el contexto actual debe dejar de apuntar al apodo incorrecto.

Recomendacion para el front:

- Usar `PATCH` para cambios narrativos intencionales.
- Usar `PUT` para correcciones.
- No editar el `Nombre` del personaje como si fuera una columna simple.
- Si se lista apodos, usar `ApodoId` para operaciones sobre apodos.

## Estados Y Materializacion Al Leer

Al consultar un libro de saga posterior, la API puede crear datos contextuales faltantes:

- copia el nombre anterior mas reciente si falta `personaje_nombre` para ese orden;
- copia el estado anterior mas reciente o crea `Vivo` si no habia estado previo.

Por que: la app de escritorio materializa contexto al abrir el libro. La API replica esa idea para que el front reciba un estado consistente.

Recomendacion para el front:

- Asumir que `GET /libros/{id_libro}` puede cambiar la BD de forma controlada.
- Tras abrir un libro, usar la respuesta recibida como fuente de verdad actual.

## Entradas Narrativas

Las entidades con entradas son:

- personajes;
- localizaciones;
- organizaciones;
- conceptos;
- eventos;
- citas.

Una entrada valida requiere:

- `Nombre` entre 2 y 100 caracteres;
- `Descripcion` de minimo 15 caracteres.

La API exige al menos una entrada valida al crear estas entidades y valida todas las entradas recibidas.

Endpoints relevantes:

- `POST /personajes`
- `POST /localizaciones`
- `POST /conceptos`
- `POST /organizaciones`
- `POST /eventos`
- `POST /citas`
- `GET/POST /entradas/{entidad}/{id_entidad}`
- `PUT/DELETE /entradas/{id_entrada}`

Por que: en el modelo de escritorio, estas entidades nacen con contenido descriptivo, no como filas vacias.

Recomendacion para el front:

- Preferir `Entradas: [{ Nombre, Descripcion }]` en altas.
- `Descripcion` simple existe como compatibilidad, pero no deberia ser el contrato principal nuevo.
- Validar en UI antes de enviar para evitar errores 400.
- Para entradas existentes, usar `/entradas/...`; para crear la entidad completa, usar el `POST` propio de la entidad.

## Escenas

Una escena valida requiere:

- `Nombre` valido;
- `Descripcion` valida;
- `Id_Localizacion` existente;
- al menos un personaje en escena con `Nombrado = false`.

Personajes con `Nombrado = true` son menciones, no apariciones. Si una escena solo trae personajes nombrados, la API la rechaza.

Endpoints:

- `GET /escenas/{id_escena}`
- `POST /escenas/capitulos/{id_capitulo}`
- `POST /escenas/capitulos-interludio/{id_capitulo}`
- `PUT /escenas/{id_escena}`
- `DELETE /escenas/{id_escena}`

Por que: la app de escritorio diferencia personajes presentes en escena de personajes mencionados. Esa diferencia alimenta metricas y agrupaciones.

Recomendacion para el front:

- En el editor de escena, distinguir claramente "aparece" de "solo nombrado".
- Bloquear guardar si no hay ningun personaje con `Nombrado = false`.
- Mantener compatibilidad: en `GET /libros/{id_libro}`, `Escenas[].Personajes` sigue siendo lista de ids, pero usar `Escenas[].PersonajesDetalle` para conocer `Nombrado`.

## Metricas De Apariciones Y Nombramientos

`GET /libros/{id_libro}` devuelve:

- `MetricasPersonajes.MediaApariciones`
- `MetricasPersonajes.MedianaApariciones`
- `MetricasPersonajes.MediaNombramientos`
- `MetricasPersonajes.TotalCapitulosMetricas`

Cada personaje puede incluir:

- `Apariciones`
- `Nombramientos`
- `MediaApariciones`
- `MedianaApariciones`
- `MediaNombramientos`
- `TextoApariciones`
- `CapitulosAparicionResumen`
- listas de capitulos/interludios donde aparece o se menciona.

Regla clave:

- Una aparicion cuenta como maximo una vez por capitulo/interludio si el personaje aparece en al menos una escena con `Nombrado = false`.
- Un nombramiento cuenta como maximo una vez por capitulo/interludio si aparece en al menos una escena con `Nombrado = true`.
- Si aparece y tambien se menciona en el mismo capitulo, puede sumar en ambas metricas.
- Solo cuenta el libro activo.

Por que: estas metricas se usan para agrupar personajes como principales, recurrentes, secundarios, desaparecidos, muertos o antiguos.

Recomendacion para el front:

- Usar los campos numericos como fuente de verdad para ordenar y filtrar.
- Tratar `TextoApariciones` como texto derivado para tooltip/UI, no como dato parseable.
- Durante edicion sin guardar, recalcular provisionalmente usando capitulos/interludios y `Escenas[].PersonajesDetalle`.
- Tras guardar escena, volver a pedir `GET /libros/{id_libro}` si se quiere sincronizar con metricas persistidas.

## Organizaciones

Las organizaciones ya pueden relacionarse con personajes y localizaciones:

- `GET /organizaciones/{id}/personajes`
- `POST /organizaciones/{id}/personajes`
- `PUT /organizaciones/{id}/personajes/{id_personaje}`
- `DELETE /organizaciones/{id}/personajes/{id_personaje}`
- `GET /organizaciones/{id}/localizaciones`
- `POST /organizaciones/{id}/localizaciones`
- `PUT /organizaciones/{id}/localizaciones/{id_localizacion}`
- `DELETE /organizaciones/{id}/localizaciones/{id_localizacion}`

Cada relacion exige `LibroId` y `Descripcion` valida.

Por que: estas relaciones tienen descripcion/origen propios, no son solo un array de ids.

Recomendacion para el front:

- Modelarlas como subrecursos editables.
- Pedir descripcion al crear/editar relacion.
- Usar `?libroId={id_libro}` en lecturas cuando se quiera filtrar por contexto de saga.

## Borrados Logicos

El backend replica borrados logicos donde el modelo de escritorio los necesita:

- entradas: se marcan como `Entrada borrada` y pueden reutilizarse;
- escenas: se marcan como `Escena borrada` y pueden reutilizarse;
- relaciones de personaje: se marcan como `relacion_borrada`;
- apodos: usan `personaje_apodos.borrado = 1`.

Pero localizaciones, conceptos, organizaciones, eventos y citas no se borran desde la API: se modifican.

Por que: borrar entidades completas puede arrastrar informacion historica de saga y romper libros ya leidos. La regla segura es modificar, no borrar.

Recomendacion para el front:

- No construir acciones de borrar para esas entidades completas salvo que el backend cree un contrato explicito en el futuro.
- Si hace falta ocultar algo, plantearlo como nueva decision de producto/backend.

## Relaciones De Personaje

El backend no crea relaciones espejo automaticamente.

Por que: el autoreflejo puede crear duplicados o relaciones incorrectas si el front no decide bien la semantica.

Recomendacion para el front:

- Si se quiere una relacion inversa, crearla explicitamente desde UI/admin.
- No asumir que `Reflejada = true` aparecera automaticamente.

## Autenticacion Y Password Reset

Se mantiene `PUT /auth/update` para usuarios autenticados.

El flujo publico de recuperacion es:

- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`

Por que: cambiar contrasena autenticado y recuperar contrasena por email son flujos distintos.

Recomendacion para el front:

- Crear pantalla de "olvide mi contrasena" que llame a `request`.
- Crear pantalla de reset que lea `?token=...` y llame a `confirm`.
- No revelar al usuario si el email existe; el backend devuelve mensaje generico.

## Checklist De Adaptacion Front

- Actualizar tipos/modelos de `GET /libros/{id_libro}` con `MetricasPersonajes`, `PersonajesDetalle`, procedencia y metricas por personaje.
- En escenas, separar personajes presentes de personajes solo nombrados.
- Recalcular metricas provisionales localmente durante edicion de escenas sin guardar.
- Usar `Entradas` en altas de personajes, localizaciones, conceptos, organizaciones, eventos y citas.
- Implementar gestion generica de entradas para las seis entidades narrativas.
- Implementar altas completas de localizaciones, conceptos, organizaciones, eventos y citas desde sus endpoints propios.
- Implementar subrecursos de relaciones de organizacion con personajes/localizaciones.
- Distinguir `PATCH` y `PUT` de apodo contextual de personaje.
- No ofrecer borrado de localizaciones, conceptos, organizaciones, eventos o citas completas.
- Tratar ordenes de saga como decimales.
- Implementar pantallas de password reset si aun no existen.
