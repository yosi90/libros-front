# Petición al backend: corregir descarga y ubicación de `google-services.json` Android

## Estado de respuesta

ACEPTADA. `docs/backend/qa/FIREBASE.md` descarta expresamente el comando `npm exec firebase -- ...`, publica una invocación reproducible del ejecutable versionado y sitúa la copia local exclusivamente en `android/app/src/qa/google-services.json`. También prohíbe la ubicación raíz compartida y mantiene separada la futura configuración de producción.

## Contexto

La aplicación Android QA de Firebase ya está registrada y el frontend pudo descargar, validar y compilar su configuración. Durante la integración reproducible encontramos dos diferencias entre `docs/backend/qa/FIREBASE.md` y el toolchain real del frontend.

## Qué necesitamos

### 1. Corregir la sintaxis de Firebase CLI

El comando documentado:

```powershell
npm exec firebase -- apps:sdkconfig ANDROID <app-id> --project libros-qa --non-interactive --out <ruta>
```

no invoca Firebase CLI con npm 10 y termina mostrando la ayuda de `npm exec` o `Too many arguments`. La forma validada con la versión fijada por la propia documentación es:

```powershell
npx --yes firebase-tools@15.23.0 apps:sdkconfig ANDROID <app-id> --project libros-qa --non-interactive --out <ruta-segura>\google-services.json
```

Puede documentarse otra sintaxis equivalente si se verifica con npm 10, pero debe fijar `firebase-tools@15.23.0` y funcionar de forma no interactiva cuando ya existe una sesión autorizada.

### 2. Aislar la configuración por flavor

La ruta `android/app/google-services.json` es común a todos los flavors. Para impedir que QA se empaquete o interfiera con producción, la configuración validada se instala localmente en:

```text
android/app/src/qa/google-services.json
```

La futura configuración de producción deberá vivir separadamente en:

```text
android/app/src/production/google-services.json
```

Ambas rutas continúan ignoradas por Git y sus copias maestras permanecen fuera del repositorio.

## Criterios de aceptación

- La guía publica un comando de descarga reproducible con Firebase CLI `15.23.0` y npm 10.
- QA y producción usan source sets separados y nunca comparten el JSON raíz.
- No se incorporan API keys, JSON descargados ni credenciales a `docs/backend/**`.
- El cambio no altera package, huellas, App ID ni contratos de autenticación ya entregados.

## Qué esperamos lograr

Evitar que una futura sesión repita un comando inválido o genere accidentalmente una APK de producción con configuración Firebase QA.
