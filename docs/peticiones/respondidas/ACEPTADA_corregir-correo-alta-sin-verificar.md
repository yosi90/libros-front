# Corregir el correo de un alta pendiente de verificación

## Estado de respuesta

**ACEPTADA.** El contrato actualizado incorpora `POST /auth/onboarding/email-correction/confirm` para sincronizar un correo nuevo ya verificado en Firebase con una cuenta SQL password aún pendiente. Exige un ID token reciente de la misma identidad, comprueba la unicidad y devuelve `email_corrected`; después el cliente debe llamar a `/auth/session`. Véanse `docs/backend/api/ENDPOINTS.md`, `docs/backend/api/AUTENTICACION_FIREBASE.md` y `docs/backend/openapi/paths/auth.yaml`.

La incidencia que motivó esta petición resultó ser un alias ya ocupado. El backend corrigió su respuesta a `409 onboarding_alias_taken` con `field: Alias`; el alta SQL se revierte. La integración del flujo de corrección de correo queda como mejora independiente, sin bloquear el registro por alias.

## Necesidad

Una persona puede completar `POST /auth/onboarding` con un correo escrito incorrectamente en Firebase. En ese momento ya existe la cuenta SQL, pero `verification_required` no entrega una sesión autenticada. El frontend puede mostrar el correo y evitar el error antes del alta, pero no tiene un contrato para corregirlo después. Borrar solo la identidad Firebase dejaría la cuenta SQL huérfana.

## Solicitud al backend

Definir un flujo seguro para que la misma persona, demostrando control de la credencial Firebase password aún no verificada, pueda corregir el correo de su cuenta SQL pendiente de verificación y volver a enviar la verificación a la dirección nueva. El backend decide endpoints, pruebas de identidad, caducidad, límites y cómo coordinar el cambio con Firebase. Evitar que el flujo permita tomar cuentas ajenas, fusionar identidades o cambiar el correo de cuentas ya verificadas.

## Resultado esperado

El frontend podrá ofrecer «Corregir correo» también en la pantalla de verificación posterior al alta, mostrar la dirección actual y confirmar el resultado sin obligar a intervención manual. Comunicar el contrato y errores tipados para adaptar el cliente y probar el caso de una errata ya persistida.
