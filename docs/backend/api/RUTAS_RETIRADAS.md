# Rutas retiradas y recambios

Este documento registra las rutas HTTP retiradas de la API y su sustitución vigente. La web propia debe consumir siempre el recambio indicado; no hay aliases, redirecciones ni periodo de compatibilidad.

Se mantiene como registro operativo vigente, no como guía histórica.

| Ruta retirada | Recambio vigente | Motivo |
|---|---|---|
| `GET /user` | `GET /auth/user` | Se eliminó el duplicado de consulta del usuario autenticado. |
| Escrituras de catálogo bajo `/autores`, `/universos`, `/sagas`, `/libros` y `/antologias` | `POST` / `PATCH /catalogo/admin/{tipo}` y `/catalogo/admin/{tipo}/{id}` | La administración del catálogo se concentra bajo `/catalogo/admin/*`; requiere rol administrador o moderador. |
| `POST` / `PATCH /libros/{id}/idiomas` | `PATCH /catalogo/admin/libros/{id}` con `Idiomas: [1, 2]` | La ruta no estaba registrada en la API. El recambio requiere administrador o moderador y reemplaza la lista completa de idiomas cuando se envía `Idiomas`; para añadir uno, conservar los IDs actuales y enviar la lista resultante. |
| `GET /chat/grupos/{id}/candidatos` | `GET /chat/grupos/candidatos?ConversacionId={id}` | La búsqueda canónica sirve creación y administración, pagina y aplica la misma elegibilidad que un directo. |
| `POST /chat/grupos/{id}/participantes/{user_id}` | `POST /chat/grupos/{id}/invitaciones` con `{ "Invitados": [user_id] }` | Las altas directas se retiraron: toda incorporación privada requiere consentimiento explícito. `DELETE` en la ruta de participante se conserva para expulsión. |

| `DELETE /notificaciones/dispositivos/{id}` | `DELETE /notificaciones-dispositivos/{id}` | Evita solaparse estructuralmente con la lectura individual de notificaciones. |
| `GET /chat/grupos/invitaciones` y `PATCH /chat/grupos/invitaciones/{id}` | `GET /bandejas/chat/grupos/invitaciones` y `PATCH /bandejas/chat/grupos/invitaciones/{id}` | La bandeja propia pasa a un recurso raíz inequívoco frente a las invitaciones de un grupo concreto. |
| `GET /clubes-lectura/solicitudes/mias` y `PATCH /clubes-lectura/solicitudes/mias/{id}` | `GET /bandejas/clubes/solicitudes` y `PATCH /bandejas/clubes/solicitudes/{id}` | La bandeja global se separa de las solicitudes de un club concreto. |
| `GET /clubes-lectura/invitaciones` y `PATCH /clubes-lectura/invitaciones/{id}` | `GET /bandejas/clubes/invitaciones` y `PATCH /bandejas/clubes/invitaciones/{id}` | La bandeja global se separa de las invitaciones de un club concreto. |
| `PATCH / DELETE /coleccion/libros/estados/{id}` | `PATCH / DELETE /coleccion/historicos/libros/estados/{id}` | El histórico global deja de compartir plantilla con el estado de una obra concreta. |
| `PATCH / DELETE /coleccion/antologias/estados/{id}` | `PATCH / DELETE /coleccion/historicos/antologias/estados/{id}` | El histórico global deja de compartir plantilla con el estado, puntuación o reseña de una antología concreta. |

## Regla de mantenimiento

Al retirar una ruta, registrar aqui la ruta y metodos, actualizar en la misma sesión `docs/backend/api/ENDPOINTS.md` y `docs/backend/openapi.yaml`, y añadir o adaptar una prueba de regresion que confirme que ya no se registran cuando sea viable. Si no existe recambio, indicarlo expresamente para que el front elimine el flujo correspondiente.
