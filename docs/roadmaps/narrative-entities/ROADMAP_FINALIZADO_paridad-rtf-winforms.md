# Paridad RTF con WinForms y keywords protegidas

## Objetivo

Mantener la web como referencia funcional del editor y usar `RichEdit` de Windows, a traves de `System.Windows.Forms.RichTextBox`, exclusivamente como oraculo de compatibilidad para leer y volver a guardar las descripciones RTF de escenas y entradas sin deformacion ni perdida.

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

- [x] **Hito 4 - Endurecer, verificar y cerrar.**
  - Descripcion: crear un harness Windows independiente, ampliar fixtures, probar el corpus RTF local de escenas y entradas y validar Firefox/Chrome contra el modelo interpretado por RichEdit.
  - Por que se necesita: la compatibilidad real no queda demostrada solo con tests unitarios del navegador.
  - Que se espera lograr: cerrar la iniciativa con evidencia automatica y manual bidireccional.
  - Peligros si se mantiene como estaba: controles RTF reales no cubiertos pueden introducir regresiones silenciosas.
  - Peligros del cambio: declarar paridad general cuando siguen existiendo destinos deliberadamente no soportados.
  - Referencia real: usar en memoria el corpus de solo lectura de `YOSI-PC/libros`, incluida la escena 2297, sin conectar ni modificar la aplicacion WinForms.
  - Barrera de seguridad: el lector local solo puede ejecutar `SELECT` fijos contra `YOSI-PC/libros`; el harness no conoce SQL ni proyectos externos.

## Limites

- La equivalencia buscada es visual y editable segun RichEdit, no byte a byte.
- Un RTF no editado se conserva literalmente.
- Imagenes, objetos OLE, tablas, listas complejas y control de cambios quedan fuera salvo que aparezcan en fixtures reales.
- La web conserva su toolbar y su tratamiento atomico de keywords; no se degrada para reproducir las limitaciones de la aplicacion de escritorio.

## Verificacion final

- `npm run build`: correcto, con cuatro avisos conocidos de selectores Bootstrap.
- `npm run e2e`: 26 comprobaciones correctas en Chromium, Firefox y smoke compacto; 2 snapshots Firefox omitidos por diseño porque el baseline visual es Chromium.
- Selector de fuente ampliado con familias de Google Fonts de uso general y fantasia; WinForms requiere que la familia elegida este instalada localmente para evitar sustituciones.
- Las fuentes se muestran alfabeticamente en grupos de sistema y Google Fonts. La ultima eleccion se conserva por cuenta en el navegador, con preferencias LRU para los cuatro libros usados mas recientemente.
- El selector de fuente usa un panel Angular Material en lugar de opciones nativas para poder previsualizar tipografias web de forma consistente en Firefox y Chromium.
- Karma completo: 208/208 pruebas correctas con cobertura y cierre limpio; una repeticion caliente completa en esta maquina tarda aproximadamente 13 segundos.
- Harness `net10.0-windows` compilado sin avisos y fixtures sinteticos bidireccionales correctos en Chromium y Firefox.
- Corpus local: 952 escenas y 365 entradas, 1.317/1.317 equivalentes en cada navegador mediante RichEdit; la escena 2297 conserva tres parrafos y no presenta salto inicial.
- El corpus revelo 16 documentos con parrafos vacios legitimos en un borde. `rtf-text.ts` los conserva ahora mediante un atributo interno `data-rtf-*`, sin cambiar el recorte de bloques vacios creados por el editor.
- El informe solo contiene totales, ids opacos, hashes, resumenes y categorias/posiciones de diferencias. Los RTF se procesan en memoria y permanecen fuera de Git y artefactos.
- La build WinForms conectada a QA no forma parte de esta iniciativa. El oraculo es el proyecto aislado `qa/winforms-rtf-harness`, que usa el control estandar de Windows y no referencia codigo de escritorio.
