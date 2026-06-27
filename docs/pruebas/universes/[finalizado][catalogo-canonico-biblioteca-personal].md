# Pruebas Pendientes - Catalogo Canonico y Biblioteca Personal

## Verificaciones automaticas

- [x] Unit tests de estados, permisos, filtros, query params y transformacion de coleccion. Verificado con `npx ng test --watch=false --browsers=ChromeHeadless --include=...`: 19 specs correctos.
- [x] `npm run build`

## Verificaciones manuales desktop

Cerradas documentalmente por cambio de foco al roadmap visual el 2026-06-27. Mantener esta lista como referencia historica para validacion continua con datos reales.

- [ ] Usuario normal ve el catalogo global de libros y antologias.
- [ ] Usuario normal guarda un libro del catalogo eligiendo estado antes de anadirlo a su biblioteca.
- [ ] Usuario normal guarda una antologia del catalogo eligiendo estado antes de anadirla a su biblioteca.
- [ ] Usuario normal puede asignar o cambiar puntuacion personal de libro/antologia.
- [ ] `/dashboard/books` muestra solo la coleccion personal agrupada por universos.
- [ ] Libro de catalogo no guardado no abre detalle narrativo; tras guardarlo si abre.
- [ ] Usuario normal no ve formularios de insercion/edicion canonica.
- [ ] Usuario normal puede crear peticion de alta o correccion de catalogo.
- [ ] Moderador ve formularios canonicos y cola de peticiones.
- [ ] Moderador no ve administracion de cuentas.
- [ ] Admin conserva administracion de cuentas y tambien puede moderar catalogo.
- [ ] Resolver peticion como aprobada, rechazada o devuelta actualiza la cola.

## Bloqueos conocidos

- Ninguno de contrato para la fase actual. Backend ya documento catalogos auxiliares y `Sagas[]` en `/coleccion/universos`.
