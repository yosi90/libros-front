# Garantizar «Sin localización» en `BookDetail`

## Necesidad

Los formularios de escenas y eventos requieren una localización válida. El producto establece que todo libro debe disponer siempre de la localización neutra canónica «Sin localización», pero existían respuestas en las que `BookDetail.Localizaciones` llegaba vacío o no contenía esa opción. El frontend no puede fabricar una fila válida porque necesita el identificador real para enviar `Id_Localizacion`.

## Solicitud al backend

- Garantizar de forma idempotente que todo libro accesible para lectura narrativa tenga una localización personal canónica «Sin localización» con ID válido.
- Incluirla siempre en `Localizaciones` tanto en `GET /libros/{id_libro}` como dentro de `Libro.Localizaciones` en `GET /antologias/secciones/{id_libro}`.
- Sanear los libros/usuarios existentes a los que les falte la relación, sin duplicar la localización si ya existe con diferencias de mayúsculas o tildes.
- Documentar si esa localización puede borrarse o desasociarse; la preferencia del frontend es que la invariante no pueda romperse.
- Añadir cobertura de contrato para ambos endpoints y para un usuario/libro preexistente sin localizaciones narrativas propias.

## Resultado esperado

Escenas y eventos pueden seleccionar siempre «Sin localización» y enviar su ID canónico. El frontend mantiene el estado inválido explícito si alguna respuesta excepcional omite el ID, sin inventar identificadores.

## Estado de respuesta

Aceptada el 8 de septiembre de 2026. Backend documenta `localizaciones.id = 1` como la localización global e inmutable «Sin localización», visible para cualquier usuario cuando esté relacionada con el libro o su saga. No puede editarse, desasociarse ni ampliarse mediante entradas. El entorno QA ya incluye la corrección y la prueba física confirma que vuelve a aparecer en escenas.
