# Corregir el 500 del contador de secciones de antología leídas

## Estado de respuesta

ACEPTADA. Backend corrigió `GET /antologias/secciones/leidas`: cuenta las secciones de antologías en colección cuyo último estado es leído, usa el historial contextual y el de libros para instalaciones anteriores, y devuelve `{ "secciones_leidas": 0 }` si no hay ninguna. Verificado en producción el 25/9/2026 con la cuenta del propietario: `200 {"secciones_leidas":19}` y Estadísticas sin aviso parcial. El frontend conserva la degradación por métrica como protección ante fallos futuros.

## Qué se necesita

Corregir `GET /antologias/secciones/leidas` en producción. El 25/9/2026, con la sesión real del propietario (rol administrador, 4 antologías en colección), el endpoint respondió:

```
500 {"code":"anthology_sections_read_count_internal_error","error":"No se pudo obtener el contador de secciones leidas","success":false}
```

El resto de métricas globales (`/libros/leidos`, `/libros/no_leidos`, `/antologias/leidos`, `/antologias/no_leidos`, `/libros/mas_rapido`, `/libros/top_mas_rapido`, `/libros/sin_leer`, `/libros/por_comprar`, `/libros/historial_leidos`, `/libros/promedio_compra_lectura` y `/coleccion/items`) se pidieron en la misma carga; no consta que fallaran por sí mismas.

## Por qué se necesita

OpenAPI declara para este endpoint únicamente `200 MetricObject` y `401`. Un usuario autenticado con colección válida no debería recibir un error interno. El código de error indica que la consulta falla dentro del backend, no que la petición sea inválida.

Hasta ahora el frontend cargaba todas las métricas globales como un bloque y este fallo dejaba la pantalla Estadísticas completa a cero. El frontend ya tolera fallos aislados y muestra «Sin dato» solo en «Secciones leídas», pero la métrica seguirá sin estar disponible hasta que se corrija aquí.

## Qué se espera lograr

- `GET /antologias/secciones/leidas` devuelve `200` con `{ "secciones_leidas": <entero ≥ 0> }` para cualquier usuario autenticado, también cuando tiene antologías con secciones sin estado o sin secciones.
- Si existe un caso de datos inconsistente que provoque el error (por ejemplo, secciones huérfanas o sin libro asociado), se ignora en el recuento o se sanea, sin propagarlo como 500.

## Criterios de aceptación

1. La cuenta del propietario en producción obtiene `200` y un recuento coherente con las secciones que marcó como leídas.
2. Un usuario sin antologías obtiene `200` con `secciones_leidas: 0`.
3. Queda una prueba backend que cubre el caso de datos que provocaba el 500.
