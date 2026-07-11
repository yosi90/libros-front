# Editor RTF con enlaces a entidades narrativas

## Objetivo

Marcar en escenas y entradas las menciones capitalizadas que coincidan con entidades narrativas del libro cargado, mostrando el texto subrayado en naranja y permitiendo navegar a la modificacion de la entidad sin cambiar el RTF persistido.

## Checklist

- [x] Documentar y validar el modelo de menciones enlazables.
  - Descripcion: construir menciones desde personajes, apodos, localizaciones, organizaciones, conceptos, eventos y citas del libro abierto.
  - Por que se necesita: el editor debe reproducir la navegacion contextual de la app de escritorio.
  - Que se espera lograr: una lista estable de destinos por entidad, con alias de personaje apuntando al personaje propietario.
  - Peligros si se mantiene como estaba: las descripciones siguen siendo texto aislado y obligan a navegar manualmente.
  - Peligros del cambio: falsos positivos si el matching no respeta capitalizacion, limites de palabra y prioridades.

- [x] Integrar el enriquecido visual en el editor RTF compartido.
  - Descripcion: renderizar wrappers interactivos solo en pantalla y limpiar esos wrappers al guardar.
  - Por que se necesita: el contrato actual guarda RTF simple y no debe persistir enlaces calculados.
  - Que se espera lograr: lectura con click y edicion con Ctrl+click sin romper seleccion, formato ni pegado.
  - Peligros si se mantiene como estaba: no existe paridad con el editor enriquecido de escritorio.
  - Peligros del cambio: alterar el HTML editable puede mover el cursor o contaminar el RTF guardado.

- [x] Aplicar la funcionalidad en escenas y entradas.
  - Descripcion: pasar las menciones calculadas desde el libro abierto a los editores de capitulos y entidades narrativas.
  - Por que se necesita: son las superficies donde el usuario escribe texto narrativo.
  - Que se espera lograr: enlaces consistentes en alta, edicion y lectura de entradas y escenas.
  - Peligros si se mantiene como estaba: la mejora quedaria parcial y la experiencia seria inconsistente.
  - Peligros del cambio: rutas equivocadas o parametros `selected` que no abran la entidad correcta.

- [x] Cubrir matching y persistencia con tests.
  - Descripcion: probar casos de capitalizacion, alias, tildes, limites, solapes y limpieza de wrappers.
  - Por que se necesita: el comportamiento depende de reglas de texto sensibles a regresiones.
  - Que se espera lograr: confianza en que los enlaces no generan falsos positivos ni modifican el RTF.
  - Peligros si se mantiene como estaba: cambios futuros podrian romper silenciosamente el matching.
  - Peligros del cambio: tests demasiado acoplados a detalles de renderizado podrian dificultar mantenimiento.

## Verificacion

- `npm run build`: correcto.
- `npm test -- --watch=false --browsers=ChromeHeadless`: sin resultado concluyente; Karma no devolvio el prompt antes del limite operativo de 1 minuto.
- Verificacion manual readonly: correcta.
- Verificacion manual de Ctrl+click en edicion: correcta.
- Verificacion manual de formato, pegado y autoguardado: correcta.
