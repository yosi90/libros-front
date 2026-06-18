# Alinear front con contrato API actualizado

## Objetivo

Adaptar el frontend Angular al contrato actual documentado en `docs/backend/`, eliminando dependencias de rutas legacy cuando haya alternativa clara y dejando aislados los flujos que requieran endpoints no documentados.

## Checklist

- [x] **Descripcion:** Corregir referencias documentales internas de Swagger.
  **Por que se necesita:** `SWAGGER.md` apunta a una ruta antigua que ya no existe.
  **Que se espera lograr:** Que cualquier validacion manual de OpenAPI use `docs/backend/openapi.yaml`.
  **Peligros si se mantiene como estaba:** Falsos negativos al intentar abrir Swagger y confusion sobre la fuente real del contrato.
  **Peligros del cambio:** Bajo; solo afecta documentacion.

- [x] **Descripcion:** Sustituir carga legacy de libro por `GET /libros/{id_libro}`.
  **Por que se necesita:** `BookEmmitterService` usa `/book/{bookId}/{userId}`, ruta no documentada.
  **Que se espera lograr:** Que las rutas internas de libro/personaje consuman el mismo contrato que `BookService`.
  **Peligros si se mantiene como estaba:** Roturas runtime si el backend retira la ruta legacy o devuelve estructura distinta.
  **Peligros del cambio:** Puede cambiar el comportamiento si la ruta legacy enriquecia el libro con datos no presentes en `/libros/{id_libro}`.

- [x] **Descripcion:** Adaptar la superficie de personajes al nuevo modelo de nombres por apodo/libro.
  **Por que se necesita:** El front trata `name` como dato editable directo, pero la API resuelve `Nombre` desde apodos.
  **Que se espera lograr:** Mostrar `Nombre` como dato contextual y bloquear o redirigir ediciones no soportadas hasta que exista contrato documentado.
  **Peligros si se mantiene como estaba:** Crear o actualizar personajes podria enviar datos que ya no existen como columna directa.
  **Peligros del cambio:** Perdida temporal de edicion de personajes si no hay endpoints documentados para apodos.

- [x] **Descripcion:** Inventariar endpoints usados por el front que no estan documentados.
  **Por que se necesita:** Hay llamadas a `/auth/registeradmin`, `/user`, `/libros/comprados`, `/chapter` y `newstatus`.
  **Que se espera lograr:** Decidir por cada una si se documenta en backend, se migra o se desactiva en UI. Resultado actual: eliminados usos muertos de `/character`, `/chapter`, `/libros/comprados` y `newstatus`; quedan activos `/auth/registeradmin` y `/user` en el panel admin por falta de alternativa documentada.
  **Peligros si se mantiene como estaba:** Errores silenciosos en pantallas administrativas o estadisticas.
  **Peligros del cambio:** Puede aflorar deuda de funcionalidades parcialmente implementadas.

- [ ] **Descripcion:** Implementar o registrar huecos del contrato nuevo no cubiertos por el front.
  **Por que se necesita:** Password reset, notas, estados de localizacion y algunas secciones estan documentados pero no tienen cliente visible.
  **Que se espera lograr:** Priorizar pantallas/servicios nuevos sin mezclarlo con la correccion de roturas existentes.
  **Peligros si se mantiene como estaba:** Funcionalidades disponibles en API no aprovechadas por el producto.
  **Peligros del cambio:** Alcance amplio si se intenta resolver todo en una sola sesion.

## Notas

- No modificar `docs/backend/` desde el frontend. Si se detectan discrepancias en esa copia, crear una peticion separada para el Codex/backend y esperar una nueva exportacion de documentacion.
- Peticion creada para backend: `docs/roadmaps/api-contract/BACKEND_REQUEST_personajes_y_endpoints.md`.
- Si un endpoint necesario para personajes existe en backend pero no esta en `docs/backend/`, primero debe documentarse alli antes de adaptar el front a esa ruta.
- La creacion/edicion de personajes queda bloqueada hasta que el contrato documente endpoints de personajes/apodos. Mientras tanto, la pantalla de personaje solo muestra datos resueltos desde `GET /libros/{id_libro}`.
- El panel admin sigue usando `/auth/registeradmin` y `/user`. No se ha retirado porque son flujos activos y no hay ruta documentada equivalente.
- Cerrado como historico al recibir `docs/backend/CAMBIOS_ROADMAP_PARIDAD_APP_ESCRITORIO.md`; el trabajo vivo continua en `ROADMAP_ACTIVO_paridad-app-escritorio.md`.
