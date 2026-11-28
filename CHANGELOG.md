# Versiones de la web y de la APK de Libros

Versionado semántico (`ecosistema-kit/VERSIONADO.md`): una nota por versión publicada en producción, con lo que cambia para quien usa Libros. La web lleva su versión en `package.json` y la APK, en `android-nativa/app/build.gradle.kts` (`versionCode = MAYOR × 10000 + MENOR × 100 + ARREGLO`); las dos la enseñan al pie de Preferencias. Cada versión de producción lleva su etiqueta: `web-v<versión>` o `app-v<versión>`.

## Web

### 1.5.0 (2026-11-28)

Una petición de catálogo devuelta ya se puede corregir antes de reenviarla: «Corregir y reenviar» abre su formulario con lo que enviaste.

### 1.4.1 (2026-11-28)

La descripción de un club vuelve a verse con su letra y sus saltos de línea.

### 1.4.0 (2026-11-28)

Menos títulos y explicaciones en Comunidad, los clubes, Estadísticas y Preferencias.

### 1.3.0 (2026-11-28)

En el Catálogo, «Añadir» guarda el libro con un clic como «Quiero leer» (la flecha de al lado deja elegir otro estado), y los filtros puestos se ven siempre.

### 1.2.0 (2026-11-28)

La Biblioteca, más limpia: lo que estás leyendo en una fila de portadas, cada universo como un título, y las fichas de libro como enlaces que se pueden abrir en otra pestaña.

### 1.1.0 (2026-11-28)

En el móvil, la navegación va abajo: Biblioteca, Catálogo, Comunidad (con los mensajes sin leer) y «Más», que abre el resto desde abajo.

### 1.0.0 (2026-11-27)

La primera con número: la versión se ve al pie de Preferencias.

## APK

### 2.3.0 (2026-11-28)

Una petición de catálogo devuelta ya se puede corregir antes de reenviarla, desde Mis peticiones. Además, «Continuar como…» comprueba la cuenta que ofrece otra app antes de enseñarla.

### 2.2.0 (2026-11-28)

Menos texto y sin repeticiones: la navegación, los menús y los botones dicen cada cosa una vez, con su icono o con su palabra, y sin las explicaciones de cada pantalla. Además, «Continuar como…» comprueba la cuenta que ofrece otra app antes de enseñarla.

### 2.1.0 (2026-11-27)

La vista de libro «Cuaderno»: el capítulo como una página continua que se edita en el sitio, los elementos con su ficha al lado, y la ficha y las notas que se guardan solas, también sin conexión.
