# Swagger / OpenAPI

El contrato Swagger esta en:

```text
docs/front/openapi.yaml
```

## Ver en Swagger Editor

1. Abre `https://editor.swagger.io/`.
2. Copia el contenido de `openapi.yaml`.
3. Pegalo en el editor.

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
- Los endpoints publicos sobrescriben seguridad con `security: []`.
- Algunas respuestas profundas usan esquemas flexibles (`additionalProperties`) porque el dominio devuelve estructuras muy anidadas.
- Si el front necesita tipos estrictos, conviene derivarlos desde respuestas reales de `/libros/{id}`, `/universos/{id}` y `/antologias/{id}`.
