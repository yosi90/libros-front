# Petición backend - Restaurar el vínculo del teléfono ficticio en `baseline` QA

> Estado vigente: pendiente y bloqueante de la aceptación específica del Hito 13. No se repetirán campañas completas idénticas hasta recibir una corrección o aclaración contractual del backend.

## Resumen

La campaña alojada del frontend completa correctamente el preflight E.164 y Firebase Phone Auth con el número/código ficticios configurados, pero `POST /auth/session` rechaza después la identidad verificada con `403 phone_access_method_not_linked`.

El handoff vigente declara que QA entrega un teléfono ficticio ya vinculado, que el recorrido debe conciliar `IntentoId` e ID token y que el teléfono permite login únicamente para una cuenta existente. La respuesta observada demuestra que el vínculo SQL/Firebase requerido no existe o no coincide después de restaurar `baseline`.

## Evidencia reproducible

Repositorio frontend: `yosi90/libros-front`.

Workflow: `QA Hosting manual campaign`, desde `main`, con lease global, dataset `2026.08.3`, despliegue en `https://qa-libros.yosiftware.es` y un único worker.

### Ejecución diagnóstica `32729709020`

- URL: `https://github.com/yosi90/libros-front/actions/runs/32729709020`.
- Commit frontend: `d733992fab0430ba2419a2db381371ec80a90d1e`.
- Chromium y Firefox parten de `storageState` vacío y ejecutan el mismo recorrido.
- `POST /auth/phone/preflight` devuelve `201`.
- Firebase acepta el número y código ficticios sin enviar SMS real y entrega una identidad verificable.
- `POST /auth/session`, con el ID token anterior y el `PhoneAttemptId` del preflight, devuelve en ambos navegadores:

```json
{
  "status": 403,
  "code": "phone_access_method_not_linked"
}
```

- La matriz construida de cinco perfiles, realtime en Chromium/Firefox, despliegue Hosting, smoke alojado y restauración de las cuatro sesiones password quedan verdes.
- El cleanup restaura `baseline`, libera la lease y el escaneo de evidencia no encuentra secretos.

Las ejecuciones anteriores `32727048076` y `32728351461` ya mostraban que el login telefónico no cerraba de forma estable, pero sus contextos heredaban el `storageState` de `userA` y no permitían atribuir la causa. La ejecución diagnóstica corrige ese aislamiento y acredita la respuesta contractual anterior sin registrar teléfono, OTP, ID token ni cookies.

## Relación con el contrato entregado

`docs/backend/qa/HANDOFF_AUTENTICACION_FIREBASE_FRONT.md` exige confirmar «teléfono solo vinculado» y declara que los secrets del Environment corresponden al número ficticio configurado en Firebase.

`docs/backend/api/AUTENTICACION_FIREBASE.md` establece que el preflight y el ID token telefónico se entregan a `/auth/session`, y que el acceso solo se admite cuando la identidad ya está vinculada.

El rechazo sería correcto para un número cualquiera, pero contradice el fixture determinista ofrecido para esta campaña de aceptación.

## Qué necesita el frontend

Backend debe investigar y corregir la relación entre el número ficticio de Firebase QA y el método `phone` de la cuenta SQL sembrada. La solución debe garantizar que cada restauración a `baseline` deja el recorrido repetible.

Aceptamos la estrategia técnica que backend considere segura, por ejemplo:

1. Vincular el teléfono ficticio a uno de los usuarios Firebase baseline existentes y conservar un UID estable coherente con el sujeto SQL.
2. Sembrar explícitamente una identidad telefónica baseline adicional y documentar su alias/usuario, ajustando la allowlist y el cleanup de Firebase.
3. Proporcionar otro mecanismo determinista equivalente que mantenga el requisito de identidad ya vinculada y no convierta teléfono en registro.

No se solicita relajar `phone_access_method_not_linked`, crear cuentas desde teléfono, publicar el número/código ni permitir SMS reales.

## Criterios de aceptación

- Tras adquirir lease y restaurar `baseline`, el número ficticio configurado está vinculado a una cuenta SQL conocida y activa.
- Preflight anónimo devuelve `201` y un `IntentoId` utilizable.
- Firebase Phone Auth con el OTP ficticio no envía SMS real.
- `POST /auth/session` con ese ID token y `PhoneAttemptId` devuelve `200`, `Estado: authenticated` y una sesión revocable de la cuenta esperada.
- El recorrido anterior pasa desde un contexto anónimo nuevo en Chromium y Firefox.
- Un número no vinculado continúa devolviendo `phone_access_method_not_linked`.
- Reset y cleanup son idempotentes, no dejan identidades ajenas al baseline documentado y no exponen teléfono, OTP, tokens ni huellas.
- Backend entrega un handoff con la causa, release/commit desplegado, cualquier cambio en dataset o alias y si deben actualizarse secrets del Environment frontend.

## Impacto mientras permanezca pendiente

Bloquea el check 13.5 y el visto bueno frontend para el corte productivo de autenticación. Contraseña, refresh/CSRF, realtime, Hosting y el resto de la campaña quedan acreditados, pero teléfono forma parte del alcance contractual completo y no se aprobará producción ocultando o deshabilitando esta prueba.

