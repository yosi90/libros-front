# Respuesta backend - Coordinar Firebase Hosting QA entre frontend y backend

> Estado vigente: aceptada y cerrada. Backend creó y acordó cuenta, proveedor WIF, sitio, canal, CORS y origen. La comprobación WIF de lectura desde `main` es una verificación operativa del frontend, no una respuesta pendiente del backend.

## Contexto histórico de la petición

El frontend está preparando su campaña QA y un workflow para publicar una compilación Angular QA. El proyecto Firebase `libros-qa` ya contiene recursos operados por backend: Firebase Authentication mediante custom tokens, Firestore, Realtime Database, FCM, VAPID y una cuenta de servicio administrativa conservada fuera de Git.

Antes de publicar contenido en Firebase Hosting o crear otra identidad, necesitamos acordar la frontera de responsabilidades. No queremos reutilizar la cuenta administrativa del backend, modificar sus recursos ni asumir que el sitio Hosting por defecto está libre para el frontend.

## Estado histórico antes de la respuesta

- Al abrirse la petición todavía no existía una identidad CI dedicada al frontend.
- No se había generado, descargado ni copiado ninguna clave JSON de Firebase o Google Cloud.
- No se había desplegado contenido, reglas, Functions ni configuración al proyecto `libros-qa` desde el frontend.
- La CLI local solo se había usado en modo lectura para confirmar el proyecto y su sitio Hosting.
- `https://libros-qa.web.app` era entonces una propuesta pendiente de acuerdo; esta situación quedó resuelta por backend en el commit `b6e9d4a`.

## Cambios preparados por el frontend

| Área | Cambio preparado | Relación con Firebase/backend |
|---|---|---|
| Configuración QA | `environment.qa` apunta a `https://qa-api.yosiftware.es`. | No modifica Firebase; únicamente selecciona la API QA. |
| Runtime config | Angular carga `GET /runtime-config` y normaliza entorno, versión de dataset, WebSocket y configuración web pública de Firebase. | Consume datos públicos entregados por backend; no usa credenciales administrativas. |
| Firebase cliente | La sesión Firebase, realtime y push se inicializan con la configuración web pública y se degradan de forma segura si no está disponible. | Usa custom tokens emitidos por la API y respeta las reglas propiedad del backend. |
| Playwright | Reset y fixtures se ejecutan solo desde Node, con guards positivos de entorno, proyecto, WebSocket y versión. | No despliega recursos Firebase ni envía el reset token al navegador. |
| Secretos funcionales | El Environment `qa` del frontend ya contiene el reset token y las cuatro contraseñas QA compartidas mediante transferencia directa y segura. | Solo se usan en la campaña Playwright; no son configuración Firebase. |
| Hosting CI | El PR frontend #1 contiene un workflow manual que verifica WIF, pasa el gate, compila con `build:qa` y puede desplegar solo Hosting al proyecto `libros-qa`. | La comprobación de lectura se ejecuta incluso con el despliegue deshabilitado; la campaña completa permanece bloqueada por `QA_HOSTING_DEPLOY_ENABLED=false`. |

## Recursos que el frontend no modificará

- El proyecto Firebase, la aplicación web registrada y su configuración pública.
- Firebase Authentication, sus proveedores, custom tokens o dominios autorizados sin acuerdo explícito.
- Reglas o datos de Firestore y Realtime Database.
- FCM, credenciales VAPID, tokens de dispositivos o mensajería administrativa.
- Functions, Cloud Run, extensiones o APIs gestionadas por backend.
- La cuenta de servicio administrativa que usa la API, el worker o el host QA.
- Cualquier recurso del proyecto de producción `yosiftware-libros`.

El frontend solo pretende publicar archivos estáticos Angular en el recurso Hosting que se acuerde. Los despliegues seguirán indicando `--project libros-qa` o `projectId: libros-qa` explícitamente.

## Decisión solicitada originalmente

Los puntos siguientes describen la consulta histórica. Todos quedaron acordados por backend; se conservan para explicar el origen de la configuración y la frontera de permisos.

### 1. Uso de Hosting

Confirmar cuál de estas opciones es compatible con la operación ya desplegada:

1. Usar el canal `live` del sitio por defecto `libros-qa`, con origen estable propuesto `https://libros-qa.web.app`.
2. Crear o reservar otro sitio Hosting dentro de `libros-qa` dedicado al frontend, indicando su `siteId` y URL estable.
3. Usar otro esquema que backend considere más seguro y que mantenga un origen estable para CORS.

No recomendamos un preview temporal que pueda caducar y cambiar de URL, porque backend exige CORS exacto y las pruebas deben consumir siempre el mismo origen.

### 2. Cuenta de servicio existente

Confirmar, sin entregar ni mostrar claves:

- el nombre o email de las cuentas de servicio relevantes existentes;
- la finalidad de cada una;
- si alguna fue creada específicamente para desplegar Hosting desde `yosi90/libros-front`;
- los nombres de sus roles, sin copiar secretos ni documentos JSON.

La cuenta administrativa usada por API, workers, custom tokens, Firestore, RTDB o FCM no debe reutilizarse para GitHub Actions del frontend.

### 3. Identidad CI de Hosting

