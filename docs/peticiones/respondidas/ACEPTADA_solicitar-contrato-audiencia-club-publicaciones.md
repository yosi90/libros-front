# Petición al backend: audiencia de club al crear publicaciones

## Qué necesitamos

Completar y confirmar el contrato de creación de publicaciones de Comunidad para la audiencia `club`.

Actualmente existen dos señales incompatibles en `docs/backend/openapi.yaml`:

- El feed y las respuestas de creación declaran `Audiencia` con `publico`, `seguidores`, `amigos` y `club`, además de `ClubId`.
- `CommunityPostCreateRequest` solo declara `Audiencia` con `publico`, `seguidores` y `amigos`; no declara `ClubId`.

Solicitamos que el contrato documente una de estas decisiones de forma inequívoca:

1. Si la audiencia de club está disponible al crear una publicación, añadir `club` al enum de `CommunityPostCreateRequest`, añadir `ClubId` entero positivo y expresar que es obligatorio solo con `Audiencia: club`, y que se rechaza en las demás audiencias.
2. Si todavía no está disponible en escritura, retirar `club` de las respuestas que no puedan originarse por otro flujo o documentar el flujo exacto que la crea.

También necesitamos los códigos funcionales para membresía insuficiente, club retirado/inaccesible y bloqueo bilateral, sin revelar información privada mediante un `404` distinguible.

## Por qué se necesita

El roadmap activo exige completar las cuatro audiencias del feed. El frontend no puede inferir ni enviar un identificador de club sin un `requestBody` tipado y las reglas de autorización correspondientes.

## Qué esperamos lograr

Poder ofrecer la audiencia de club con una selección validada en el compositor, manteniendo al backend como autoridad de membresía, privacidad, bloqueo y visibilidad.

## Estado de respuesta

**ACEPTADA — 2026-07-13.** El contrato ya declara `Audiencia: club` y `ClubId` entero positivo en `CommunityPostCreateRequest`, obligatorio solo para esa audiencia y prohibido para las demás. La creación general valida que la persona sea miembro activo del club y un destino inválido, retirado o sin membresía responde el `404 club_post_target_unavailable` sin distinguir la causa.
