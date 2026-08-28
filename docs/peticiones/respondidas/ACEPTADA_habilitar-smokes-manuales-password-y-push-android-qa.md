# Petición al backend: habilitar smokes manuales de contraseña y push Android QA

## Estado de respuesta

**Aceptada y verificada el 28 de agosto de 2026.** Backend publicó en `docs/backend/qa/SMOKES_MANUALES_ANDROID.md` un procedimiento local que mantiene la contraseña y el token FCM fuera del repositorio, la conversación y los logs. El propietario completó en el Android físico el login positivo por contraseña y confirmó la recepción de una notificación FCM real del proyecto QA. Backend restauró después el escenario `baseline`; no queda trabajo abierto para backend derivado de esta petición.

## Contexto

El spike Android del Hito 5 ya ha validado en un Honor Magic V3 con la APK `es.yosiftware.libros.qa`:

- Google nativo, incluida cancelación de Credential Manager;
- teléfono ficticio sin SMS real;
- intercambio SQL, cookie refresh opaca y restauración CSRF;
- custom token y UID canónico;
- presencia, Realtime Database y sockets;
- alta/re-registro FCM y guardado de preferencias;
- revocación de la sesión actual y limpieza completa de Firebase, CSRF, tokens legacy y claves push locales.

Quedan dos pruebas físicas que el frontend no puede completar de forma segura con los contratos y secretos disponibles localmente:

1. un login positivo mediante contraseña Firebase en la APK;
2. la recepción de una notificación FCM real en el dispositivo registrado.

Las credenciales de las cuentas password QA fueron generadas por backend y sus valores viven como secrets no recuperables desde GitHub. El token FCM permanece deliberadamente fuera de logs, almacenamiento de diagnóstico y documentación.

## Qué necesitamos

### 1. Credencial password para un smoke manual

Proporcionar al propietario, por un canal privado fuera de Git, chat, documentación y logs, una de estas opciones:

- la credencial vigente de una cuenta password QA dedicada; o
- preferiblemente, permitir que el propietario elija una contraseña temporal, actualizar de forma coordinada Firebase QA y el secret CI correspondiente, y rotarla o restaurar el baseline tras el smoke.

La cuenta debe estar verificada, pertenecer únicamente a QA y poder completar `POST /auth/session` sin onboarding destructivo. No debe reutilizar credenciales personales ni productivas.

### 2. Entrega FCM de prueba al dispositivo Android registrado

Ejecutar desde backend/operación QA un envío benigno y de una sola vez al dispositivo Android activo de la cuenta acordada, resolviendo el token internamente. El frontend no necesita ni debe recibir el token FCM.

La carga de prueba debe:

- usar exclusivamente el proyecto `libros-qa`;
- contener un título/cuerpo claramente identificables como prueba QA y, si usa `notificationId`, un identificador válido no sensible;
- respetar las preferencias push de la cuenta;
- no crear una notificación de negocio falsa en producción;
- registrar únicamente resultado sanitizado de entrega, nunca token, teléfono, OTP, cookie o JWT.

Puede ser un script operativo interno o una acción QA protegida ya existente. No solicitamos un endpoint público ni incorporar secretos al frontend.

## Coordinación propuesta

1. Frontend inicia sesión con la cuenta acordada en la APK QA, activa push y habilita una categoría segura.
2. El propietario avisa a backend de que el dispositivo está listo, sin enviar token.
3. Backend ejecuta el envío QA.
4. Frontend confirma recepción en foreground y/o segundo plano mediante observaciones sanitizadas.
5. Backend rota/restaura la contraseña temporal si se utilizó esa opción y mantiene el dataset en `baseline`.

## Criterios de aceptación

- El propietario puede introducir la contraseña directamente en la APK sin que su valor pase por este repositorio ni por la conversación.
- El login password alcanza la misma cuenta SQL y restaura sesión, Firebase canónico y CSRF.
- La APK recibe una notificación FCM real del proyecto QA con la aplicación en foreground o segundo plano.
- Ningún token FCM, credencial, número, OTP o identificador sensible aparece en documentos, logs o artefactos.
- La operación no afecta producción y deja QA restaurado o documenta con precisión el estado temporal restante.
