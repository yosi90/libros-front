# Backup SQL de desarrollo

`GET /admin/backup` es una operacion administrativa con escritura local. Actualiza los scripts de `Base de datos/@Desarrollo` a partir de la base SQL Server a la que se conecto la API y devuelve un ZIP con ese resultado.

## Alcance

- Incluye todas las tablas no internas de SQL Server y todas sus filas: no existe ningun filtro por usuario ni por entidades narrativas.
- Solo actualiza `Base de datos/@Desarrollo`; nunca modifica `Base de datos/@Produccion`.
- Antes de reemplazar un archivo, crea `Base de datos/@Desarrollo/versiones_previas/<AAAAMMDD-HHMMSS>/` y copia ahi todos los `.sql` de primer nivel (anade un sufijo correlativo si coincidiera el segundo). Conserva las cinco snapshots mas recientes.
- Si no puede escribir todos los SQL, repone los que ya hubiera sustituido desde esa snapshot. Si falta el `CREATE TABLE` versionado de una tabla real, cancela sin modificar los scripts.
- Conserva la codificacion original de cada script cuando puede representarse; si los nuevos datos lo requieren, actualiza ese archivo a UTF-8.

## Contenido generado

Los bloques `INSERT ... VALUES` de los scripts `0` a `10` se actualizan como una fotografia total de la base. El volcado consolidado se escribe en `10 - Resto.sql`, con `IDENTITY_INSERT` cuando corresponde y con las constraints deshabilitadas durante la carga y revalidadas al terminar. Asi los SQL de desarrollo pueden reconstruir todos los datos aunque haya dependencias circulares.

Los scripts `11 - Creacion de indices.sql` y `12 - Backfills.sql` no se reescriben. En particular, los `INSERT ... SELECT` de backfill son logica operativa, no datos de la fotografia, y se conservan tal cual.

## Uso y recuperacion

La ruta exige JWT de administrador. Ejecutarla sobre el entorno local actualiza la fotografia de `libros_pruebas`; antes de usarla contra otro destino hay que confirmar `LIBROS_DB_DATABASE` y el entorno. Para recuperar una version anterior, copiar manualmente los `.sql` de la snapshot fechada elegida al nivel superior de `@Desarrollo`; no se restauran automaticamente desde la API.
