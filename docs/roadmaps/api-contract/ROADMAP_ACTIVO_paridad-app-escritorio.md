# Paridad Front-Backend Con App De Escritorio

## Objetivo

Adaptar el frontend Angular al contrato de paridad con la app de escritorio documentado por backend, empezando por la base de contrato, servicios y pantallas existentes minimas antes de construir la UI narrativa completa.

## Checklist

- [x] **Descripcion:** Actualizar modelos del dominio narrativo y de `GET /libros/{id_libro}`.
  **Por que se necesita:** El backend devuelve contexto acumulado de saga, procedencia, metricas de personajes, apodos estructurados y escenas con `PersonajesDetalle`.
  **Que se espera lograr:** Que TypeScript represente el contrato real sin perder datos nuevos ni truncar ordenes decimales.
  **Peligros si se mantiene como estaba:** El front interpretara entidades heredadas como actuales, perdera metricas y tratara apodos o escenas con formas incorrectas.
  **Peligros del cambio:** Puede aflorar componentes que asumian tipos antiguos como `Apodos: string[]` o `Orden` entero.

- [x] **Descripcion:** Centralizar DTOs de escritura para entradas, personajes, escenas, apodos y relaciones.
  **Por que se necesita:** Las altas narrativas ya requieren `Entradas` validas y algunos campos visibles son derivados/contextuales.
  **Que se espera lograr:** Preparar contratos de escritura coherentes para servicios y futuras pantallas sin inventar payloads en componentes.
  **Peligros si se mantiene como estaba:** Cada pantalla podria recrear cuerpos incompatibles con la API.
  **Peligros del cambio:** Un DTO demasiado estricto puede necesitar ajustes cuando se conecten formularios reales.

- [x] **Descripcion:** Añadir servicios para personajes, entradas, entidades narrativas, escenas y password reset.
  **Por que se necesita:** El contrato nuevo expone endpoints que el front no consume todavia.
  **Que se espera lograr:** Tener una capa API lista para personajes/apodos/estados/relaciones, `/entradas`, localizaciones, conceptos, organizaciones, eventos, citas, escenas y recuperacion de contrasena.
  **Peligros si se mantiene como estaba:** Las proximas pantallas tendran que mezclar UI con llamadas HTTP ad hoc.
  **Peligros del cambio:** Aumenta superficie sin UI completa; requiere build y tipos estrictos para evitar deuda muerta.

- [x] **Descripcion:** Adaptar pantallas existentes al contrato minimo.
  **Por que se necesita:** Libro, personajes y escenas ya existen y son las superficies que mas dependen de la forma de `BookDetail`.
  **Que se espera lograr:** Usar la respuesta de `GET /libros/{id_libro}` como fuente de verdad, mostrar nombre contextual/procedencia/metricas de personajes y preparar escenas para `Nombrado`.
  **Peligros si se mantiene como estaba:** La UI puede editar o presentar mal datos heredados de saga.
  **Peligros del cambio:** Hay que limitar la UI avanzada para no abrir demasiado alcance en este hito.

- [x] **Descripcion:** Planificar sin implementar la UI narrativa completa.
  **Por que se necesita:** Localizaciones, conceptos, organizaciones, eventos y citas necesitan tipos y servicios ahora, pero no pantallas completas aun.
  **Que se espera lograr:** Dejar claro que la primera fase prepara contrato/servicios y que CRUD visual completo queda para fases posteriores.
  **Peligros si se mantiene como estaba:** Se puede mezclar infraestructura con una expansion UI demasiado amplia.
  **Peligros del cambio:** El usuario no tendra todavia todas las acciones narrativas visibles aunque la API este preparada.

- [x] **Descripcion:** Implementar UI completa de personajes.
  **Por que se necesita:** El contrato ya soporta altas con entradas, asociacion a libros, apodos narrativos, correcciones, estados y relaciones.
  **Que se espera lograr:** Recuperar la creacion/edicion de personajes sin tratar `Nombre` como campo global editable. Avance actual: alta con entrada inicial, cambio narrativo de apodo, correccion de apodo, registro/edicion/borrado de apodo conocido, estado contextual, creacion/edicion/borrado de relacion manual y asociacion contextual de personaje heredado al libro abierto.
  **Peligros si se mantiene como estaba:** La pantalla seguira siendo mayormente informativa y no permitira mantener personajes desde la web.
  **Peligros del cambio:** Diferenciar mal `PATCH` y `PUT` de apodo podria romper historia narrativa o correcciones.

