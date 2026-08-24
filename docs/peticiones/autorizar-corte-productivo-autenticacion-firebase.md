# Visto bueno frontend para el corte productivo de autenticación Firebase

## Decisión

El propietario autoriza el corte productivo coordinado de la autenticación Firebase y de las preferencias de interfaz multidispositivo validadas durante el Hito 13.

La autorización corresponde a la migración completa acordada, sin ventana dual con la autenticación legacy. SQL y el JWT de Libros continúan siendo la autoridad de cuenta, roles, permisos y acceso a la API; Firebase aporta las identidades de contraseña, Google y teléfono y la sesión canónica `libros:<id_usuario>` para los servicios Firebase.

## Evidencia aceptada por frontend

- Release backend validada en QA: `16090b4ce05eda9307da29679bdfc9cb6e1616ee`.
- Dataset QA validado: `2026.08.4`.
- Campaña frontend completa: GitHub Actions `32746025039`, verde en gate, build, artefacto PWA, Chromium, Firefox, Hosting QA, autenticación, teléfono ficticio, cleanup, escaneo de secretos y restauración a `baseline`.
- Google OAuth real: completado manualmente con la cuenta QA dedicada, sin almacenar contraseña ni 2FA.
- Handler OAuth alojado: comprobado con un navegador controlado por `ngsw-worker.js`; `/__/auth/handler` devuelve el handler de Firebase y no la SPA.
- Frontend productivo preparado: commit `5dbbeeac4adf2ee035597974ea3ce512db8cf883`, desplegado correctamente por GitHub Actions `32748571313`.
- El propietario confirmó el visto bueno explícito después de revisar la campaña y el recorrido manual.

## Estado productivo observado antes del corte

La lectura pública de `https://libros-api.yosiftware.es/runtime-config` realizada el 24 de agosto de 2026 todavía devolvía:

- `Environment: "local"`;
- campos públicos Firebase vacíos salvo `DatabaseURL`;
- `RealtimeWsUrl: "wss://libros-ws.yosiftware.es"`.

Esto confirma que el frontend está preparado, pero el backend/configuración productiva todavía no había ejecutado el corte en el momento de emitir este documento.

## Acciones solicitadas al backend

1. Ejecutar el corte productivo coordinado y sin ventana dual conforme al handoff aceptado.
2. Publicar `Environment: "production"` —o el identificador productivo canónico ya acordado— y la configuración web pública Firebase completa en `/runtime-config`, sin exponer credenciales administrativas.
3. Configurar en producción dominios autorizados, `AuthDomain`, Google OAuth y su redirect `/__/auth/handler` para el dominio público definitivo.
4. Mantener cookies refresh opacas, CSRF same-site, CORS cerrado y separación estricta entre los proyectos Firebase de QA y producción.
5. Activar contraseña y Google como métodos productivos del corte.
6. Activar teléfono únicamente si proveedor, cuota y prueba productiva acotada están aprobados; no reutilizar el número ficticio ni secrets de QA.
7. Publicar las preferencias multidispositivo con su contrato de versión, conflicto y realtime ya aceptado.
8. Ejecutar las migraciones/provisiones productivas necesarias y confirmar que no se aceptan tokens, UIDs ni configuración del proyecto `libros-qa`.
9. Mantener disponible un rollback coordinado y no restaurar parcialmente el flujo legacy si el corte falla.

## Respuesta esperada

Cuando termine, actualizar la documentación entregada al frontend indicando:

- release/commit productivo desplegado;
- fecha y resultado del corte;
- valores no secretos efectivos de `/runtime-config`;
- proveedores habilitados, aclarando el estado de teléfono;
- dominios y redirect productivos verificados;
- resultado sanitizado de password, Google, refresh/CSRF, custom token canónico, revocación y preferencias;
- cualquier limitación o paso manual pendiente.

Tras recibir esa respuesta, frontend realizará un smoke productivo no destructivo y confirmará el cierre operativo. Esta autorización no permite ejecutar fixtures, resets ni identidades QA contra producción.
