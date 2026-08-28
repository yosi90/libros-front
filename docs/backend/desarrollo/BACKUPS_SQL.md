# Backup SQL administrativo

`GET /admin/backup` crea una fotografia completa de los datos de la base SQL Server conectada. La ruta exige JWT de administrador y no admite parametros.

## Comportamiento por entorno

- En local con `DEBUG=true`, usa la base activa y actualiza `Base de datos/@Desarrollo`.
- En produccion, y en local sin debug, usa la base activa y actualiza `Base de datos/@Producción`.
- En QA no genera ni persiste copias: devuelve `409 admin_backup_unavailable_in_qa`. La implementacion se acredita contra `libros_qa` mediante una prueba de integracion que trabaja exclusivamente sobre archivos temporales.

## Scripts canonicos e historico

La estructura `0` a `12` no cambia. Solo se regeneran los bloques top-level `INSERT ... VALUES` que ya existen en los scripts de datos `1` a `10`. No se modifican los seeds de `0`, los indices de `11`, los backfills de `12` ni ningun `INSERT ... SELECT`; tampoco se agregan bloques para tablas operativas que no formen parte de los seeds canonicos.

La escritura de `1` a `10` es conjunta: una tabla o columna inexistente, un bloque ambiguo o un fallo de filesystem cancela la operacion y repone los archivos anteriores. Tras cada ejecucion correcta se copia el conjunto actualizado de SQL top-level a `versiones_previas/<AAAAMMDD-HHMMSS>` y se conservan las cinco ejecuciones exitosas mas recientes.

## ZIP descargado

El ZIP no replica la agrupacion canonica. Contiene un `.sql` numerado por cada tabla no interna de la base, incluidas las tablas operativas y las tablas vacias. El orden respeta dependencias; el primer y ultimo archivo deshabilitan y revalidan las constraints de la carga completa. Las tablas identity usan `IDENTITY_INSERT`.

Cada `INSERT` contiene como maximo 1.000 filas, limite de SQL Server. Dentro de cada bloque, las tuplas se agrupan hasta 250 caracteres por linea cuando es posible; una tupla individual mas larga se conserva completa. No se generan variantes `_sin_ids`.

El ZIP esta pensado para repoblar un esquema compatible recien creado y no contiene `USE`, scripts de esquema, indices, backfills ni `versiones_previas`.

## Recuperacion

Para recuperar una version canonica anterior, copiar manualmente los `.sql` de la snapshot elegida al nivel superior del mismo entorno. El endpoint no restaura snapshots automaticamente. Tanto desarrollo como produccion modifican archivos controlados por Git por decision operativa expresa; hay que revisar y confirmar esos cambios antes del siguiente despliegue.
