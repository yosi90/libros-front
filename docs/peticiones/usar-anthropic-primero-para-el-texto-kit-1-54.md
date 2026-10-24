# Petición a las webs y apps del ecosistema: usar Anthropic primero para el texto (kit 1.54)

Fecha: 2026-10-24
Solicitante: plataforma común de Yosiftware (`C:\Users\Yosi\Desktop\administracion yosiftware`), a petición del propietario
Destinatarios: Fichas 3.5 (web, backend y 3.5 Companion), Nodaria, Lorcana (web y Yosircana), Poke-Voice, Re-Notas, Libros (API y frontend), Hotrods y el Hall. p.i.c. lo recibe en su roadmap de adhesión.
Afecta a: qué proveedor de IA usa cada web por la persona, y qué modelo propone por defecto.

## Contexto

El propietario ha guardado en su cuenta de Yosiftware una clave de Anthropic que se recarga sola cada mes. Desde hoy, **Anthropic es el proveedor preferido para todo el texto**. Las imágenes siguen con OpenAI, y la voz con ElevenLabs.

Para que valga igual en todas partes y para cualquier persona, la plataforma lo deja como norma del kit 1.54: `ecosistema-kit/CLAVES_DE_IA.md`, «Qué proveedor usar para cada cosa», y un punto nuevo en `LISTA_DE_COMPROBACION.md`, «Claves de IA». El contrato no cambia.

| Para | Primero | Si el primero no está `lista` |
| --- | --- | --- |
| Texto: chat, análisis, ideas, asistentes, resúmenes | `anthropic` | `openai` |
| Imágenes | `openai` | — |
| Voz, música y efectos | `elevenlabs` | `openai`, solo para la voz |
| Transcripción | la que ya uséis (`openai` o `elevenlabs`): Anthropic no transcribe | la otra |

«No está `lista`» es lo que dice `GET /v1/ia/estado` antes de llamar. Después de un error de la llamada no se cambia de proveedor a espaldas de la persona: se le dice y, si queréis, se le ofrece el otro.

## Qué necesitamos

1. **Copiad el kit 1.54** desde `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`.
2. **Si vuestra web elige el proveedor por la persona**, que siga el orden de la tabla.
3. **Si deja elegir el modelo**, que el elegido por defecto sea uno de Anthropic cuando su clave esté `lista`. La persona puede escoger otro.
4. **Responded en vuestra copia** con lo que hayáis comprobado. Si ya lo cumplís, basta decirlo.

## Lo que hemos visto en vuestro código (solo lectura, 2026-10-24)

| Proyecto | Qué usa | Qué falta |
| --- | --- | --- |
| Fichas 3.5 | Ideas de IA (texto), voces de personajes e imágenes de personajes, por la pasarela | Las ideas ya prueban Anthropic primero (`ORDEN_SIN_PROVEEDOR` en `ideas_ia_controller.py`) y la voz, ElevenLabs. Comprobad el modelo que propone por defecto el menú de modelos (`modelo-ia-menu.component.ts`) y que las imágenes van con OpenAI. 3.5 Companion: solo si usa la IA. |
| Nodaria | El asistente (texto), dejando elegir entre tres modelos de cada proveedor | Que el elegido por defecto sea el equilibrado de Anthropic cuando su clave esté `lista`, también con la clave del grupo. |
| Re-Notas | Transcripción con OpenAI y análisis (texto) | El análisis ya va con Anthropic si está `lista` (`CuentaDeYosiftware.kt`). La transcripción sigue con OpenAI. Nada más, salvo confirmarlo. |
| Poke-Voice | Transcripción (OpenAI y ElevenLabs) | Nada, mientras no use texto. Si añade voz, ElevenLabs primero. |
| Lorcana, Libros, Hotrods y el Hall | No usan la pasarela hoy | Nada. Queda como norma para cuando la usen. |

## Comprobaciones previas

- La clave del propietario está guardada en producción, activa, para todas las webs y con su tope. La plataforma no la ve ni la entrega: solo sabe que existe.
- El orden no lo impone la pasarela, que llama al proveedor que pida cada web. Por eso lo tiene que aplicar cada web.

## Calendario y dependencias

Sin fecha ni bloqueo. Cada proyecto, cuando le toque.

## Fuera de alcance

- Cambiar de proveedor por precio o por calidad en cada llamada: el orden es fijo.
- Las claves de otros proveedores: siguen igual.

## Resolución

<!-- La rellena cada destinatario. Ver docs/peticiones/README.md. -->
