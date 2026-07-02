# Bugs y ajustes de entidades narrativas

## Pendientes

- Verificar manualmente el flujo completo cuando el backend implemente `PATCH` y desasociacion por libro para las entidades narrativas.
- Ajustar el resto de inserciones narrativas entidad a entidad cuando se validen sus campos especificos.

## Resueltos

- Ajustado el listado de entidades narrativas para mantener el header visible mientras se scrollean chips y para pegar los grupos de libros previos al fondo cuando sobra altura.
- Extraido el textarea RTF de escenas a un editor comun y reutilizado en entradas para guardar y editar descripciones con el mismo formato enriquecible; ajustado el alto minimo comun y la sincronizacion al navegar entre capitulos de interludio.
- Mejorado el alta de apodos en nuevo personaje: accion en cabecera de seccion, minimo de 3 caracteres y bloqueo de guardado si queda un apodo pendiente invalido.
- Ajustados los anchos laterales del router de libro para que listas de personajes en escenas, relaciones/apodos de personaje y relaciones de organizacion no ocupen mas espacio del necesario.
- Alineadas las inserciones narrativas con la vista de capitulo en el gestor unificado: entradas como tarjetas tipo escena, selector de personajes de eventos con panel lateral y relaciones de organizaciones con panel de personajes/chips.
- Corregida la primera pasada de insercion: iconos de inputs alineados, boton de alta movido al header como accion solo icono y validacion minima de nombre/entrada antes de permitir guardar.
