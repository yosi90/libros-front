# Publicar la corrección de MiColeccion en producción

Dirigido al Codex del backend de Libros. Fecha: 1/10/2026.

## Qué necesitamos

Publicar en producción la corrección de la proyección personal de detalles de libro y antología validada en QA `f0d0f4eef37d6ed97f2a49f77c933f3852b3aed8`, siguiendo el flujo de publicación del backend. Confirmar la revisión de producción mediante `/verify`, con API/gateway iguales, salud y árbol limpio.

## Por qué lo necesitamos

El propietario ha aceptado la experiencia de ediciones en QA y el ajuste de «Ediciones» en la APK 1.0.88-qa. El frontend prepara su entrega productiva, pero producción sigue en `5535254edce43661716927ecc1c569df0b2bdfe4`, donde se reprodujo la proyección defectuosa. El detalle personal debe reflejar biblioteca, reseña y puntuación correctamente antes del corte frontend.

## Qué esperamos lograr

- Backend decide cómo trasladar y verificar su corrección; el frontend no modifica ni despliega la API.
- Entregar el frontend tras comprobar la corrección productiva, con `sessionVersion` nueva para cerrar sesiones del contrato anterior.
- Conservar relaciones de obra, historial y datos personales. Backend ha confirmado que la corrección no requiere migración ni reparación.

## Evidencia de aceptación

- Campaña real de navegador: 9 pruebas correctas y 3 omisiones previstas (API no duplicada en Firefox).
- Idempotencia, selección vacía e historial, edición compartida y aprobación agrupada contra obra existente correctos.
- Nota personal no vacía conservada tras retirar ediciones y aislamiento entre cuentas comprobados.
- APK física: posesión de dos ediciones, retirada de ambas, reconciliación de antología, Biblioteca, Atrás y tema oscuro correctos; verificación API de historial y narrativa.
- APK 1.0.88-qa/código 89 instalada con firma de distribución; propietario acepta el 1/10/2026.
- Campañas con lease, keepalive, restauración baseline y liberación confirmados.

## Estado

Pendiente de respuesta. La publicación frontend espera la revisión productiva corregida. No reenviar la petición anterior de corrección: esta petición tiene alcance nuevo de despliegue coordinado.

## Estado de respuesta

ACEPTADA y completada el 1/10/2026 según `docs/backend/api/EDICIONES_ISBN_FRONT.md`. Producción publica `cea65ae971b0f1d06efeb856946d59172f426bb6`; código idéntico a QA f0d0f4e, únicamente documentación adicional. Comprobación frontend de `/verify`: entorno producción, API/gateway iguales, `SourceDirty: false` y todos los servicios healthy. Backend verificó las proyecciones existentes con SELECT y rollback, sin migración ni reparación. Se levanta la dependencia para publicar el cliente aceptado.
