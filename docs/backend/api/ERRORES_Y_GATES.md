# Errores funcionales y gates

Todas las respuestas de error usan el envelope documentado en OpenAPI. Cuando exista `error.code`, el front debe decidir por ese código estable y no por el texto humano.

| Dominio | HTTP | `error.code` | Acción del cliente |
|---|---:|---|---|
| Autenticación | 401 | `authorization_required`, `access_token_expired`, `invalid_token` | Token de la cuenta de Yosiftware ausente, caducado o no válido: `yosiftware.fetch()` renueva y repite; si vuelve a fallar, pedir que entre con `<yosi-acceso>` ([ADHESION_YOSIFTWARE.md](ADHESION_YOSIFTWARE.md)). |
| Autenticación | 403 | `account_deleted` | La cuenta se borró en la plataforma: volver a la vista sin sesión. |
| Autenticación | 503 | `authentication_unavailable` | La API no tiene configurada la validación de la plataforma: error genérico. |
| Cuenta | 403 | `platform_restriction_active` | La cuenta tiene limitado lo que intenta (`details.Alcance` y `details.Hasta`); no ofrecerlo. |
| Cuenta | 403 | `platform_rules_acceptance_required` | Llevar a aceptar las normas de Libros con el SDK y pedir un token nuevo. |
| Coleccion | 409 | `anthology_section_collection_forbidden` | Retirar la seccion de superficies de libro independiente y abrirla exclusivamente desde su antologia. |
| Seccion de antologia | 404 | `anthology_not_in_collection` | Retirar el editor contextual o refrescar la coleccion; la antologia ya no esta disponible para esa cuenta. |
| Seccion de antologia | 404 | `anthology_section_relation_not_found` | Refrescar el detalle: el libro no pertenece a la antologia indicada. |
| Edicion de seccion de antologia | 400 | `anthology_section_update_required_fields`, `anthology_section_update_empty`, `invalid_anthology_section_pages` | Enviar `AntologiaId`, `LibroId` y al menos un metadato editable; las paginas de encaje deben ser numericas. |
| Multipart de seccion de antologia | 400 | `invalid_multipart_payload` | Corregir el JSON serializado enviado en `payload` o `data`. |
| Clubes | 409 | `club_owner_limit_reached` | Mostrar el límite de producto. |
| Clubes y su espacio | 503 | `club_space_unavailable` | La plataforma no responde: no se ha hecho nada; reintentar más tarde. |
| Clubes y su espacio | 403, 409, 429, 502 | `club_space_account_restricted`, `club_space_account_unavailable`, `club_space_account_limit`, `club_space_two_steps_required`, `club_space_daily_limit`, `club_space_rejected` | La plataforma no deja crear o cambiar el espacio del club; mostrar `error` (`details.Plataforma` lleva su código). |

## Normas pendientes

Las normas de uso comunes y las normas propias de Libros las publica la plataforma. Cuando el token trae `normasPendientes`, la API responde `403 platform_rules_acceptance_required` en las rutas no exentas. El primer `403` de ese código debe:

1. Llevar a aceptar las normas con el SDK de la plataforma, una sola vez, sin duplicar diálogos por cada petición fallida.
2. Suspender el resto del arranque privado (comunidad, clubes y fichas de obra) y no reintentarlo mientras sigan pendientes: este `403` no es transitorio.
3. Tras aceptar, pedir un token nuevo (`yosiftware.fetch()` lo renueva) y relanzar el arranque una vez.

Mientras faltan siguen disponibles, con el token, las lecturas exentas: listados de catálogo y autores, universos y sagas, catálogos auxiliares, resumen de colección, capacidades y el usuario local propio (`GET /usuarios/me`). Cualquier escritura sigue exigiendo la aceptación. OpenAPI replica en `x-functional-error-codes` los códigos propios de cada operación y prevalece sobre esta tabla.