- [x] **Descripcion:** Implementar editor real de escenas.
  **Por que se necesita:** La API diferencia personajes presentes de personajes solo nombrados y usa esa diferencia para metricas.
  **Que se espera lograr:** Guardar escenas validas con `Nombrado` y refrescar metricas desde `GET /libros/{id_libro}`. Avance actual: el editor de capitulo crea, actualiza y borra escenas mediante `SceneService`, selecciona personajes por escena distinguiendo `aparece` frente a `solo nombrado`, bloquea escenas sin personaje presente y refresca el libro completo tras guardar.
  **Peligros si se mantiene como estaba:** Las metricas de apariciones/nombramientos no podran mantenerse desde el front.
  **Peligros del cambio:** Un editor incompleto podria permitir escenas rechazadas por la API.

- [x] **Descripcion:** Implementar UI de password reset.
  **Por que se necesita:** Los servicios existen, pero falta pantalla publica para solicitar y confirmar recuperacion.
  **Que se espera lograr:** Flujo `Olvide mi contrasena` y `reset-password?token=...` respetando el mensaje generico del backend. Avance actual: rutas publicas `/forgot-password` y `/reset-password?token=...`, enlace desde login, solicitud con respuesta generica y confirmacion con validacion de contrasena equivalente al registro.
  **Peligros si se mantiene como estaba:** Usuarios sin sesion no podran recuperar contrasena desde la web.
  **Peligros del cambio:** Revelar existencia de email seria un problema de privacidad.

- [ ] **Descripcion:** Implementar UI narrativa no-personaje por fases.
  **Por que se necesita:** Ya existen tipos y servicios para localizaciones, conceptos, organizaciones, eventos, citas y relaciones de organizacion.
  **Que se espera lograr:** Construir CRUD visual acotado con entradas validas sin borrar entidades completas.
  **Peligros si se mantiene como estaba:** La web seguira sin cubrir la paridad narrativa de la app de escritorio.
  **Peligros del cambio:** Hacerlo todo a la vez ampliaria demasiado el alcance y el riesgo visual.
  **Avance actual:** Barra superior de entidades en libro con accesos a lista y alta de personajes, organizaciones, eventos, localizaciones, conceptos y citas. El placeholder vacio fue sustituido por una pantalla reutilizable que lista entidades desde el libro abierto y permite altas basicas con `Entradas` para localizaciones, conceptos, organizaciones, eventos y citas; tras crear, refresca `GET /libros/{id_libro}`. Quedan pendientes edicion avanzada, relaciones de organizacion con personajes/localizaciones y pantallas especificas por entidad si hacen falta.

## Estadisticas

- [x] **Descripcion:** Mapear contrato y tipos de estadisticas enriquecidas.
  **Por que se necesita:** La documentacion de backend aporta nuevos datos para libro y universo, y algunos esquemas mantienen `additionalProperties`, por lo que el front necesita modelos defensivos antes de pintar graficas.
  **Que se espera lograr:** Definir interfaces y normalizadores para estadisticas de libro, metricas narrativas, datos de universo/globales, rankings, fechas y ausencias de datos.
  **Peligros si se mantiene como estaba:** Los componentes seguirian consumiendo `any` o ignorando campos nuevos, con riesgo de romper al recibir respuestas incompletas.
  **Peligros del cambio:** Tipar demasiado pronto campos flexibles puede obligar a ajustes si backend cambia nombres o estructura.
  **Avance actual:** Añadido contrato local `statistics.ts` con metricas globales (`BookStale`, `FastRead`, `MonthlyCount`, metricas de antologias), snapshot derivado de `Book` para estadisticas de libro y normalizadores para dias de lectura, etiquetas mensuales y metricas por capitulo/personaje. La pantalla global existente ya tolera respuestas `null` en endpoints documentados.

- [x] **Descripcion:** Ampliar servicios de estadisticas.
  **Por que se necesita:** `StatisticsService` solo cubre parte de las metricas globales actuales y la pantalla de libro aun no tiene una capa clara para obtener/normalizar sus datos estadisticos.
  **Que se espera lograr:** Centralizar llamadas y transformaciones para estadisticas de libro, universo/globales y metricas derivadas desde `GET /libros/{id_libro}` cuando proceda.
  **Peligros si se mantiene como estaba:** La UI terminara mezclando HTTP, fallback de datos y calculos de presentacion en componentes.
  **Peligros del cambio:** Duplicar calculos entre servicio y componente puede generar incoherencias si no se define bien la fuente de verdad.
  **Avance actual:** `StatisticsService` queda tipado para las metricas globales documentadas, expone tambien antologias no leidas y secciones de antologia leidas, centraliza `getGlobalStatistics()` para la pantalla global y `getBookStatistics()`/`getBookStatisticsFromBook()` para derivar estadisticas de libro desde `GET /libros/{id_libro}` o desde el libro ya cargado.

