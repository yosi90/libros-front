# Corregir el 500 del detalle de antología y exponer su ubicación

## Estado de respuesta

ACEPTADA. `GET /antologias/{id}` queda documentado como detalle lector de la colección propia, compatible con el historial anterior de secciones, y `GET /catalogo/antologias/{id}/detalle-publico` devuelve `CatalogAnthologyPublicDetail` con `Universo` y `Saga` sin exigir colección propia. El frontend añade la «Gestión de antologías» en Administración usando ese detalle para precargar el editor. Verificación en producción del 25/9 tras recibir la documentación: `GET /antologias/1` seguía respondiendo 500 y el detalle público aún no incluía `Universo`/`Saga`, por lo que el despliegue backend estaba pendiente en ese momento. La documentación backend quedó registrada, por error, dentro del commit `ca38ddf`.

## Qué se necesita

1. Corregir `GET /antologias/{id_antologia}` en producción. El 25/9/2026, con la sesión del propietario (administrador), las cuatro antologías existentes (ids 1 a 4) responden:

   ```
   500 {"code":"anthology_detail_internal_error","error":"No se pudo obtener la antologia","success":false}
   ```

   `GET /catalogo/antologias` responde 200 con las mismas antologías, así que los datos existen.

2. Que administración pueda leer el universo y la saga canónicos de una antología para editarla. El front necesita, para cualquier antología del catálogo (esté o no en la colección de quien edita), al menos `Universo { Id, Nombre }` y `Saga { Id, Nombre, Subtitulo } | null`, además de los campos que ya devuelve el listado (autores, ISBN, páginas, fecha, sinopsis, estilos, portada).

## Por qué se necesita

- `AntologyService.addAntology` y `updateAntology` recargan el detalle tras escribir en `/catalogo/admin/antologias`. Con el 500, crear o editar una antología termina en error para el usuario aunque la escritura se haya hecho.
- El panel de Administración va a gestionar antologías igual que libros: listado del catálogo y formulario lateral. `GET /libros/{id}` ya aporta `Universo` y `Saga` y permite precargar el formulario; para antologías no hay un equivalente documentado, y `/antologias/{id}` además parece ligado a la colección personal (`404 anthology_not_in_collection` para las secciones).

## Qué se espera lograr

- El detalle de antología vuelve a responder 200.
- Administración y moderación pueden obtener la ubicación canónica (universo y saga) de cualquier antología para editarla. El backend decide si amplía `/antologias/{id}`, el listado `/catalogo/antologias` o crea un `GET /catalogo/admin/antologias/{id}`.

## Criterios de aceptación

1. `GET /antologias/1` a `/antologias/4` responden 200 con la cuenta del propietario.
2. Existe una lectura documentada que devuelve universo y saga de una antología del catálogo, accesible para administración y moderación sin exigir que esté en su colección.
3. Crear y editar una antología desde `/catalogo/admin/antologias` y releerla después funciona de extremo a extremo.
