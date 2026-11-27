# Versiones de la web y de la APK de Libros

Versionado semántico (`ecosistema-kit/VERSIONADO.md`): una nota por versión publicada en producción, con lo que cambia para quien usa Libros. La web lleva su versión en `package.json` y la APK, en `android-nativa/app/build.gradle.kts` (`versionCode = MAYOR × 10000 + MENOR × 100 + ARREGLO`); las dos la enseñan al pie de Preferencias. Cada versión de producción lleva su etiqueta: `web-v<versión>` o `app-v<versión>`.

## APK

### 2.1.0 (2026-11-27)

La vista de libro «Cuaderno»: el capítulo como una página continua que se edita en el sitio, los elementos con su ficha al lado, y la ficha y las notas que se guardan solas, también sin conexión.
