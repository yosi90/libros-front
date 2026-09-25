# Admitir peticiones de catálogo de tipo «Otro»

## Estado de respuesta

ACEPTADA. `POST /peticiones/catalogo` admite `TipoEntidad: "otro"` con `Payload.Texto` obligatorio (hasta 4000 caracteres) y `Payload.Titulo` opcional (1-120), sin `EntidadId`; la `Accion` se guarda como `comentario`. Sigue la misma cola, bandejas y notificaciones, y aprobarla la marca atendida sin tocar el catálogo. Errores: `target_id_not_allowed`, `invalid_other_request_payload`, `invalid_other_request_text` e `invalid_other_request_title`. El frontend añade «Otro» a «Proponer corrección» (título opcional y texto obligatorio) y muestra «Otra petición · Comentario libre» en Mis peticiones y en Moderación. La documentación backend llegó el 25/9 y quedó registrada, por error, dentro del commit `ca38ddf` junto a un arreglo de gráficas.

## Qué se necesita

Un modo de enviar por `POST /peticiones/catalogo` una petición que no corresponda a una entidad concreta del catálogo: un comentario libre del usuario dirigido a administración y moderación de catálogo.

Hoy `TipoEntidad` solo admite `autor`, `universo`, `saga`, `libro` y `antologia`, y las ediciones exigen `EntidadId`. Una propuesta que no encaja en ninguno de esos casos no se puede enviar.

## Por qué se necesita

El propietario ha decidido que las propuestas de los usuarios sin rol de administración se concentren en Catálogo. El nuevo botón «Proponer corrección» permite elegir qué se corrige (libro, antología, autor, universo o saga) y buscar el elemento concreto. El propietario pide además una opción «Otro» para las peticiones que no encajen con nada previsto: por ejemplo, un error en un dato que no pertenece a una ficha, una sugerencia sobre cómo se agrupa algo o una duda sobre el catálogo.

## Qué se espera lograr

- Poder enviar una petición «Otro» con, como mínimo, un texto libre obligatorio y, opcionalmente, un título breve.
- Que llegue a la misma cola de «Peticiones de catálogo» que ven administración y moderación, con el mismo ciclo de estados (`pendiente`, `aprobada`, `rechazada`, `devuelta`) y las mismas notificaciones al autor.
- Que no requiera `EntidadId`.

El backend decide cómo modelarlo (un nuevo valor de `TipoEntidad`, una `Accion` distinta u otro endpoint). El frontend se adaptará al contrato que se publique.

## Criterios de aceptación

1. Un usuario autenticado puede crear una petición «Otro» solo con texto libre.
2. Administración y moderación la ven y la resuelven igual que las demás peticiones.
3. El autor la ve en «Mis peticiones» con su estado.
4. OpenAPI y `ENDPOINTS.md` documentan el contrato y sus validaciones.
