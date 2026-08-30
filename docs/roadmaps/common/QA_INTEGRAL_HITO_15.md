# Cierre QA integral del Hito 15

> Estado: puerta técnica y smoke físico completados el 30 de agosto de 2026. La primera GitHub Release productiva continúa pendiente únicamente de autorización explícita del propietario.

## Candidato aceptado

- Commit funcional: `cb4d8e65c1d3e6f6260f53263e1a5b1bbf35a819`.
- Campaña Hosting QA: [`33330830652`](https://github.com/yosi90/libros-front/actions/runs/33330830652), verde.
- APK QA física: `1.0.9-qa`, `versionCode 10`, ejecución [`33330174680`](https://github.com/yosi90/libros-front/actions/runs/33330174680).
- APK productiva candidata: `1.0.0`, `versionCode 1`, ejecución [`33330832030`](https://github.com/yosi90/libros-front/actions/runs/33330832030), construida y firmada sin publicar.
- SHA-256 del candidato productivo: `5e18effb9d444afba36ac64c703bab2386a94319ee4f0a7fefe41aca0cf095af`.

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

No quedan defectos críticos o altos conocidos ni checks técnicos pendientes del Hito 15. La puerta que impedía publicar la primera APK productiva queda levantada. Publicar una GitHub Release sigue siendo una mutación externa y no se ejecutará hasta recibir autorización explícita del propietario.
