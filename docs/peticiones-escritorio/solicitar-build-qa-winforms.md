# Petición WinForms - Build verificable para QA y paridad RTF

## Qué se necesita

Una compilación o selector explícito de `Memoria bibliográfica` que permita trabajar contra el dataset QA y nunca dependa de una conexión de producción implícita.

Antes de habilitar cualquier escritura debe mostrar y comprobar:

- entorno `qa`;
- versión de dataset no vacía;
- destino de API/base de datos reconocible;
- escena resuelta desde el alias `scene.rtf-2297`, sin fijar el ID actual.

La build debe impedir escrituras si la identidad no coincide y permitir abrir, guardar y reabrir escenas y entradas RTF.

## Por qué se necesita

La instalación ClickOnce disponible no expone API, connection string ni selector de entorno en sus archivos de configuración. Usarla para el round-trip podría escribir en producción.

## Criterios de aceptación

- Se demuestra el destino QA antes del primer guardado.
- Abrir y cerrar sin cambios no escribe.
- RTF web → WinForms → web conserva formato semántico, keywords y párrafos.
- Un guardado WinForms puede restaurarse mediante el reset QA.

## Estado

Pendiente de entrega por el proyecto de escritorio; bloquea únicamente el cierre manual del roadmap RTF.
