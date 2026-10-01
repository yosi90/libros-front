# Firma y distribución Android — Hito 14

> Estado: implementación finalizada el 30 de agosto de 2026. La primera publicación productiva permanece deliberadamente reservada para la aceptación del Hito 15.

## Identidad y custodia

- Package producción: `es.yosiftware.libros`.
- Alias release: `memoria-bibliografica`.
- Certificado autofirmado RSA de 4096 bits y validez suficiente para el ciclo de vida de la aplicación.
- SHA-1: `F2:3E:54:86:60:A7:E9:1A:90:E3:4B:83:21:A6:48:7F:E2:DF:D8:E8`.
- SHA-256: `9F:B3:C6:FA:07:EB:B0:60:AF:71:E0:D0:77:96:DC:B4:FA:E9:9B:64:62:6C:8C:AD:0F:5F:56:3E:03:96:E5:41`.
- GitHub Actions conserva keystore, alias y contraseñas como secrets; el propietario confirmó copias fuera del repositorio en dos discos distintos y la contraseña bajo su custodia.

El repositorio ignora `*.jks`, `*.keystore`, `google-services.json`, APK/AAB y assets nativos generados. Ningún valor secreto se versiona ni forma parte del artefacto.

## Firebase y App Links producción

- Firebase `yosiftware-libros` registra una aplicación Android independiente para `es.yosiftware.libros` con ambas huellas release.
- Su `google-services.json` vive únicamente en `android/app/src/production/` y en el secret `ANDROID_GOOGLE_SERVICES_PRODUCTION_BASE64`; QA conserva su source set y proyecto propios.
- Hosting producción publica `/.well-known/assetlinks.json` exclusivamente con package y SHA-256 release.
- El despliegue [`33298502887`](https://github.com/yosi90/libros-front/actions/runs/33298502887), sobre `4c0d9f6`, quedó verde; la comprobación alojada obtuvo HTTP 200 y JSON coherente.

## Pipeline reproducible

`.github/workflows/android-release-manual.yml` exige selección explícita de flavor, SemVer estable, `versionCode` positivo, firma completa y configuración Firebase del mismo entorno. Gradle rechaza releases sin firma y el sello nativo rechaza bundles cruzados. Solo producción puede habilitar la publicación.

El workflow:

1. restaura materiales sensibles únicamente en el runner efímero;
2. construye Angular y sincroniza Capacitor para el flavor solicitado;
3. genera una APK universal firmada;
4. verifica la firma con `apksigner`;
5. produce y valida SHA-256;
6. sube un artefacto privado de corta retención;
7. si el propietario lo solicita tras H15, crea `android-vX.Y.Z` con APK, checksum y notas.

La primera validación detectó dos defectos del workflow antes de producir artefactos: contexto `runner.temp` fuera de alcance y permiso de ejecución de `gradlew` en Ubuntu. Ambos quedaron corregidos y validados con `actionlint`.

## Evidencia firmada

- QA release [`33278620307`](https://github.com/yosi90/libros-front/actions/runs/33278620307): verde, sin publicación.
- Producción release [`33298507762`](https://github.com/yosi90/libros-front/actions/runs/33298507762): verde, sin publicación.
- Artefacto producción: `memoria-bibliografica-1.0.0.apk`, `versionCode 1`, 44.893.564 bytes.
- Firma: un firmante, APK Signature Scheme v2, huellas idénticas a Firebase y Hosting.
- Checksum del artefacto coincide con el `.sha256` generado.
- Inspección interna: API productiva presente, API QA ausente y cero archivos `google-services.json`, keystore o credenciales empaquetados.
- Publicación final [`33332228595`](https://github.com/yosi90/libros-front/actions/runs/33332228595): `android-v1.0.0`, 44.894.264 bytes, SHA-256 `42c311c6f924397b54733b8c0ae26b1ef8d73b47ecc297241db2f360177c4a7e`.

## Actualización no intrusiva

`AndroidReleaseUpdateService` solo actúa en el package productivo. Consulta una vez por arranque la última release pública, acepta únicamente tags `android-vX.Y.Z` estables con APK y checksum, compara SemVer y ofrece una acción `Descargar` que abre GitHub en el navegador del sistema. QA y web no consultan; los fallos de red se ignoran sin bloqueo ni reintento ciego; la app nunca descarga o instala en segundo plano.

H15 completó la regresión integral y el smoke físico. Con autorización explícita del propietario, la ejecución `33332228595` publicó `android-v1.0.0` con la APK universal firmada y su checksum; futuras versiones deberán incrementar SemVer y `versionCode`.

## Candidato privado 1.0.1 — 20/9/2026

Tras la campaña QA completa verde [`35474529953`](https://github.com/yosi90/libros-front/actions/runs/35474529953), la ejecución privada [`35475779651`](https://github.com/yosi90/libros-front/actions/runs/35475779651) generó `memoria-bibliografica-1.0.1.apk` sobre el mismo commit `294dd5a`, con `versionCode 2` y `publish_release=false`. El artefacto tiene 48.448.863 bytes y SHA-256 `4a687cc8e68a064502235744df3acc3f8280aafc3db6be54863314ae2377edbb`. `aapt` confirmó identidad y versión; `apksigner` confirmó v2 y la misma huella release `9fb3c6fa07ebb060af71e0d07796dcb4fae99b64626c8cad0f5f563e0396e541`. El bundle contiene `https://libros-api.yosiftware.es`, no contiene el host API QA y no empaqueta `google-services.json` ni keystore. El artefacto privado caduca el 3/10/2026.

En el Honor Magic V3, esa candidata inició sesión dos veces desde cero mediante Google Credential Manager y cargó Biblioteca; entre intentos se cerró únicamente su sesión actual. La ejecución [`35476451456`](https://github.com/yosi90/libros-front/actions/runs/35476451456) reconstruyó y publicó [`android-v1.0.1`](https://github.com/yosi90/libros-front/releases/tag/android-v1.0.1) desde el mismo commit. La APK pública tiene SHA-256 `563f14d0da83ae145ba0219fc7412dd0d2809c294bf1f41759dd2fc32449f362`, idéntico al `.sha256` adjunto, `versionCode 2` y la misma firma release; el tag apunta a `294dd5a`. Sus bytes difieren de la candidata privada, por lo que se instaló también el archivo público exacto encima de ella, conservando `firstInstallTime`, sesión y Biblioteca tras reiniciar la app.

## Producción 1.0.2 — 21/9/2026

La ejecución [`35654124688`](https://github.com/yosi90/libros-front/actions/runs/35654124688) publicó [`android-v1.0.2`](https://github.com/yosi90/libros-front/releases/tag/android-v1.0.2) desde `c074237`, con `versionCode 3`. La APK pública pesa 48.449.071 bytes y su SHA-256 `ad4a38c8666e114c306baffcf1c2cf3567174f6cddeed22cd76d158914fe756e` coincide con el checksum adjunto. Se instaló por ADB sobre `1.0.1` en el Honor Magic V3 conectado en el puerto indicado, conservando el `firstInstallTime` de la aplicación y arrancando `MainActivity` como actividad reanudada.

## Candidatas privadas 1.0.86-qa y 1.0.17 — 29/9/2026

Sobre el commit frontend `723d8e9`, [`36622474502`](https://github.com/yosi90/libros-front/actions/runs/36622474502) generó la APK QA `1.0.86-qa` (`versionCode 87`, SHA-256 `644d1ddee9a750a9c1aa4265bc7128d734611888796abc5027bebbb90f3bd40c`) y [`36622977904`](https://github.com/yosi90/libros-front/actions/runs/36622977904) la APK productiva privada `1.0.17` (`versionCode 18`, SHA-256 `a28419e6599eb0bf2d0c691dd9e696c641cd51d6b4cfbb879d5459c87f27fe5f`). Ambas ejecuciones pasaron con `publish_release=false`; los checksums descargados coincidieron y `apksigner` confirmó la huella release `9fb3c6fa07ebb060af71e0d07796dcb4fae99b64626c8cad0f5f563e0396e541`.

Se instalaron por ADB sobre sus paquetes existentes en el Honor Magic V3. QA conservó `firstInstallTime`, pero estaba sin sesión iniciada. Producción conservó `firstInstallTime` (20/9/2026), sesión y biblioteca tras reiniciar. En la app productiva se comprobaron físicamente la campana sin duplicado temporal, la vista previa de Yosiftware con solicitante/tipo/estado y los mensajes históricos ya resueltos con texto y color. No se generó una resolución nueva ni se añadió un libro durante esta comprobación, por lo que el toast de nueva resolución y el salto a una incorporación real mantienen la cobertura automatizada, sin validación física de extremo a extremo.

## Candidata privada de ediciones 1.0.87-qa — 1/10/2026

La ejecución privada [`36872100434`](https://github.com/yosi90/libros-front/actions/runs/36872100434) pasó con `publish_release=false` sobre `4643dbda57274a00b9c74f21ba31c0e4b96a1911`, en la rama aislada `codex/ediciones-isbn-qa-20261001`. No se modificó `main` ni se publicó Hosting o Release productiva. APK QA `1.0.87-qa`, `versionCode 88`, 54.945.558 bytes y SHA-256 `d12356c35b398f01617600f83b8b8342243419dd3b3c0b2bcaa6bc058cbd9733`; checksum y firma release `9fb3c6fa07ebb060af71e0d07796dcb4fae99b64626c8cad0f5f563e0396e541` verificados antes de instalar.

ADB actualizó el Honor Magic V3 conservando `firstInstallTime=2026-08-30 09:13:53` y la sesión Google. Se comprobaron fichas reales de libro y antología con una edición y sin overflow a 718×781 CSS; la aplicación quedó en Biblioteca. La sesión se había iniciado con datos móviles tras reproducir un bloqueo del SDK Firebase en Wi-Fi; ese diagnóstico sigue en `../qa/bugs.md`. Las escrituras y la matriz completa de ediciones esperan configuración privada y lease de campaña; esta lectura física no equivale a aceptación de producción.

## Producción 1.0.18 — 1/10/2026

Migración de ediciones aceptada en QA 1.0.88. Backend productivo cea65ae corregido y comprobado antes del corte. [Workflow 36929312446](https://github.com/yosi90/libros-front/actions/runs/36929312446) publica [android-v1.0.18](https://github.com/yosi90/libros-front/releases/tag/android-v1.0.18) desde 70960d9875ff44742b68913498b8077e8b03b01c, código 19. SHA-256 ff91275e464585058136c01fac25af4051f4203c14f3d70e2904c7ea00d6b1d9 coincide con el adjunto; certificado release habitual. Bundle sin API QA ni materiales privados. ADB actualiza sobre 1.0.17 sin borrar datos; firstInstallTime 20/9/2026 conservado. La nueva barrera sessionVersion exige acceso nuevo y se ha inspeccionado en el display activo del Honor plegado. Propietario accede; Biblioteca, ficha de Siega con edición poseída, retorno y sesión restaurada tras reinicio correctos en la APK pública.

## Ajuste productivo 1.0.19 — 1/10/2026

[Workflow 36930808886](https://github.com/yosi90/libros-front/actions/runs/36930808886) publica [android-v1.0.19](https://github.com/yosi90/libros-front/releases/tag/android-v1.0.19), código 20, desde 531a28933c3169b0bdc20c000d8492db955c249e. SHA-256 49b62e7c65ff39f5435a3172410355906412131995d9c5881ae2debe8fd34c96 y certificado release verificados antes de actualizar el Honor. Conserva la sesión iniciada en 1.0.18; árbol accesible confirma Biblioteca y ausencia de la acción para las obras con una sola poseída. Acción Ver ediciones solo con más de una poseída, coherente en las tres presentaciones. Ocho regresiones Playwright y captura Mobile acreditan los casos cero/una/dos; el dispositivo se bloqueó durante la captura final, que no se usa como evidencia visual de la card. Hosting 36930808578 correcto (640 Angular, 14 smoke/5 omisiones).
