# Petición a Libros: anunciar los libros nuevos del catálogo una vez al día (kit 1.59)

Fecha: 2026-10-25
Solicitante: plataforma común de Yosiftware (`C:\Users\Yosi\Desktop\administracion yosiftware`), por decisión del propietario
Destinatarios: Libros API y el frontend de Libros (web)
Afecta a: los anuncios de Yosiftware que publica Libros (`POST /v1/servicio/novedades/yosiftware`) y la página a la que llevan

## Contexto

El propietario quiere que la gente se entere de los libros que llegan al catálogo de Libros, pero sin un anuncio por cada libro: «puede ser eso un despipote. La idea sería que esa novedad solo se lance una vez al día, quizá a la 1 de la tarde y recoja todos los libros que fueron añadidos las últimas 24 horas».

La plataforma ya lo tiene preparado (kit 1.59, `NOVEDADES.md`, «Las novedades de Yosiftware»):

- un tipo nuevo de anuncio, `contenido` («Contenido nuevo»), para lo que llega a una web;
- cada anuncio recuerda qué web lo publicó, y cada persona puede dejar de ver los de Libros sin dejar de seguir a Yosiftware, desde la tarjeta o desde «Tu cuenta › Novedades».

## Qué necesitamos

1. **Un trabajo diario en la API, a las 13:00 (hora de Madrid),** que reúna los libros y las antologías añadidos al catálogo canónico en las últimas 24 horas. Por ejemplo, de las 13:00 de ayer a las 13:00 de hoy, para que nada caiga entre dos días.
2. **Si no hay ninguno, no publica nada.**
3. **Si hay alguno, un solo anuncio** con `POST /v1/servicio/novedades/yosiftware` y tu credencial de servicio:
   - `tipo`: `contenido`;
   - `idExterno`: uno por día, por ejemplo `catalogo-2026-10-25`. Si el trabajo se ejecuta otra vez ese día, corrige el anuncio en vez de repetirlo;
   - `texto`: una frase con el nombre de la web y los primeros títulos, por ejemplo «Hoy llegan 12 libros nuevos al catálogo de Libros: *Dune*, *Fundación* y 10 más». Con uno solo: «Hoy llega *Dune* al catálogo de Libros». Hasta 280 caracteres;
   - `enlace`: a una página de vuestra web con los libros de ese día (o, si no la hay, al catálogo ordenado por los más nuevos).
4. **El frontend:** la página del enlace, si hace falta crearla.
5. **Opcional:** una cabecera con un mosaico de las portadas (`PUT /v1/servicio/novedades/yosiftware/{idExterno}/cabecera`). Para eso el propietario tiene que encender antes, en la administración, la cabecera en los anuncios de Libros (nace apagada).
6. **Respondednos en la sección «Resolución».**

## Comprobaciones previas

- `POST /v1/servicio/novedades/yosiftware` ya existe y Libros lo usa (`utils/platform_yosiftware_news.py`). Solo cambia el tipo, que debéis añadir a vuestra lista de tipos válidos.
- El tipo `contenido` llega con la plataforma en QA y en producción junto con este kit. Antes de eso, la plataforma lo rechaza con 400.
- El límite de 10 anuncios por web y día sigue igual; con uno al día sobra.

## Calendario y dependencias

Sin fecha fija. **El kit 1.59 ya está en QA y en producción (`9a159d0`, 2026-10-25)**: el tipo `contenido` se acepta en los dos entornos, y la web social y la app 0.2.6 dejan apagar los anuncios por servicio.

## Fuera de alcance

- Las novedades de las personas (empezar, terminar, puntuar y reseñar), que siguen igual.
- Anunciar cada libro por separado.

## Resolución

<!-- La rellena Libros. -->

### Libros: hecho (2026-10-25)

Aceptada y en producción. Kit 1.59 adoptado. Roadmap: `docs/roadmaps/FINALIZADO_estadisticas-y-altas/` (F1). El propietario lo amplió a guardar más datos con fecha y más estadísticas.

1. **El trabajo diario** (`utils/catalog_daily_news.py`):
   - Lo lanza el lector del feed a las 13:00 de Madrid; `LIBROS_NOVEDAD_DIARIA=0` lo apaga. A mano: `python -m scripts.novedad_diaria_catalogo [--dia AAAA-MM-DD] [--simular]`.
   - Reúne los libros sueltos y las antologías dados de alta desde las 13:00 del día anterior hasta las 13:00 del día. Las ventanas quedan pegadas también el día del cambio de hora.
   - Para saberlo, el catálogo guarda desde hoy `fecha_alta` en libros, antologías, autores, sagas y universos. Lo de antes queda como aproximado y nunca cuenta como nuevo.
2. **Sin altas, no publica nada.**
3. **Un solo anuncio al día:**
   - `tipo` `contenido`, `idExterno` `catalogo-AAAA-MM-DD`, y con el mismo identificador se corrige.
   - El texto: «Hoy llegan 12 libros nuevos al catálogo de Libros: Dune, Fundación, Libro y 9 más.». Con uno solo, «Hoy llega Dune al catálogo de Libros.». Si no cabe en 280 caracteres, se quitan títulos.
   - El enlace lleva al catálogo con las altas de la última semana, de la más reciente a la más antigua (`/dashboard/catalog?nuevos=7d`). Así quien lo abre días después aún ve las de ese día arriba.
4. **El frontend:** el catálogo tiene un filtro «Nuevos» (24 horas, semana y mes) en Web, Wood y Mobile, y `?nuevos=` lo aplica al abrir. Las estadísticas generales muestran los nuevos y las obras añadidas cada mes.
5. **La cabecera con el mosaico:** queda para más adelante. Cuando el propietario la encienda para los anuncios de Libros, la añadimos.

La plataforma publicó el kit 1.59 en QA y en producción (`9a159d0`) ese mismo día: el anuncio sale con la primera alta del catálogo. Hoy no hay altas nuevas (simulado en producción: «No hay obras nuevas»).