- [x] **Descripcion:** Implementar pantalla de estadisticas de libro.
  **Por que se necesita:** La ruta `book/statistics` existe, pero la pantalla no aprovecha las metricas disponibles y queda muy por detras de la app de escritorio.
  **Que se espera lograr:** Mostrar una vista inspirada en la app de escritorio con secciones de lectura, fechas, personajes, metricas narrativas, paginas por capitulo, personajes por capitulo, capitulo mas poblado y estados vacios legibles.
  **Peligros si se mantiene como estaba:** Abrir estadisticas de libro seguira mostrando una superficie vacia o poco util aunque la API ya tenga datos.
  **Peligros del cambio:** Meter demasiadas graficas a la vez puede hacer la pantalla lenta, densa o dificil de leer en libros con muchos capitulos/personajes.
  **Avance actual:** `BookStatisticsComponent` sustituye el stub por una pantalla real alimentada desde `BookStore` y `StatisticsService`, con resumen de lectura/narrativa, fechas, personaje mas frecuente/nombrado, capitulo mas poblado, paginas estimadas por capitulo, personajes por capitulo y ranking de personajes. Incluye estados vacios para libros sin paginas, escenas o personajes suficientes.

- [x] **Descripcion:** Redisenar estadisticas de universo/globales existentes.
  **Por que se necesita:** La direccion funcional actual es correcta, pero visualmente se siente pobre: demasiadas tarjetas planas, jerarquia debil y graficas poco integradas con el resto de la app.
  **Que se espera lograr:** Mantener los datos actuales, mejorar composicion, contraste, espaciado, titulos, contenedores, leyendas y legibilidad de graficas sin convertirlo en una pagina de marketing.
  **Peligros si se mantiene como estaba:** La pantalla seguira siendo util pero poco agradable y no reflejara la mejora del contrato de estadisticas.
  **Peligros del cambio:** Cambios visuales amplios pueden degradar la comparacion entre graficas o esconder datos secundarios importantes.
  **Avance actual:** La pantalla global de estadisticas ahora usa cabecera, metricas rapidas, paneles de graficas y detalles secundarios con clases especificas, iconografia Material, colores coherentes en ApexCharts y mejor jerarquia visual. Se eliminaron estilos genericos sobre todos los `div` y la pantalla consume los nuevos agregados globales sin mezclar endpoints en la vista.

- [x] **Descripcion:** Validar responsividad y estados sin datos de estadisticas.
  **Por que se necesita:** Las estadisticas pueden variar mucho entre libros autoconclusivos, sagas, universos pequenos y universos grandes.
  **Que se espera lograr:** Confirmar que graficas, tarjetas, rankings y textos no se cortan, no solapan y muestran estados vacios cuando faltan metricas.
  **Peligros si se mantiene como estaba:** Una pantalla que se vea bien con datos de ejemplo puede romperse con libros sin escenas, sin fechas o con muchos personajes.
  **Peligros del cambio:** Ajustar demasiados breakpoints sin criterio puede crear CSS fragil.
  **Avance actual:** Las estadisticas globales y de libro ya no renderizan graficas vacias cuando las series no tienen valores utiles; muestran estados vacios para lecturas, rankings, historial, paginas, escenas y personajes. El scroll de estadisticas de libro queda contenido en `app-book-router`, los paneles de graficas tienen alturas estables y los grids colapsan a una columna en anchos pequenos. Quedan las comprobaciones manuales con datos reales registradas en `docs/pruebas/api-contract/[pendiente][paridad-app-escritorio].md`.

## Notas

- No modificar `docs/backend/` desde el frontend. Las discrepancias deben registrarse en un `.md` fuera de esa carpeta dirigido al backend.
- Primer hito elegido: base de contrato.
- Para entidades narrativas no-personaje, en esta fase se implementan tipos y servicios, no UI completa.
- `docs/backend/openapi.yaml` y `docs/backend/CAMBIOS_ROADMAP_PARIDAD_APP_ESCRITORIO.md` prevalecen sobre supuestos antiguos del front.
