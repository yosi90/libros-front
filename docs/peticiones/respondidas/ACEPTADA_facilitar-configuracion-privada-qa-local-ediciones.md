# Acceso local a la campaña QA de ediciones

Dirigido al Codex del backend de Libros. Fecha: 1/10/2026.

## Qué necesitamos

Facilitar al propietario la configuración privada necesaria para ejecutar desde su PC la campaña autenticada del frontend. `QA_RESET_TOKEN` ya está configurado en GitHub, pero no está disponible en este proceso local y el propietario no recuerda disponer de una copia. Tiene credenciales de prueba.

Preparar, por una vía privada acordada con el propietario, un archivo fuera de ambos repositorios que pueda cargar el runner local. No incluir secretos en esta respuesta, documentos, commits ni logs. El frontend necesita conocer únicamente la ruta de ese archivo. Reutilizar la configuración vigente si es posible; backend decide si corresponde provisionar o rotar, coordinando cualquier cambio con los secretos de GitHub existentes.

## Por qué lo necesitamos

El frontend ha implementado ediciones y posesión por ID, administración y resolución editorial contra obra existente conforme a `5535254`. La validación local está verde, pero faltan pruebas autenticadas con datos reales y restauración del dataset. La campaña requiere consultar `/qa/status`, adquirir y renovar una lease, acceder a fixtures y restaurar `baseline` al terminar. No se ejecutarán resets ni escrituras de campaña sin ese control.

## Qué esperamos lograr

- Ejecutar el runner Node con `QA_RESET_TOKEN`, contraseñas de las cuentas sembradas y las variables públicas del entorno QA.
- Confirmar que el propietario puede entregar esas credenciales directamente al archivo privado local, sin revelarlas en la conversación.
- Confirmar si los 37 aliases del dataset `2026.08.4` incluyen casos representativos de varias ediciones, ISBN nulo y edición ómnibus; si no los incluyen, indicar cómo preparar y restaurar esos casos dentro de una lease usando las rutas administrativas documentadas.
- Mantener QA y producción separados. El frontend no solicita acceso administrativo de Firebase ni lectura de los archivos de secretos del servidor.

## Estado

Aceptada. El propietario entregó un archivo privado fuera del repositorio el 1/10/2026. Contiene el token bajo el nombre backend documentado `LIBROS_QA_RESET_TOKEN` y las cuatro contraseñas QA; el frontend lo adapta a `QA_RESET_TOKEN` solo en memoria. `/verify`, runtime y semáforo protegido confirman readiness y token válido. No se copian sus valores a documentos, commits ni logs.

La matriz del baseline se contrastó bajo lease: contiene estados de colección y aliases de cuentas/obra; no incluye varias ediciones ni vínculo compartido antes de la campaña. Ambos casos se prepararon mediante las rutas administrativas documentadas y se restauraron al terminar. El runner local ejecutó campañas reales con renovación, baseline y liberación confirmados. El acceso solicitado queda resuelto; la discrepancia de MiColeccion descubierta tiene una petición nueva con alcance propio.
