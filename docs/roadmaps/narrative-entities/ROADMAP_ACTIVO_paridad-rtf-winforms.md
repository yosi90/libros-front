# Paridad RTF con WinForms y keywords protegidas

## Objetivo

Tomar `RichTextBox` de Windows Forms como referencia semantica para leer, editar y volver a guardar las descripciones RTF de escenas y entradas, protegiendo las keywords narrativas y evitando perdidas durante el autoguardado.

## Checklist

- [x] **Hito 0 - Documentar la iniciativa y su verificacion.**
  - Descripcion: registrar el roadmap, los bugs conocidos y la checklist manual bidireccional.
  - Por que se necesita: el cambio afecta parser, editor, autoguardado y compatibilidad con otra aplicacion.
  - Que se espera lograr: mantener el trabajo trazable y verificable durante todos sus hitos.
  - Peligros si se mantiene como estaba: los arreglos parciales pueden volver a divergir sin una fuente de seguimiento.
  - Peligros del cambio: documentar alcance no implementado como si ya estuviera disponible.

- [x] **Hito 1 - Sustituir el parser y asegurar el autoguardado.**
  - Descripcion: implementar lectura/escritura RTF con estados por grupo, compatibilidad CP-1252/Unicode y lotes inmutables de guardado.
  - Por que se necesita: el parser actual convierte whitespace estructural en saltos visibles y el autoguardado puede dar por persistida una revision posterior.
  - Que se espera lograr: reproducir la escena 2297 como WinForms y no perder ediciones concurrentes.
  - Peligros si se mantiene como estaba: escenas incompatibles, saltos falsos y cambios que no llegan al backend.
  - Peligros del cambio: una serializacion incorrecta podria degradar RTF heredado al editarlo.

- [x] **Hito 2 - Proteger keywords y ampliar formato inline.**
  - Descripcion: convertir menciones enlazadas en tokens atomicos y anadir fuente, tamano, color y resaltado al editor.
  - Por que se necesita: los nombres propios no deben ser autocorregidos, modificados parcialmente ni recibir formato incompatible.
  - Que se espera lograr: keywords navegables y borrables solo como unidad, con color `#F5DEB3` y subrayado canonicos.
  - Peligros si se mantiene como estaba: el navegador puede alterar nombres y el usuario puede romper una keyword letra a letra.
  - Peligros del cambio: selecciones, pegado, borrado o deshacer pueden comportarse mal alrededor de nodos protegidos.

- [x] **Hito 3 - Incorporar formato de parrafo.**
  - Descripcion: leer, editar y escribir alineacion, sangrias, espaciado y altura de linea.
  - Por que se necesita: la paridad visual amplia requiere conservar propiedades de parrafo de RichTextBox.
  - Que se espera lograr: round-trip determinista mediante controles RTF expresados en twips.
  - Peligros si se mantiene como estaba: documentos de escritorio pierden estructura visual al editarse en web.
  - Peligros del cambio: valores extremos pueden romper el layout del editor si no se limitan.

- [ ] **Hito 4 - Endurecer, verificar y cerrar.**
  - Descripcion: ampliar fixtures, probar escenas y entradas, validar Firefox/Chrome y completar la comprobacion con WinForms.
  - Por que se necesita: la compatibilidad real no queda demostrada solo con tests unitarios del navegador.
  - Que se espera lograr: cerrar la iniciativa con evidencia automatica y manual bidireccional.
  - Peligros si se mantiene como estaba: controles RTF reales no cubiertos pueden introducir regresiones silenciosas.
  - Peligros del cambio: declarar paridad general cuando siguen existiendo destinos deliberadamente no soportados.

## Limites

- La equivalencia buscada es visual y semantica, no byte a byte.
- Un RTF no editado se conserva literalmente.
- Imagenes, objetos OLE, tablas, listas complejas y control de cambios quedan fuera salvo que aparezcan en fixtures reales.

## Verificacion actual

- `npm run build`: correcto.
- `npm run e2e`: shell de Angular correcto en Chromium y Firefox mediante Playwright (2/2).
- Selector de fuente ampliado con familias de Google Fonts de uso general y fantasia; WinForms requiere que la familia elegida este instalada localmente para evitar sustituciones.
- Las fuentes se muestran alfabeticamente en grupos de sistema y Google Fonts. La ultima eleccion se conserva por cuenta en el navegador, con preferencias LRU para los cuatro libros usados mas recientemente.
- El selector de fuente usa un panel Angular Material en lugar de opciones nativas para poder previsualizar tipografias web de forma consistente en Firefox y Chromium.
- Karma completo y dirigido: sin resumen concluyente; el proceso no devolvio el cierre antes del limite operativo de un minuto.
- Validacion interactiva Firefox/Chrome y round-trip manual con WinForms: pendiente en la checklist dedicada.
