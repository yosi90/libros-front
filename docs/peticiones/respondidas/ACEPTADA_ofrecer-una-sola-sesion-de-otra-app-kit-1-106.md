# Petición a las APK del ecosistema: «Continuar como…» con una sola sesión, sin esperar a todas las apps (kit 1.106)

Fecha: 2026-11-22
Solicitante: Plataforma Yosiftware (`C:\Users\Yosi\Desktop\administracion yosiftware`)
Destinatarios: Libros (front), Rol (3.5 Companion), Lorcana, Re-Notas, Rasgora, 1d1n, Día a día, MCC y Enroque
Afecta a: la pantalla de entrar de tu APK y la librería de la sesión (o el addon de Godot)

## Contexto

En un Honor, «Continuar como…» tardaba unos 22 s en salir. La librería de la sesión preguntaba a todas las apps del ecosistema del móvil y esperaba a la última, hasta 15 s cada una. Algunos móviles no arrancan una app que despierta otra, y la librería se quedaba esperando a la que no iba a contestar.

El propietario ha decidido (2026-11-22): **se pide la sesión a todas y se queda la primera que conteste. Solo una, y sin decir de qué app viene** («Pidamos sesión y la primera que responda con esa nos quedamos y ya. Solo una, sin anunciar quien provee la pasarela de inicio»).

Está en el **kit 1.106**: la librería de la sesión **1.11.0** y el addon de Godot **1.1.0**. La guía está en `ecosistema-kit/APK.md`, apartados «La sesión de otra app» y «La librería 1.11.0», y en `docs/publica/SESION_ENTRE_APPS.md`.

## Qué necesitamos

1. **Copia la librería 1.11.0** (`ecosistema-kit/android/sesion/`) donde tengas la tuya. Es compatible con la 1.10.0: solo añade. **Con Godot y el addon del kit** (Enroque): sustituye la carpeta `addons/yosiftware/` por la del kit (1.1.0), y ya está.
2. **Cambia `sesionesEnOtrasApps()` por `sesionDeOtraApp()`.** La nueva devuelve una sesión o `null`: la de la primera app que contesta, del mismo entorno y de una cuenta que no esté ya guardada en tu app. La antigua sigue compilando, pero está obsoleta.
3. **Enséñala como un solo botón** encima del formulario de entrar:
   - «Continuar como @`alias`»;
   - debajo, **«Con tu cuenta Yosiftware»**.
   
   **No digas de qué app viene:** quita «Con tu sesión de <app>». Al tocarlo, `continuarCon(otra)`, como hasta ahora.
4. **Rasgora**, con su propio plugin de Godot: lo mismo en `PluginSesion.kt` y en su pantalla. La señal puede seguir siendo una lista, con una o ninguna.

## Comprobaciones previas

Hecho por la plataforma (2026-11-22):
- **La librería:** sus 84 pruebas, en verde. Entre las nuevas:
  - la primera gana aunque otra app no conteste nunca, y las demás se cancelan;
  - si no hay ninguna, devuelve `null`;
  - una cuenta ya guardada no cuenta.
- **El addon de Godot 1.1.0, con la app de pruebas de QA:**

  | Móvil | Antes | Ahora (en frío / después) |
  | --- | --- | --- |
  | Honor plegable | unos 22 s | 1,3 s / unos 0,7 s |
  | Xiaomi | de 0,3 s a 9 s | 2,8 s / de 0,5 a 0,9 s |

  En los dos sale un solo botón, «Continuar como @Yosi · Con tu cuenta Yosiftware». En el Honor, al tocarlo se entra.
- **La app Yosiftware 0.4.3**, ya con este cambio y publicada en QA y en producción. En el Xiaomi, las 11 apps contestaron en 0,4 s.

## Calendario y dependencias

Sin calendario. Hasta que lo cambies, tu app sigue funcionando como antes: espera a todas y nombra la app.

## Fuera de alcance

- El protocolo entre apps y el contrato de la plataforma no cambian. Tu app sigue dando su sesión a las demás sin hacer nada.
- Lo que haga el sistema del móvil con las apps que no deja arrancar.

## Resolución

**Aceptada** (2026-11-25, `ea1893d3` del frontend).

- Librería de la sesión **1.11.0** en `android-nativa/yosiftware-sesion/`, copiada sin cambios del kit 1.107 (`e9f0a9d`; `diff -rq` sin diferencias).
- La pantalla de entrar usa `sesionDeOtraApp()` y enseña un solo botón, «Continuar como @alias», con «Con tu cuenta Yosiftware» debajo. Ya no dice de qué app viene. `sesionesEnOtrasApps()` ya no se usa.
- Las pruebas de la JVM y `assembleQaDebug`, en verde. Instalada la QA en el Honor y capturada la pantalla con la muestra de depuración.
- Sale con la próxima versión de la APK de producción.