Si ya existe una identidad dedicada exclusivamente al Hosting frontend, confirmar que puede reutilizarse y cómo debe rotarse su clave de forma segura.

Si no existe, confirmar que podemos crear una cuenta distinta, propuesta como `github-libros-front-hosting`, limitada al proyecto `libros-qa` y con los permisos mínimos necesarios para publicar Hosting mediante Firebase CLI. No se le concederán permisos sobre Firestore, RTDB, FCM, Firebase Admin, producción, Cloud Run ni Functions salvo que backend documente una necesidad concreta.

La opción acordada es Workload Identity Federation mediante `QA_WIF_PROVIDER` y `QA_HOSTING_SERVICE_ACCOUNT`. No se creará `FIREBASE_SERVICE_ACCOUNT_LIBROS_QA`, no se generará una clave JSON y no se reutilizará la cuenta administrativa del backend.

### 4. CORS y Firebase Authentication

Una vez elegido el Hosting definitivo, backend debe:

- añadir literalmente su origen a `LIBROS_CORS_ALLOWED_ORIGINS`;
- confirmar si ese mismo dominio debe figurar en los dominios autorizados de Firebase Authentication para `signInWithCustomToken`;
- indicar quién será responsable de esa modificación puntual.

El workflow frontend no debe recibir `Firebase Authentication Admin` solo para registrar dominios dinámicos. Preferimos que el dominio estable se configure una vez por el propietario de Firebase o por backend.

## Por qué se necesita

Compartir la cuenta administrativa del backend con el repositorio frontend ampliaría innecesariamente el impacto de una filtración de CI y mezclaría responsabilidades. Publicar sin confirmar el sitio o canal también podría sustituir contenido existente, alterar dominios autorizados o dejar un origen CORS inestable.

La coordinación permite que backend conserve propiedad exclusiva de datos, reglas, autenticación y mensajería, mientras frontend recibe únicamente capacidad de desplegar sus archivos estáticos QA.

## Qué se espera lograr

- Un único origen QA estable y conocido por frontend y backend.
- CORS exacto, sin comodines ni URLs temporales.
- Una identidad de CI distinta de la cuenta administrativa del backend.
- Ninguna capacidad del workflow frontend para leer o modificar datos Firebase.
- Un despliegue serializado que solo se active después del gate QA y de esta aprobación.
- Producción completamente separada y sin service accounts compartidas.

## Criterios de aceptación

- Backend identifica el sitio y canal autorizados, o propone una alternativa inequívoca.
- Backend confirma si la cuenta existente es administrativa o específica de Hosting, comunicando solo nombre, finalidad y roles.
- Si hace falta otra identidad, quedan acordados nombre, alcance y permisos antes de crearla.
- Se fija el origen exacto que debe añadirse a CORS y, si procede, a Firebase Authentication.
- Backend confirma que el frontend no desplegará reglas, datos, Functions, FCM ni configuración administrativa.
- WIF se prueba primero con `QA_HOSTING_DEPLOY_ENABLED=false`; solo después de una comprobación de lectura verde podrá autorizarse `QA_HOSTING_DEPLOY_ENABLED=true`.

## Respuesta vigente en backend PR #2

Backend fijó en `agent/qa-front-closure`, commit `b6e9d4a`:

- sitio `libros-qa`, canal `live` y origen `https://libros-qa.web.app`;
- CORS exacto y dominio Firebase Authentication ya autorizado;
- identidad `github-libros-front-hosting@libros-qa.iam.gserviceaccount.com` mediante WIF, sin clave JSON;
- proveedor restringido simultáneamente a `yosi90/libros-front`, `refs/heads/main` y Environment `qa`;
- roles Hosting Admin y API Keys Viewer, sin permisos de Auth, datos, mensajería, Functions, Cloud Run ni producción;
- Environment `qa` restringido a `main`, con variables y secretos ya configurados;
- workflow inicialmente manual y despliegue bloqueado con `QA_HOSTING_DEPLOY_ENABLED=false`.

Cierres coordinados tras la revisión:

- El alias público heredado con el nombre mal escrito se retiró después de confirmar que ningún workflow o código lo consumía. El único nombre contractual es `QA_FIREBASE_SITE_ID`.
- El contrato canónico del backend en el commit `b6e9d4a` declara `X-QA-Lease-Id` tanto en `/qa/fixtures` como en `/qa/reset`; el frontend consume ese contrato y envía la cabecera en ambas operaciones. `docs/backend/**` se mantiene como documentación de solo lectura y no forma parte de los cambios de este trabajo.
- La comprobación WIF real no puede ejecutarse desde la rama del PR porque proveedor y Environment solo aceptan `main`. La primera ejecución tras fusionar deberá mantener el gate en `false` y limitarse a listar/verificar Hosting.

## Estado de respuesta

Aceptada y cerrada: backend cumplió los criterios solicitados y no queda ninguna respuesta pendiente por su parte. La primera ejecución manual desde `main`, con `QA_HOSTING_DEPLOY_ENABLED=false`, deberá autenticar mediante WIF y listar/verificar `libros-qa` sin desplegar; este paso pertenece al cierre operativo del frontend.

Esta petición queda archivada y no se volverá a modificar ni enviar. Si aparece una necesidad posterior que requiera actuación del backend, se abrirá una petición independiente con su propio alcance y ciclo de respuesta.
