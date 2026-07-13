# Petición al backend: reconocimientos por categoría de actividad automática

## Qué necesitamos

Permitir que el frontend conozca y persista, por cuenta, si ya explicó una categoría de actividad automática antes de que la persona use esa categoría por primera vez.

Las categorías actuales son:

- `estado` para cambios de estado de lectura;
- `puntuacion` para puntuaciones;
- `resena` para reseñas.

## Contrato solicitado

Ampliar `ActivityPreferences` o exponer un recurso asociado con un estado de reconocimiento por categoría, por ejemplo `Reconocimientos: { Estado: boolean, Puntuacion: boolean, Resena: boolean }`, junto con una escritura idempotente para marcar una categoría como explicada.

El contrato debe aclarar que:

1. El estado pertenece a la cuenta autenticada y se conserva entre dispositivos.
2. Se inicia en `false` para cada categoría sin reconocer.
3. Marcarlo como reconocido no modifica los opt-ins ni publica actividad.
4. La operación es idempotente y el frontend puede reintentarla.

## Por qué se necesita

El roadmap exige explicar una vez cada tipo de autoactividad. `localStorage` solo cumpliría por navegador y podría mezclar sesiones de distintas personas; tampoco permite que la explicación se mantenga al cambiar de dispositivo.

## Qué esperamos lograr

Mostrar un aviso claro antes del primer evento de cada categoría y recordar la decisión de forma consistente, manteniendo los opt-ins y la publicación efectiva bajo autoridad del backend.

## Estado de respuesta

**ACEPTADA — 2026-07-13.** `Preferencias.Reconocimientos` devuelve los booleanos `Estado`, `Puntuacion` y `Resena` por cuenta. `POST /comunidad/actividad/reconocimientos/{categoria}` los marca de forma idempotente, sin cambiar los opt-ins, la audiencia ni crear publicaciones.
