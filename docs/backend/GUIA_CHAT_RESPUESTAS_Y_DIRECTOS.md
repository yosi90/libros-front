# Guía de integración: respuestas de chat y directos

## Estado

Las respuestas persistentes y la consulta previa de elegibilidad de conversaciones directas están disponibles. OpenAPI es el contrato de tipos definitivo.

## Respuestas

Al crear un mensaje se podrá incluir `MensajeRespondidoId` de otro mensaje de la misma conversación. El historial, la creación y los eventos `message.created` devolverán `MensajeRespondido`, un resumen de la referencia. No se debe asumir que contiene el mensaje completo ni que es editable desde la respuesta.

## Directos

Antes de mostrar o habilitar la acción de abrir un directo, el cliente consultará la elegibilidad del usuario destino. La respuesta comunicará si se permite y un motivo seguro cuando no. El resultado puede cambiar entre consulta y creación, así que `POST /chat/conversaciones/directa` sigue siendo la autoridad final y el front debe tratar su `403` como un posible cambio de estado.

La decisión se basa en bloqueo bilateral, amistad, o seguimiento cuando la persona objetivo permite mensajes. Nunca se revela quién bloqueó a quién.
