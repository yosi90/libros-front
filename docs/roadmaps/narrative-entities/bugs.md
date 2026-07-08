# Bugs y ajustes de entidades narrativas

## Pendientes

- Verificar manualmente el flujo completo cuando el backend implemente `PATCH` y desasociacion por libro para las entidades narrativas.
- Ajustar el resto de inserciones narrativas entidad a entidad cuando se validen sus campos especificos.

## Resueltos

- Activados y sincronizados los sublistados especificos en modificacion: relaciones/apodos de personajes y relaciones de personajes/localizaciones de organizaciones.
- Aumentado el alto minimo de las tarjetas de entradas narrativas para que el editor RTF no desborde cuando el contenedor interno necesita scroll.
- Corregida la medicion de alto de entradas narrativas para que crezcan con el editor RTF y evitado que el cursor vuelva al inicio al escribir espacios o saltos de linea.
- Convertido el editor RTF compartido en editor con toolbar de negrita, cursiva, subrayado y tachado, manteniendo persistencia directa en RTF.
- Ajustada la presentacion del editor RTF en entradas: sin texto inicial, toolbar alineada a la derecha y unida visualmente al area de edicion.
- Retirado el titulo redundante de descripcion sobre el editor RTF de escenas.
- Endurecido el autoguardado de capitulos/escenas para enviar solo capitulos o escenas con cambios reales y normalizar descripciones RTF sin saltos vacios iniciales.
- Eliminado el refresco completo del libro tras guardar capitulos/escenas; ahora se aplica la respuesta del update sobre el estado local.
- Ajustada la deteccion de cambios de escenas para comparar el payload persistible y forzar sincronizacion del editor RTF al perder foco.
- Corregida la aplicacion local de respuestas de escena para actualizar el capitulo propietario por id sin pisar el capitulo activo al navegar.
- Adaptada la aplicacion de SceneWriteResponse para tratar PersonajesOrdenados como lista ligera de orden y preservar los personajes completos del libro.
- Adaptado el guardado de escenas al contrato nuevo: escrituras devuelven Scene y el orden ligero de personajes se refresca en segundo plano desde /libros/{id}/personajes/orden con loader en paneles dependientes.
- Ajustado el grid interno de entradas para reservar columnas de acciones solo cuando hay botones visibles.
- Compactado el panel de apodos de personaje y ocultado el formulario de nuevo apodo hasta pulsar la accion de alta.
- Recolocada la accion de borrar apodo dentro del chip y redistribuido el lateral de personaje para dar mas alto a relaciones que a apodos.
- Alineado el editor de relaciones de personaje con el patron de apodos: input nativo compacto y accion de quitar con icono de cierre.
- Ordenado el selector de personajes para relaciones siguiendo prioridad visual de capitulos por grupo/orden y nombre, sin cabeceras.
- Aplicado el mismo patron visual y de orden a relaciones de organizaciones: inputs compactos, cierre con X y personajes ordenados por grupo/orden.
- Ampliado el panel lateral de relaciones de organizaciones, corregida la resolucion de nombres de localizaciones vinculadas y ordenado alfabeticamente su selector.
- Corregida la precarga del personaje en modificacion de citas para aceptar variantes de id/nombre y pintar el autocomplete.
- Ajustado el listado de entidades narrativas para mantener el header visible mientras se scrollean chips y para pegar los grupos de libros previos al fondo cuando sobra altura.
- Extraido el textarea RTF de escenas a un editor comun y reutilizado en entradas para guardar y editar descripciones con el mismo formato enriquecible; ajustado el alto minimo comun y la sincronizacion al navegar entre capitulos de interludio.
- Mejorado el alta de apodos en nuevo personaje: accion en cabecera de seccion, minimo de 3 caracteres y bloqueo de guardado si queda un apodo pendiente invalido.
- Ajustados los anchos laterales del router de libro para que listas de personajes en escenas, relaciones/apodos de personaje y relaciones de organizacion no ocupen mas espacio del necesario.
- Alineadas las inserciones narrativas con la vista de capitulo en el gestor unificado: entradas como tarjetas tipo escena, selector de personajes de eventos con panel lateral y relaciones de organizaciones con panel de personajes/chips.
- Corregida la primera pasada de insercion: iconos de inputs alineados, boton de alta movido al header como accion solo icono y validacion minima de nombre/entrada antes de permitir guardar.
