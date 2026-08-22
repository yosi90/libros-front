# Petición backend: Google Sign-In mediante Firebase y vinculación con cuenta local

## Contexto actual

La API de Libros es la autoridad de identidad, sesión, roles, permisos, sanciones y estado de cuenta. El frontend inicia después una sesión Firebase secundaria mediante `POST /auth/firebase-custom-token`; su UID contractual es siempre `libros:<id_usuario>` y se utiliza para realtime, Firestore, RTDB y push.

Queremos incorporar Google como método adicional de acceso mediante Firebase Authentication sin sustituir el JWT de Libros, cambiar esa autoridad ni crear cuentas duplicadas. El login por email y contraseña, la recuperación y la verificación actuales deben seguir disponibles.

## Qué se necesita

Solicitamos un contrato backend para intercambiar un Firebase ID token obtenido mediante el proveedor `google.com` por una sesión local de Libros, además de vincular y desvincular de forma segura ese proveedor.

El backend debe verificar el ID token con Firebase Admin y comprobar al menos:

- firma, emisor, audiencia/proyecto, caducidad y revocación cuando corresponda;
- que el proveedor efectivo sea `google.com`;
- UID Firebase y UID estable del proveedor Google;
- email, estado de verificación y datos de perfil permitidos;
- que proyecto y entorno coincidan, rechazando tokens de QA en producción y viceversa.

El ID token de Firebase no es un JWT de Libros y nunca debe autorizar directamente endpoints de negocio.

## Flujos que debe distinguir el contrato

### 1. Identidad Google ya vinculada

El backend localiza el vínculo por proveedor e identificador estable, comprueba el estado actual de la cuenta local y devuelve la misma sesión que el login por credenciales: JWT, refresh token, usuario, versión de sesión y flags de verificación/restricción vigentes.

### 2. Identidad Google nueva sin cuenta local coincidente

La cuenta local necesita actualmente alias único, nombre visible y país, datos que Google no garantiza o que no deben inferirse silenciosamente. Recomendamos que el intercambio responda con un estado `onboarding_required` y un ticket opaco, corto, actor-scoped y de un solo uso. El frontend recogerá únicamente los campos locales pendientes y la aceptación vigente de términos antes de solicitar la creación atómica de la cuenta y del vínculo.

Backend puede proponer otra forma compatible, pero debe documentar:

- cómo se resuelven alias ausente o en conflicto;
- qué campos se toman de Google y cuáles requieren confirmación;
- cómo se registra la aceptación de políticas;
- qué ocurre si dos solicitudes intentan crear el mismo vínculo o email;
- si la cuenta creada mediante Google queda con email verificado y sin contraseña local hasta que la persona añada una.

### 3. Existe una cuenta local con el mismo email, pero Google no está vinculado

No debe fusionarse automáticamente por coincidencia de email. El intercambio debe devolver un estado estructurado equivalente a `link_required`, sin emitir una sesión para esa cuenta. La persona deberá autenticarse con el método local existente y confirmar después la vinculación mediante un endpoint autenticado y una credencial o ticket Google reciente y de un solo uso.

### 4. Vinculación desde una sesión local activa

Se necesita una operación autenticada que vincule Google a la cuenta del actor después de verificar nuevamente la prueba Firebase. Debe ser idempotente para el mismo vínculo y rechazar:

- un proveedor Google ya asociado a otra cuenta;
- un token perteneciente a otro proyecto o entorno;
- una cuenta local deshabilitada o en un estado incompatible;
- una autenticación Google demasiado antigua para una operación sensible.

### 5. Desvinculación

Solicitamos documentar una operación autenticada para retirar Google. Debe exigir autenticación reciente y rechazar la desvinculación si dejaría a la cuenta sin ningún método de acceso recuperable. Si esta operación se aplaza, debe quedar declarado explícitamente en el contrato inicial.

## Forma orientativa del contrato

La nomenclatura definitiva pertenece al backend. Una forma posible sería:

