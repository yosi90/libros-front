# Corte productivo de autenticacion Firebase

Este runbook se ejecuta solo despues de cerrar QA, con backend y front aprobados en el mismo release. No activa Identity Platform y nunca reutiliza credenciales del proyecto `libros-qa`.

## Datos fijos

- Proyecto Firebase: `yosiftware-libros`.
- Base SQL: `libros`.
- API: `https://libros-api.yosiftware.es`.
- Front Firebase Hosting: proyecto `yosiftware-libros`; dominio publico canonico `https://libros.yosiftware.es`.
- Auth domain y redirect Google productivos: `libros.yosiftware.es` y `https://libros.yosiftware.es/__/auth/handler`.
- UID de datos: `libros:<id_usuario>`.
- UID password importado: `libros-auth:password:<id_usuario>`.

## Barreras previas

- Campana QA completa verde en Chromium y Firefox, QA restaurada a `baseline` y sin lease activa.
- Suite Python, OpenAPI, Firebase rules e integracion SQL/realtime verdes sobre el commit a desplegar.
- Inventarios SQL/Firebase y conteos BCrypt sin discrepancias.
- Front y backend listos para despliegue coordinado; no publicar uno sin el otro.
- Ventana de mantenimiento aprobada. Desde que comienza la importacion no se admiten altas ni cambios de credenciales por el contrato antiguo.

## 1. Copias y rollback

1. Detener escrituras de autenticacion mediante la ventana de mantenimiento.
2. Crear backup completo con checksum de `libros` y ejecutar `RESTORE VERIFYONLY` sobre el archivo resultante.
3. Exportar el inventario de Firebase Authentication de `yosiftware-libros` a una ubicacion cifrada y no versionada. No imprimir usuarios, hashes ni tokens en CI.
4. Registrar los identificadores exactos de los releases backend/front anteriores y del candidato.
5. Confirmar que el backup puede restaurarse antes de continuar.

Antes del paso destructivo 7, el rollback consiste en desplegar ambos releases anteriores y conservar las tablas nuevas/Firebase importado, que son aditivos. Despues del paso 7, volver al login SQL exige restaurar el backup verificado.

## 2. Preparar SQL de forma aditiva

Ejecutar con una identidad administrativa:

```powershell
sqlcmd -S <servidor> -d libros -b -i "scripts/sql/autenticacion-firebase/01 - Pre-corte autenticacion Firebase.sql"
```

El script aborta si la base efectiva no es `libros`, es repetible y no elimina `usuarios.password` ni los tokens legacy. Verificar `version_sesiones`, las ocho tablas de autenticacion, trece indices y los permisos limitados del usuario SQL `libros`.

## 3. Configurar Firebase Console

El propietario realiza estos cambios en `yosiftware-libros`, comprobando el selector de proyecto antes de cada guardado:

1. Authentication > Configuracion > Vinculacion de cuentas: seleccionar crear varias cuentas para cada proveedor de identidad.
2. Confirmar proteccion contra enumeracion de correo.
3. Politica de contrasenas en modo exigir: minimo 8, maximo 20, minuscula, mayuscula, numero y caracter no alfanumerico.
4. Dominios autorizados: conservar los dominios Firebase del proyecto y anadir/verificar `libros.yosiftware.es`. No autorizar dominios QA.
5. Activar correo/contrasena.
6. Activar Google con nombre publico y correo de soporte correctos.
7. Activar telefono con allowlist SMS `ES`, reCAPTCHA y alertas/cuotas conocidas. Telefono sigue siendo solo metodo vinculado; si la cuota gratuita no basta se deshabilita la entrada telefonica en el front hasta aprobar facturacion, sin afectar password/Google.
8. No crear usuarios manualmente ni copiar numeros ficticios QA a produccion.

Las plantillas administradas pueden permanecer por defecto; el SDK solicita idioma `es`. La personalizacion visual no bloquea el corte.

## 4. Auditar e importar BCrypt

Con `.env` apuntando explicitamente a `libros` y `yosiftware-libros`, sin emuladores:

```powershell
.\.venv\Scripts\python.exe -m scripts.migrate_bcrypt_to_firebase --allow-production
```

