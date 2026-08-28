# Petición al backend: registrar el cliente Android Firebase de QA

## Estado de respuesta

ACEPTADA-PARCIALMENTE. Backend registró correctamente `es.yosiftware.libros.qa`, ambas huellas coinciden, Google/teléfono/custom token conservan el contrato solicitado y el frontend descargó y validó la configuración con una cuenta autorizada. Gradle procesa `google-services.json` y la APK QA compila. Quedan dos correcciones documentales menores trasladadas a una petición nueva: la sintaxis publicada de Firebase CLI no funciona con npm 10 y la ubicación raíz propuesta no aísla QA del flavor de producción.

## Contexto

El frontend está ejecutando el Hito 5 del roadmap Wood/Mobile/Capacitor. La APK QA ya compila, se instala y renderiza Angular en un Honor Magic V3 con Android 16. `CapacitorHttp` alcanza `https://qa-api.yosiftware.es/runtime-config` y el modo de presentación se resuelve como `native-mobile`.

El siguiente paso es probar `@capacitor-firebase/authentication` con Google, contraseña y teléfono contra el mismo proyecto Firebase QA que ya usa la web. Para este spike se utilizará exclusivamente la firma debug local; no es la firma de distribución y no debe registrarse en producción.

## Qué necesitamos

1. Registrar en el proyecto Firebase de QA una aplicación Android con:
   - package/application id: `es.yosiftware.libros.qa`;
   - SHA-1 debug: `21:8F:D9:F7:7D:1C:32:8F:F9:AE:1B:1D:2F:F9:73:C7:76:F8:56:DB`;
   - SHA-256 debug: `83:AD:BD:68:7E:8A:13:D1:FD:AE:27:6B:0E:78:8B:EF:FD:69:CD:BA:21:B9:3D:3F:A8:D4:3D:B6:99:4C:5E:75`.
2. Confirmar que Google y teléfono están habilitados para ese cliente Android QA y que conservan las identidades/números ficticios deterministas ya definidos para QA.
3. Entregar el `google-services.json` de esa aplicación por un canal seguro o indicar al propietario cómo descargarlo. No debe incluirse en `docs/backend/**`, en este repositorio ni en artefactos públicos.
4. Documentar cualquier requisito adicional específico del cliente Android para:
   - intercambio del ID token con `/auth/session`;
   - custom token Firebase canónico;
   - teléfono ficticio sin SMS real;
   - dominios o restricciones API relevantes.

## Alcance y seguridad

- Esta petición no solicita cambiar cookies, `SameSite`, CSRF ni el contrato web.
- La cookie refresh debe seguir siendo host-only, `HttpOnly` y opaca dentro del cookie jar nativo.
- La firma debug solo acredita el spike QA. Producción usará `es.yosiftware.libros` y una clave release estable custodiada fuera del repositorio; su registro se solicitará cuando exista esa huella.
- Si el cliente Android no puede convivir en el mismo proyecto Firebase QA, necesitamos la topología alternativa y los cambios de audiencia/issuer que el backend requiera antes de continuar.

## Criterios de aceptación

- Firebase reconoce `es.yosiftware.libros.qa` con ambas huellas anteriores.
- La configuración QA permite obtener ID tokens mediante contraseña, Google y teléfono ficticio en el dispositivo físico.
- El backend acepta esas pruebas en el contrato vigente de `/auth/session` sin crear una autoridad de usuario paralela.
- El custom token mantiene el UID canónico `libros:<id_usuario>`.
- Ningún secreto, credencial QA, teléfono real ni configuración de producción entra en Git o en la APK equivocada.

## Qué esperamos lograr

Completar la puerta nativa del Hito 5 con evidencia real de autenticación, restauración de sesión, cookie jar, CSRF, custom token y realtime antes de comprometer la integración Android completa de H13.
