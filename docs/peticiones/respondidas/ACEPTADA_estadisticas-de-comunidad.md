# Petición backend: estadísticas agregadas de lectura de la comunidad

## Qué se necesita

Un endpoint de solo lectura (por ejemplo `GET /estadisticas/comunidad`) que devuelva agregados anónimos de lectura de todos los usuarios que comparten estadísticas (`mostrar_estadisticas = 1`, como ya hace `Estadisticas` en la ficha pública de libro):

1. **Estilos más leídos**: `[{ Id, Nombre, Lectores, LibrosLeidos }]`, ordenado por lecturas.
2. **Autores más leídos**: `[{ Id, Nombre, Lectores, LibrosLeidos }]`.
3. **Libros más leídos**: `[{ Id, Nombre, Portada, Lectores, PuntuacionMedia }]`.
4. **Mejor valorados** (con un mínimo de valoraciones para que sea significativo): `[{ Id, Nombre, Portada, PuntuacionMedia, Valoraciones }]`.
5. **Lecturas por mes** de la comunidad (últimos 12 meses): `[{ anio, mes, cantidad }]`.
6. **Resumen**: lectores activos, libros leídos en total y media de libros leídos por lector.

Cada lista con un `limit` razonable (10) y un umbral mínimo de lectores por elemento si hace falta para preservar el anonimato.

## Por qué se necesita

El propietario ha pedido separar Estadísticas en «Personal» y «General». «General» ya muestra la composición del catálogo (títulos por estilo, autores con más títulos, idiomas y décadas de publicación), calculada en el frontend a partir de `/catalogo/libros`. Lo que el frontend no puede calcular sin recorrer la colección de cada usuario es **qué se lee**: estilos, autores y libros más leídos o mejor valorados en toda la comunidad.

## Qué se espera lograr

- La pestaña «General» de Estadísticas (Web, Wood y la APK) sustituye el aviso «Lo más leído por la comunidad llegará…» por gráficos reales de estilos, autores y libros más leídos, mejor valorados y actividad mensual.
- Sin exponer datos de ningún usuario concreto.

## Respuesta del backend (27/9)

Aceptada con más alcance del pedido. `GET /estadisticas/comunidad?limit=` devuelve `Resumen`, rankings de estilos, autores, idiomas, sagas y universos más leídos, libros más leídos, mejor valorados, antologías, `LecturasPorMes` (12 meses), `ActividadComunidad30Dias` y clubes más amplios y más activos. `GET /estadisticas/comunidad/clubes/{id}` da los autores más leídos por los miembros de un club abierto. Solo cuentan cuentas con `mostrar_estadisticas`; una fila exige tres lectores y un total o mes con una o dos personas llega como `null`. Contrato: `docs/backend/api/ESTADISTICAS_COMUNIDAD_FRONT.md`.

## Adopción en el frontend (27/9)

- Pestaña «General» de Estadísticas (Web, Wood y APK) en tres bloques: lectura en la comunidad (resumen, lecturas por mes y solo los rankings con datos; si no hay ninguno, un aviso de datos insuficientes que remite a «Mostrar estadísticas»), clubes y actividad de 30 días, y el catálogo. `null` se muestra como «—», nunca como cero; si falla la comunidad, el catálogo se muestra igual.
- Ficha de club abierto: «Autores más leídos» con el segundo endpoint (Web, Wood y APK).
