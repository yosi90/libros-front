# Diagnóstico de demora al restaurar sesión Android

Fecha: 21/9/2026. APK observada: producción 1.0.3. Investigación sin cerrar sesión, extraer credenciales ni cambiar la red del dispositivo.

## Síntoma y ruta crítica

El usuario confirma que la espera ocurre en «Recuperando tu biblioteca…». Esa superficie depende de `!sessionReady` en `src/app/app.component.html`; desaparece cuando `SessionService.sessionInitializedSubject` emite `true`.

La secuencia es configuración pública → `GET /auth/session/csrf` → `POST /auth/session/refresh`. Android reutiliza la configuración pública cacheada y revalida en segundo plano; sin caché espera la configuración antes de empezar la sesión. CSRF y refresh usan `NativeSessionTransportAdapter`, con 15.000 ms de conexión y 30.000 ms de lectura. Capacitor implementa ese transporte con `HttpURLConnection` de Android.

Los datos de biblioteca/autores y la sesión Firebase de realtime se cargan después de obtener la sesión. No explican el primer loader señalado por el usuario.

## Evidencia física

Mediciones desde el Honor conectado, manteniendo su Wi-Fi y DNS existentes:

| Prueba | Resultado |
| --- | --- |
| curl IPv4 a `/runtime-config` | HTTP 200, 206,9 ms totales |
| curl IPv6 al mismo endpoint | Sin conexión; timeout a los 18.002,9 ms |
| curl con selección automática a `/runtime-config` | HTTP 200, 831,6 ms en la primera muestra |
| curl automático a `/auth/session/csrf` sin cookie | HTTP 401 esperado, 437,0 ms |
| Java Android `HttpURLConnection`, primera petición CSRF sin cookie | Conexión: 30.368 ms; total: 30.642 ms, HTTP 401 esperado |
| Misma sonda Java, segunda petición reutilizando conexión | Conexión: 0 ms; total: 135 ms, HTTP 401 esperado |

La sonda Java usa el mismo tipo de conexión, método, Content-Type y timeouts de la APK. Ejecuta solo dos GET sin credenciales desde `app_process`; no está dentro del proceso productivo ni mide un refresh autenticado. La resolución DNS tarda 9 ms y entrega dos IPv6 antes de dos IPv4. La primera conexión tarda aproximadamente dos veces el timeout de conexión de 15 s. Junto al fallo explícito de IPv6 y el éxito inmediato de IPv4, esto identifica el intento secuencial de direcciones IPv6 inaccesibles como causa reproducida de la espera de conexión.

Desde el PC, `/runtime-config` respondió en 165–180 ms. Esa comprobación solo acredita el endpoint público y no sustituye la medición del dispositivo.

## Conclusión y límites

Se ha reproducido una penalización de unos 30 s antes de llegar a la API, aun sin ejecutar autenticación. Si se necesita otra conexión nueva durante la restauración, la penalización puede repetirse; esto es compatible con el minuto descrito. No se ha capturado una restauración autenticada completa de 60 s y no se atribuye todo su tiempo a una llamada backend concreta.

Queda por localizar la causa de la ruta IPv6 que falla (móvil, router, operador o destino). El dispositivo usa DNS privado, pero las mediciones no demuestran que sea el causante: DNS resuelve y la demora ocurre al conectar. No se ha cambiado DNS, IPv6, router ni ajustes del teléfono.

La corrección recomendada es un transporte nativo con fallback rápido entre IPv6 e IPv4, conservando TLS, hostname y cookies de sesión. No basta con un timeout JavaScript que abandone la promesa sin cancelar la operación nativa; la rotación del refresh exige evitar solicitudes duplicadas. La investigación no modifica todavía ese transporte.

## Otros hallazgos

- `AppComponent.restoreLibrary` descarga universos y autores bajo un `forkJoin`, bloqueando su entrega hasta que ambos terminen.
- En login explícito, `applyAuthenticatedSession` dispara la carga de `AppComponent` y `LoginComponent.loadLibrary` vuelve a pedir universos y autores; falta coordinar ambas cargas.
- Son oportunidades de mejora posteriores, distintas de la espera del primer loader.

## Ajuste visual solicitado

Se añade el dragón existente a la superficie de restauración inicial. Se reutilizan su imagen y estilos. Build de producción y comprobación visual Chromium/Firefox: imagen cargada mientras CSRF está pendiente y loader retirado cuando la restauración termina.
