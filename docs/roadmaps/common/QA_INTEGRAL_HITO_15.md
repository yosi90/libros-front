# Cierre QA integral del Hito 15

> Estado: finalizado el 30 de agosto de 2026. Puerta técnica, smoke físico y primera GitHub Release productiva completados.

## Candidato aceptado

- Commit funcional: `cb4d8e65c1d3e6f6260f53263e1a5b1bbf35a819`.
- Campaña Hosting QA: [`33330830652`](https://github.com/yosi90/libros-front/actions/runs/33330830652), verde.
- APK QA física: `1.0.9-qa`, `versionCode 10`, ejecución [`33330174680`](https://github.com/yosi90/libros-front/actions/runs/33330174680).
- Release productiva: [`android-v1.0.0`](https://github.com/yosi90/libros-front/releases/tag/android-v1.0.0), `versionCode 1`, publicada por la ejecución [`33332228595`](https://github.com/yosi90/libros-front/actions/runs/33332228595).
- SHA-256 de la APK publicada: `42c311c6f924397b54733b8c0ae26b1ef8d73b47ecc297241db2f360177c4a7e`.

## Campaña alojada

La campaña final ejecutó instalación limpia, auditoría npm, lint OpenAPI, controles QA, builds producción/QA, 305 unitarias con cobertura, typecheck E2E, Chromium/Firefox/WebKit, matrices responsive y visuales, artefacto PWA, despliegue Hosting QA, App Links, sesiones y proveedores Firebase, superficies de producto, accesibilidad automatizada, cleanup, restauración a baseline y escaneo de secretos. La evidencia sanitizada se conserva en el artefacto `qa-hosting-manual-evidence` de la ejecución.

La integración alojada terminó `36/36`: restauró los cinco perfiles de backend, verificó teléfono ficticio sin SMS real y recorrió las superficies compact, medium, desktop y ultrawide en Chromium y Firefox. La nocturna programada [`33303849462`](https://github.com/yosi90/libros-front/actions/runs/33303849462) y los despliegues de `main` permanecen verdes.

## Honor Magic V3

El propietario actualizó sucesivamente la APK QA conservando datos y completó el smoke en su Honor Magic V3 físico, abierto y plegado cuando correspondía:

- arranque sin pantalla negra y loader inicial ya imperceptible cuando no existe sesión;
- acceso telefónico autorizado;
- acceso Google nativo con elección/reutilización de la cuenta del dispositivo;
- onboarding Google con alias y país;
- llegada correcta a biblioteca;
- cierre forzado y reapertura con restauración directa de la sesión y la biblioteca;
- push, preferencias, Firebase canónico/realtime y App Links ya acreditados en los recorridos físicos anteriores del mismo roadmap;
- instalación de versiones superiores sobre la existente sin perder datos válidos.

No se adopta emulador como requisito paralelo: desde el Hito 5 se acordó que la matriz determinista de navegador/build y el Android físico real aportan la señal principal, evitando duplicar una plataforma que el propietario no utiliza.

## Resultado

No quedan defectos críticos o altos conocidos ni checks técnicos pendientes del Hito 15. Tras la autorización explícita del propietario se publicó `android-v1.0.0` con APK universal firmada, checksum y notas; la release pública fue verificada y el roadmap queda cerrado.
