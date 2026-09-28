# Fijar España como país de todas las cuentas

## Estado de respuesta

ACEPTADA PARCIALMENTE (28/9/2026). El backend fijó `ES` en las altas. `POST /auth/onboarding` permite omitir `PaisCodigo`; si llega, lo ignora. `PUT /auth/update` rechaza cualquier campo de país con `400 country_is_fixed`. Queda pendiente confirmar que se ejecutó el backfill de las cuentas históricas: la documentación indica que perfil, sesión y comunidad devolverán España *una vez aplicado*. Contrato: `docs/backend/api/AUTENTICACION_FIREBASE.md` y `docs/backend/api/ENDPOINTS.md`.

## Necesidad

El propietario ha decidido retirar la elección de país. El frontend eliminará los selectores de onboarding y perfil y enviará `PaisCodigo: "ES"` en cada alta. El frontend por sí solo no puede corregir los países ya persistidos ni impedir que otro cliente envíe un país distinto.

## Solicitud al backend

Establecer España (`ES`, «España») para las cuentas existentes, incluidas las que tengan país nulo o diferente. Aplicar el valor a todas las altas independientemente del país que envíe un cliente y evitar cambios posteriores mediante las rutas de perfil u otras escrituras. El backend decide la migración y el contrato final; comunicar si `PaisCodigo` debe omitirse o enviarse como `ES` en onboarding y si el perfil debe seguir transmitiendo estos campos o dejarlos fuera.

## Resultado esperado

Todas las cuentas devolverán España de forma consistente en perfil, sesión y comunidad, y ningún cliente podrá alterar ese dato. El frontend adaptará sus peticiones al contrato confirmado.
