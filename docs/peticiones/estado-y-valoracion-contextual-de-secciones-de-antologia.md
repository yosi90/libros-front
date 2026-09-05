# Estado y valoración contextual de secciones de antología

## Qué se necesita

Un contrato para consultar y actualizar el estado de lectura y la valoración de una sección dentro de la antología que el usuario tiene en su colección. La operación debe identificar tanto `id_antologia` como `id_libro` y devolver el estado contextual canónico, sin crear una entrada independiente de la sección en la colección general.

Como mínimo, frontend necesita:

- consultar el estado y la valoración contextual de una sección;
- actualizar su estado de lectura;
- crear, modificar o limpiar su valoración;
- conocer los errores canónicos de sección ajena, antología no disponible y relación sección-antología inválida;
- disponer del contrato documentado en OpenAPI y de una forma de reconciliar la antología completa después de escribir.

## Por qué se necesita

La API vigente rechaza correctamente las escrituras directas sobre una sección mediante `anthology_section_collection_forbidden`. Sin embargo, la pantalla de secciones de Android debe ofrecer el mismo editor de tres puntos que el resto de títulos para que la persona pueda registrar cómo lleva cada relato o parte de la antología.

Reutilizar los endpoints de libro independiente rompería la decisión ya adoptada: la sección volvería a aparecer como título autónomo en Biblioteca y alteraría sus contadores.

## Qué se espera lograr

Que Android pueda abrir un editor contextual de estado y valoración desde cada sección, guardar de forma segura y refrescar el progreso agregado de la antología. La sección seguirá siendo visible solo dentro de su antología y nunca será tratada como libro independiente.

## Restricciones de integración

- No se enviarán escrituras a los endpoints actuales de colección de libros mientras no exista este contrato.
- Frontend necesita IDs estables y valores canónicos equivalentes a los estados ya usados por libros y antologías.
- Una respuesta de escritura debería incluir el estado resultante o permitir una relectura inequívoca de la antología.
