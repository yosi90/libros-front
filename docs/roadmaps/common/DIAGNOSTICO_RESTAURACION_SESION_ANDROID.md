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

No basta con un timeout JavaScript que abandone la promesa sin cancelar la operación nativa; la rotación del refresh exige evitar solicitudes duplicadas. Tras el diagnóstico, el usuario solicita priorizar IPv4 y reservar IPv6 como alternativa, mostrando frases aleatorias del dragón al usarla.

## Corrección implementada

- `Ipv4HttpPlugin` sustituye el plugin Android `CapacitorHttp`, incluyendo llamadas explícitas de sesión/configuración y fetch/XHR parcheados. No cambia el transporte del navegador ni el SDK nativo de Firebase o WebSocket.
- OkHttp 5.3.2 usa DNS del sistema con IPv4 antes de IPv6; no se fijan IP ni se cambia el hostname HTTPS. Intentos secuenciales con timeout de conexión limitado a 3 segundos por dirección; mantiene IPv6 y DNS64 cuando no hay IPv4. Se reutilizan conexiones válidas.
- Conserva el `CookieHandler` instalado por Capacitor y entrega las cabeceras `Set-Cookie` sin normalizar sus atributos, incluyendo Secure, HttpOnly y SameSite. No lleva tokens a Web Storage ni añade logs de credenciales. Mantiene validación TLS del sistema y no sigue redirecciones de HTTPS a HTTP.
- Reutiliza el serializador Capacitor para JSON, formularios, binarios y multipart. Los cuerpos son `oneShot`: puede probar otras IP antes de enviar, pero no repite un refresh/guardado ya enviado si se pierde la respuesta.
- Cada petición notifica el inicio real de conexión IPv6 y su finalización/error. El frontend elige una frase al entrar en espera, conserva el texto mientras haya peticiones concurrentes y lo retira al terminar. Se presenta en el loader inicial/con dragón o en un toast cuando no hay loader. No depende de temporizadores que simulen un fallback.

### Verificación

- 471 pruebas Angular, typecheck E2E, build productivo y APK debug compilada.
- 13 pruebas JVM Android, incluidas 9 de transporte: orden DNS, IPv4 sin aviso, IPv4 fallida con éxito IPv6, ambas rutas fallidas, ausencia de reenvío ante 503/respuesta perdida, cookies HttpOnly, atributos originales y aislamiento entre hosts tras redirección. El workflow de release ejecuta estas pruebas antes de generar la APK firmada.
- Chromium/Firefox: dragón y frase visibles con evento nativo simulado, texto centrado sin overflow, retorno al mensaje normal al acabar el fallback y retirada del loader al completar la restauración. No se fuerza IPv6 en la red real del usuario.
- Sonda en el mismo Honor con el código del cliente nuevo extraído de la APK: DNS ordenado IPv4/IPv4/IPv6/IPv6, conexión limitada a 3.000 ms, primer CSRF sin credenciales HTTP 401 en **348 ms**, segundo en **94 ms**. Antes: **30.642 ms / 135 ms**. No equivale a una medición del refresh autenticado completo.
- Sonda adicional del plugin real en Android contra un servidor local de fixtures aislado: serialización correcta de JSON con cabecera en minúsculas, formulario URL-encoded, archivo binario y multipart con texto UTF-8/archivo. Sin utilizar cookies de la app ni modificar datos de producción.

### Publicación

- Código `2c6bff5865fffe8d86cd02c62e28cd36225b54fa`.
- Web productiva publicada en [35660612276](https://github.com/yosi90/libros-front/actions/runs/35660612276), con `qa:ci` verde. El host live sirve `main-DQSF54PL.js`, igual al artefacto comprobado.
- [Android 1.0.5](https://github.com/yosi90/libros-front/releases/tag/android-v1.0.5), `versionCode 6`, publicada en [35660612638](https://github.com/yosi90/libros-front/actions/runs/35660612638), incluidas pruebas JVM antes del empaquetado firmado.
- APK descargada, SHA-256 `48a344f0074d77e10f7b45c55cc2e66583845655b35178ce451f5f994d97dc44` verificado y firma de distribución `f23e…d8e8` comprobada. Instalada con `adb install -r` en el Honor del puerto 41507: Android confirma versión 1.0.5/código 6. Sin borrado de datos ni cierre explícito de sesión.
- No se lanzó la actividad productiva porque el móvil estaba en una llamada. La apertura autenticada completa tras actualizar queda para la comprobación del usuario; las sondas anteriores no se presentan como medición del login completo.

## Hallazgo posterior en 1.0.5

La aceptación física confirmó que la sesión y el primer fallback resolvían en menos de tres segundos. A continuación, `AppComponent.restoreLibrary` activaba otro loader genérico y esperaba conjuntamente `/coleccion/universos` y `/catalogo/autores`; siguió visible más de tres minutos. Se reprodujo tras reiniciar sin borrar datos: a los 54 segundos continuaba el loader y había dos conexiones IPv4 establecidas contra la API. La salida posterior consta como `REMOVE TASK`, no como crash o ANR.

Para 1.0.6 se deja de bloquear la entrada por el catálogo auxiliar: primero se obtiene la biblioteca y se presenta; autores se carga después en segundo plano. Cada petición del transporte nativo recibe además un timeout total de 25 s (con 30 s como defensa RxJS para la biblioteca) y trazas productivas sanitizadas que contienen solo método, ruta, fase, estado, tamaño y duración, nunca query, cabeceras, cuerpos ni credenciales. El loader de esta fase usa un mensaje estable y conserva el mismo recurso de dragón para evitar el vacío observado al sustituir el GIF.

La ejecución anterior terminó además llamando a `logout` desde el manejador genérico de error de biblioteca. Eso eliminó la sesión válida y explica la portada pública observada tras desbloquear. Se retira esa política: solo el interceptor de autenticación puede cerrar una sesión ante códigos terminales contractuales; cualquier fallo de carga conserva la sesión y ofrece `Reintentar`.

## Otros hallazgos

- `AppComponent.restoreLibrary` descarga universos y autores bajo un `forkJoin`, bloqueando su entrega hasta que ambos terminen.
- En login explícito, `applyAuthenticatedSession` dispara la carga de `AppComponent` y `LoginComponent.loadLibrary` vuelve a pedir universos y autores; falta coordinar ambas cargas.
- Son oportunidades de mejora posteriores, distintas de la espera del primer loader.

## Ajuste visual solicitado

Se añade el dragón existente a la superficie de restauración inicial. Se reutilizan su imagen y estilos. Build de producción y comprobación visual Chromium/Firefox: imagen cargada mientras CSRF está pendiente y loader retirado cuando la restauración termina.
