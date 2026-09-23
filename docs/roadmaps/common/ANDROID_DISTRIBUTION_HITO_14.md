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
