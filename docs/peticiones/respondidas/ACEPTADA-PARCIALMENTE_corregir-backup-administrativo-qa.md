# Corregir la generación del backup administrativo en QA

## Estado de respuesta

Aceptada parcialmente el 26 de agosto de 2026.

Backend no habilita la generación de copias completas en QA: sustituyó el `500` accidental por el contrato determinista `409 admin_backup_unavailable_in_qa`. El ZIP real, sus cabeceras y la escritura transaccional se acreditan mediante integración backend sobre `libros_qa` y archivos temporales. Frontend puede comprobar autorización y barrera ambiental en la campaña real, y mantiene pruebas unitarias para la respuesta binaria `200`.

Queda deliberadamente fuera de la campaña frontend descargar un backup real desde QA o producción. Esta limitación no se elude ni se interpreta como éxito binario; se conserva como separación de responsabilidades para evitar persistir o publicar datos completos.

## Qué se necesita

Corregir el runtime QA de `GET /admin/backup` para que un administrador pueda generar y descargar el ZIP documentado, o documentar cualquier prerrequisito operativo adicional que el frontend deba satisfacer antes de invocarlo.

El contrato vigente define `200 application/zip` para un administrador y reserva `500 admin_backup_generation_failed` para un fallo real de generación. El frontend no debe aceptar ese `500` como comportamiento normal ni ocultar la comprobación de la campaña final.

## Evidencia reproducible

La campaña frontend `32944253747`, sobre dataset `2026.08.4` y con lease global válida, acreditó lo siguiente:

1. `userA` autenticado solicita `GET /admin/backup` y recibe correctamente `403 admin_required`.
2. La identidad `admin` se autentica mediante Firebase y obtiene su access token de aplicación.
3. La misma ruta con ese token devuelve `500` en el intento original y en el reintento.
4. El dataset fue restaurado a `baseline` y la lease se liberó correctamente después del fallo.

No se leyó, adjuntó ni serializó el cuerpo binario de ninguna copia. Los logs frontend solo conservan estado HTTP y código contractual.

## Por qué se necesita

El backup forma parte de la vista de administración y del criterio de cierre del Hito 15. Un `500` estable impide verificar que producción pueda representar con fidelidad una descarga válida y deja sin acreditar la capacidad operativa que publica OpenAPI.

## Qué se espera lograr

- Identificar y corregir la causa de `admin_backup_generation_failed` en QA.
- Añadir una prueba backend que ejecute la generación con la identidad administrativa determinista y compruebe ZIP no vacío, `Content-Type` y `Content-Disposition`.
- Mantener la autorización actual: miembro `403`, administrador `200`.
- Confirmar que el endpoint puede ejecutarse bajo la lease QA vigente y que no requiere acceso o parámetros fuera del contrato.
- Actualizar la documentación si existe algún requisito de filesystem, permisos o configuración que deba estar garantizado por el despliegue.

Cuando backend responda, frontend repetirá la campaña completa; no se solicita ninguna copia ni evidencia que contenga datos del backup.
