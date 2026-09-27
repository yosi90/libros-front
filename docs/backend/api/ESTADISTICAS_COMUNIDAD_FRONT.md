# Estadísticas de lectura y comunidad para el front

## Contrato disponible

`GET /estadisticas/comunidad?limit=10` devuelve un objeto para la pestaña **General**. `limit` se aplica a cada ranking, admite 1–25 y vale 10 por defecto. Requiere JWT. Los nombres y tipos exactos están en `docs/backend/openapi.yaml`.

| Campo | Qué muestra |
|---|---|
| `Resumen` | Personas con al menos un libro actualmente leído, pares persona-libro leídos y media por lector. |
| `EstilosMasLeidos`, `AutoresMasLeidos`, `IdiomasMasLeidos` | Lectores distintos y lecturas de libros independientes. Un libro con varios autores/estilos/idiomas cuenta una vez en cada categoría relacionada. |
| `SagasMasLeidas`, `UniversosMasLeidos` | Lecturas de libros independientes relacionados con cada saga o universo. Un libro cuenta una sola vez por universo aunque llegue por varias relaciones. |
| `LibrosMasLeidos` | Libros con más lectores. `PuntuacionMedia` es `null` si tienen menos de tres valoraciones válidas. |
| `MejorValorados` | Libros independientes con al menos tres valoraciones, ordenados por media y después número de valoraciones. |
| `AntologiasMasLeidas` | Antologías cuyo último estado válido es leído; sus secciones no se cuentan como libros independientes. |
| `LecturasPorMes` | Doce meses naturales, incluido el actual. Cuenta una finalización por persona, libro y mes a partir del historial. |
| `ActividadComunidad30Dias` | Publicaciones, comentarios y reacciones públicas, más debates, votos, eventos y nuevas incorporaciones de clubes abiertos visibles. |
| `ClubesMasAmplios` | Clubes abiertos visibles con más miembros activos. |
| `ClubesMasActivos` | Clubes abiertos visibles ordenados por la puntuación de actividad de 30 días que ya usa `/clubes-lectura/resumen`; incluye volumen, variedad y última actividad. |

`GET /estadisticas/comunidad/clubes/{id}?limit=10` devuelve `Club`, `UmbralPrivacidad` y `AutoresMasLeidos`. Es la respuesta para «autores más leídos por una comunidad»: mide los libros actualmente leídos por **miembros activos actuales** del club. Solo expone clubes abiertos y visibles; un club cerrado, retirado, eliminado o bloqueado para la cuenta responde `404`.

## Significado y privacidad

- Se incluyen únicamente cuentas activas, con correo verificado y `mostrar_estadisticas = 1`. `UmbralPrivacidad` vale `3`.
- «Leído» significa que el último estado válido del libro o antología es `2`. Se requiere que la obra siga en la colección de esa persona. Los libros internos de antologías y las secciones de saga/universo no forman parte de los rankings de libros.
- Un ranking de lectura exige al menos tres lectores distintos por fila. Un promedio de puntuación exige tres valoraciones. La serie mensual y cada contador de actividad devuelven `null` cuando hay actividad de solo una o dos personas; `0` significa que no hay actividad. Los totales de `Resumen` son `null` cuando hay uno o dos lectores.
- Los rankings de clubes usan datos ya visibles en el descubrimiento de clubes abiertos. La actividad pública de clubes es distinta de la lectura consentida: su puntuación sigue la lógica existente de `/clubes-lectura/resumen`.
- Una lista vacía o un `null` por privacidad debe presentarse como falta de datos suficientes. El front no debe interpretar `null` como cero ni intentar reconstruir identidades mediante otros endpoints.

## Integración

La pestaña **Personal** conserva sus datos propios. La pestaña **General** puede consumir `GET /estadisticas/comunidad` una vez y dibujar todos los bloques del contrato. Para la ficha de un club público, pedir el segundo endpoint cuando se abra esa ficha. `AutoresMasLeidosPorClub` no se envía en el resumen global porque cada club tiene su propio límite y audiencia.

El 2026-09-27, QA y producción tenían menos de tres personas con lecturas compartidas. Los rankings de lectura pueden venir vacíos y los totales protegidos pueden ser `null` hasta que más personas habiliten esta preferencia.
