# Origen de esta carpeta

Es el doble oficial del SDK web de la plataforma Yosiftware (imita el SDK 1.32.0), copiado **sin cambios** de `ecosistema-kit/pruebas/` del kit 1.85, el 2026-11-06: los archivos versionados de la revisión `bf6c050` de la plataforma (`git show bf6c050:ecosistema-kit/pruebas/<archivo>`). Comprobado con `cmp` contra esa revisión: sin diferencias. Libros lo pidió (`administracion yosiftware/docs/peticiones/respondidas/ACEPTADA_un-doble-oficial-del-sdk-web-para-las-pruebas.md`) y sustituye a sus dos imitaciones propias (`src/app/services/auth/yosiftware-sdk.testing.ts` y `e2e/support/yosiftware-sdk-double.ts`, retiradas).

- `yosiftware-doble.js`: el guion (vale para `<script>`, para `require` y como módulo).
- `yosiftware-doble.mjs`: el mismo, como módulo ES.
- `yosiftware-doble.d.ts`: sus tipos.
- `yosiftware.d.ts`: el contrato del SDK al que apuntan esos tipos.

Está fuera de `src/` porque `tsconfig.app.json` incluye `src/**/*.d.ts`: `yosiftware.d.ts` declara `window.yosiftware` en global y no debe entrar en la compilación de la web. `ecosistema-kit/` está ignorado por Git, así que las pruebas no lo pueden importar de ahí (en GitHub Actions no existe).

Cómo lo cargan las pruebas:
- **Karma:** los `.spec.ts` importan `crearDobleYosiftware` de `pruebas/yosiftware-doble/yosiftware-doble.js` (TypeScript toma los tipos del `.d.ts` de al lado) y dan `doble.yosiftware` al servicio.
- **Playwright:** `e2e/support/yosiftware-doble.ts` sirve `yosiftware-doble.js` en lugar de `/sdk/v1/yosiftware.js`, con sus opciones en `window.__YOSIFTWARE_DOBLE__`; el control queda en `window.yosiftwareDoble`.

Su guía es `ecosistema-kit/PRUEBAS.md`. No imita los elementos del SDK (`<yosi-acceso>`, `<yosi-webs>`, la campana…): en las pruebas son etiquetas vacías.

No se edita aquí: si hace falta algo, se pide a la plataforma, y cuando suba la versión del SDK se copia entera la de su kit.