El dry-run debe informar el mismo numero de usuarios BCrypt SQL y ausencias Firebase esperadas, sin mutar. Revisar emails normalizados y UIDs fuera de logs publicos.

Si el inventario real detecta una credencial legacy en texto plano en lugar de BCrypt, no imprimirla ni copiarla a otra variable. La herramienta solo permite migrarla con `--allow-legacy-plaintext`: genera BCrypt de coste 12 en memoria, importa ese hash y verifica el login internamente sin exponer la credencial. Nunca se rebaja la politica Firebase ni se persiste otro texto plano.

Aplicar una sola vez:

```powershell
.\.venv\Scripts\python.exe -m scripts.migrate_bcrypt_to_firebase --apply --allow-production --verify-email <correo-conocido> --verify-password-env LIBROS_MIGRATION_KNOWN_PASSWORD
```

Para el caso legacy detectado durante el inventario, añadir `--allow-legacy-plaintext`; la verificacion interna sustituye la necesidad de pasar email/contrasena por argumentos o nuevas variables.

La contrasena conocida vive solo en la variable indicada y nunca se imprime. Exigir `applied=true`, conteos coincidentes y `knownLoginVerified=true`. Repetir despues el dry-run: `firebaseMissing` debe ser cero.

## 5. Despliegue coordinado

1. Confirmar en backend los secretos HMAC/JWT, credencial Admin del proyecto productivo, `FIREBASE_WEB_PROJECT_ID=yosiftware-libros`, `FIREBASE_WEB_AUTH_DOMAIN=libros.yosiftware.es`, CORS exacto `https://libros.yosiftware.es` y cookies Secure.
2. Desplegar backend y comprobar `/verify`, `/health`, `/health/realtime` y `/runtime-config` antes de abrir el front.
3. Desplegar el artefacto front del mismo commit/configuracion productiva.
4. Retirar la ventana de mantenimiento solo cuando ambos releases esten disponibles.

No existe ventana dual publica: el front nuevo usa exclusivamente `/auth/session`; las rutas antiguas no forman parte del backend candidato.

## 6. Smoke productivo

Sin registrar credenciales ni capturar tokens:

El tramo backend repetible se ejecuta con una guarda explicita de entorno y nunca consume SMS:

```powershell
.\.venv\Scripts\python.exe -m scripts.smoke_production_auth --allow-production
```

Valida password migrado, cuenta SQL, preferencias, custom token/UID canonico, WebSocket, refresh, restauracion CSRF y logout, y elimina su sesion temporal incluso ante error. Google y telefono siguen siendo recorridos manuales de navegador; telefono no debe automatizarse contra la cuota productiva.

1. Login password de la cuenta migrada y UID canonico `libros:<id>`.
2. Refresh rotatorio, recarga del navegador y logout del dispositivo.
3. Google nuevo/vinculado segun la cuenta de prueba acordada.
4. Gestion de metodos y sesiones sin permitir retirar el ultimo metodo recuperable.
5. Custom token canonico, REST protegido y WebSocket de comunidad.
6. Reset/verificacion/cambio de email mediante Firebase.
7. Telefono solo si la cuota y el numero productivo de prueba han sido aprobados; no consumir SMS por repeticion automatica.

Si falla una comprobacion de seguridad o migracion, volver inmediatamente a ambos releases anteriores antes del paso 7.

## 7. Retirada irreversible de credenciales SQL

Solo despues de aceptacion explicita del smoke y de conservar el backup:

```powershell
sqlcmd -S <servidor> -d libros -b -i "scripts/sql/autenticacion-firebase/02 - Post-corte retirar autenticacion legacy.sql"
```

El script aborta si algun usuario no tiene identidad password Firebase activa. Elimina `password_reset_tokens`, `email_verification_tokens` y `usuarios.password` dentro de una transaccion.

Verificar despues que no existen esas tablas/columna, que el login Firebase sigue funcionando y que ningun endpoint retirado aparece en Flask/OpenAPI. Conservar el backup durante el periodo operativo acordado y documentar su eliminacion segura por separado.
