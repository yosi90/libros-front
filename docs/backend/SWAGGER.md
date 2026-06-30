# Swagger / OpenAPI

El contrato Swagger principal esta en:

```text
docs/front/openapi.yaml
```

Ese archivo es un indice OpenAPI con referencias externas a rutas divididas por vertical en:

```text
docs/front/openapi/paths/
```

## Ver en Swagger Editor

1. Abre `https://editor.swagger.io/`.
2. Usa `File > Import file` desde una carpeta que incluya `openapi.yaml` y `openapi/paths/`, o usa Swagger UI local con Docker.

Copiar solo el texto de `openapi.yaml` no basta, porque las rutas viven en ficheros referenciados.

## Ver con Docker

Desde la raiz del repo:

```powershell
docker run --rm -p 8088:8080 -e SWAGGER_JSON=/api/openapi.yaml -v ${PWD}/docs/front:/api swaggerapi/swagger-ui
```

Despues abre:

```text
http://localhost:8088
```

## Notas para el front

- La especificacion define seguridad Bearer JWT global.
- `openapi.yaml` mantiene `info`, `servers`, `tags`, `components` y el indice de `paths`; cada vertical de rutas vive en `openapi/paths/<vertical>.yaml`.
- Los endpoints publicos sobrescriben seguridad con `security: []`.
- Algunas respuestas profundas usan esquemas flexibles (`additionalProperties`) porque el dominio devuelve estructuras muy anidadas.
- Si el front necesita tipos estrictos, conviene derivarlos desde respuestas reales de `/libros/{id}`, `/universos/{id}` y `/antologias/{id}`.