- `POST /auth/google/intercambio`, público y rate-limited, con `IdTokenFirebase`;
- `POST /auth/google/registro`, con ticket de onboarding y campos locales pendientes;
- `POST /auth/google/vinculacion`, autenticado con JWT local y ticket/prueba Google reciente;
- `DELETE /auth/google/vinculacion`, autenticado y con reautenticación reciente;
- un endpoint autenticado o campo de perfil que permita saber si Google está vinculado sin exponer identificadores del proveedor.

La respuesta de intercambio debe ser una unión discriminada y documentada, no depender de interpretar textos. Estados mínimos esperados:

- `authenticated` con la respuesta de sesión local;
- `onboarding_required` con ticket temporal y perfil mínimo permitido;
- `link_required` con ticket temporal;
- errores estructurados para token inválido/caducado, proveedor incorrecto, conflicto, cuenta restringida, rate limit y Firebase no configurado.

Los tickets no deben contener el ID token original, no deben aparecer en URLs y deben tener caducidad corta, uso único y vinculación inequívoca con la identidad Google verificada.

## Convivencia con la identidad Firebase canónica

El contrato actual garantiza `libros:<id_usuario>` como UID Firebase de la aplicación. El nuevo flujo no debe permitir que una identidad Firebase transitoria creada por Google acceda a Firestore, RTDB, push o recursos protegidos antes de que la API autorice la cuenta local.

Solicitamos que backend documente y garantice una estrategia para conservar esa identidad canónica. El frontend espera que, tras obtener el JWT local, pueda continuar usando `POST /auth/firebase-custom-token` y sustituir la sesión Firebase del proveedor por `libros:<id_usuario>`. Si backend vincula o normaliza además el proveedor Google dentro de Firebase Authentication, debe detallar la migración, la unicidad y la ausencia de usuarios huérfanos; no se modificará el UID contractual ni las reglas realtime de forma implícita.

Firebase Authentication sigue sin ser fuente de roles, permisos, sanciones o estado de cuenta.

## Sesión, seguridad y datos

- El backend debe aplicar a Google las mismas políticas de cuenta deshabilitada, bloqueada, pendiente o restringida que al login local.
- JWT, refresh, rotación, revocación, logout global y `sessionVersion` continúan perteneciendo a Libros.
- El cierre de sesión debe poder revocar la sesión local y dejar al frontend cerrar también Firebase sin estados parciales.
- Debe existir una restricción única para `(Proveedor, IdentificadorProveedor)` y una política explícita para emails normalizados.
- No se almacenan access tokens de Google salvo necesidad funcional futura expresamente aprobada; para este alcance solo se necesita identidad.
- No se solicitan scopes adicionales de Google.
- Los secretos administrativos y credenciales OAuth no se publican mediante `/runtime-config`; el frontend solo consume configuración web pública de Firebase.
- Los endpoints públicos deben tener rate limit, errores no enumerables cuando proceda y auditoría sanitizada de creación/vinculación, sin registrar tokens.

## Configuración operativa solicitada

Backend administra actualmente Firebase Authentication y sus reglas. Solicitamos coordinar y documentar para producción y QA:

- activación del proveedor Google en el proyecto correcto;
- dominios autorizados para producción, QA y desarrollo local acordado;
- nombre público y correo de soporte;
- separación estricta de proyectos y tokens entre entornos;
- cualquier cambio necesario en Firebase Admin, Identity Toolkit o reglas;
- confirmación de que no es necesario entregar al frontend una service account ni secreto nuevo.

El propietario del producto realizará los pasos manuales de Firebase Console guiado por frontend/backend cuando el contrato esté cerrado; no debe habilitarse el proveedor en un entorno real sin coordinación.

## Qué se espera lograr

1. Acceso con Google seguro en navegador y PWA móvil.
2. Registro guiado para identidades nuevas sin inventar datos locales obligatorios.
3. Vinculación explícita para cuentas existentes, nunca fusión silenciosa por email.
4. Una sola cuenta local por persona y proveedor, conservando `libros:<id_usuario>` en Firebase.
5. Login por contraseña, recuperación, permisos, refresh y logout sin regresiones.
6. Un OpenAPI consumible que permita implementar frontend y la QA final sin inferir respuestas o códigos.

## Estado de respuesta

Pendiente de implementación backend, configuración coordinada de Firebase Authentication y actualización del OpenAPI y las guías de integración.
