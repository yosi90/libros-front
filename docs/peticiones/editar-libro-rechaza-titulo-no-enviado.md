# Petición backend: editar un libro falla por un `Titulo` que el cliente no envía

## Qué se necesita

Corregir `PATCH /catalogo/admin/libros/{id}` para que no rechace la edición por el campo `Titulo` cuando la petición no lo incluye. Hoy el libro 133 («Carl el mazmorrero») no se puede editar de ninguna forma, ni con portada ni sin ella.

## Evidencia (26/9, producción, cuenta del propietario)

Petición JSON sin portada:

```json
PATCH /catalogo/admin/libros/133
{"Nombre":"Carl el mazmorrero","ISBN":"9788410466135","Paginas":0,"Orden":1,"Autores":[56],"Estilos":[153,139,144,239,217],"SagaId":44}
```

Respuesta:

```json
400 {"code":"catalog_admin_validation_error","error":"Revisa el título.","field":"Titulo",
     "debug":{"message":"HTTP 400: catalog_admin_validation_error; field=Titulo","requestId":"e8d9df9e209541909a0ab2a37b47a2dc"}}
```

La misma edición en `multipart/form-data` (el mismo JSON en `payload` y un JPEG válido en `image`) responde igual: `requestId` `3043fc5f521849a2960d8c9d02ca1f84`. Con un fichero que no es imagen, la respuesta es la esperada (`catalog_cover_invalid_format`, `field: image`), así que el multipart se lee bien y el problema está en la validación posterior.

Observaciones:

- El cuerpo no contiene `Titulo`. `CatalogAdminWrite` lo declara opcional y sin restricciones documentadas.
- `GET /libros/133` no expone `Titulo`, así que el frontend no puede ver ni corregir el valor guardado.
- El mismo flujo JSON funcionó el 26/9 con el libro 29 («Siega»), de modo que parece depender del valor almacenado en el libro 133 (probablemente vacío o fuera de rango) y de que la validación se aplique a la entidad completa y no solo a los campos enviados.

## Por qué se necesita

El propietario está añadiendo portadas a los libros del catálogo desde Administración y no puede guardar este libro. El mensaje «Revisa el título.» apunta a un dato que la pantalla no muestra, así que no hay forma de resolverlo desde la interfaz.

## Qué se espera lograr

- Que un `PATCH` parcial valide solo los campos enviados (o que un `Titulo` almacenado inválido no bloquee la edición de otros datos).
- Si `Titulo` debe tener un valor, corregir los libros afectados en la base de datos o documentar cómo debe enviarlo el cliente y exponerlo en el detalle.
- Confirmar si hay más libros con el mismo problema.
