# QA integral del frontend

> Estado: pausado como iniciativa integral para respetar la regla de un único roadmap dedicado activo. Esta pausa no bloquea la campaña contractual web de aceptación backend/frontend, que puede ejecutarse sin WinForms.

## Objetivo

Construir y ejecutar una campaña híbrida de QA que cubra las superficies activas del frontend y los contratos backend que consume, con automatizacion estable, integracion real aislada, accesibilidad, seguridad, visual y rendimiento.

## Campaña contractual ejecutable

- Backend fusionó su PR #2 en `main` mediante `9da668b` y acepta técnicamente el cierre frontend `c5a6050`.
- El PR frontend #1 quedó fusionado en `main` mediante `27b5d0e`, conservando `QA_HOSTING_DEPLOY_ENABLED=false`; ya puede ejecutarse la comprobación WIF de solo lectura.
- Tras una comprobación WIF verde y la habilitación posterior del flag por el propietario, puede ejecutarse la campaña Playwright acordada: Chromium, Firefox, los cinco escenarios, recuperación realtime y restauración final de `baseline`.
- La paridad RTF con WinForms continúa en su roadmap propio. `scene.rtf-2297` forma parte del recorrido web, pero una build WinForms conectada a QA no es prerrequisito de WIF, Hosting ni Playwright.
- Ejecutar esta aceptación contractual no activa ni cierra por sí sola el alcance más amplio de este roadmap integral.

## Checklist

- [ ] **Hito 0 - Cerrar prerrequisitos y activar la iniciativa.**
  - Descripcion: cerrar la checklist RTF y cambiar este documento y su checklist de `PAUSADO` a `ACTIVO`/`pendiente`. CORS, Hosting y los contratos backend ya están cerrados; la campaña contractual web puede ejecutarse antes de activar esta iniciativa integral.
  - Por que se necesita: solo puede existir un roadmap activo y ninguna prueba destructiva puede apuntar a produccion.
  - Que se espera lograr: iniciar la campaña con entorno, identidades y dataset seguros.
  - Peligros si se mantiene como estaba: resultados no reproducibles o alteracion de datos reales.
  - Peligros del cambio: depender de infraestructura externa puede retrasar la campaña real.
  - Avance operativo: el GitHub Environment `qa`, las cinco credenciales, las variables de contrato, la cuenta y el proveedor WIF ya existen. Backend PR #2 quedó fusionado mediante `9da668b` y el workflow frontend mediante `27b5d0e`, con `QA_HOSTING_DEPLOY_ENABLED=false`. El siguiente paso es comprobar WIF sin desplegar; solo el propietario podrá habilitar después la campaña y el despliegue.

- [ ] **Hito 1 - Estabilizar las puertas automaticas.**
  - Descripcion: sanear Karma, validar OpenAPI, separar configuración QA y crear smoke E2E, accesibilidad, visual y captura de errores.
  - Por que se necesita: build y cuatro pruebas de shell no protegen los recorridos del producto.
  - Que se espera lograr: un gate rapido y determinista para pull requests y despliegues.
  - Peligros si se mantiene como estaba: regresiones funcionales llegan a preview o produccion sin señal automatica.
  - Peligros del cambio: tests inestables pueden bloquear cambios correctos si no se aislan datos y tiempos.
  - Avance local: Karma y umbrales de cobertura saneados; OpenAPI válido con avisos registrados; build producción/QA, smoke Chromium/Firefox, axe, visual Chromium y smoke compacto preparados. El arnés real consume `/runtime-config`, lease global con keepalive cada tres minutos, reset, aliases y los cinco escenarios entregados. WIF y Hosting QA ya quedaron validados. Tras el diagnóstico backend del run `31703994637`, `realtime-recovery` conserva la evidencia fuera del documento, liga readiness a su `documentId` y exige una revisión limpia e idéntica de API/gateway; falta validar el ajuste en cinco campañas Chromium/Firefox consecutivas.

- [ ] **Hito 2 - Automatizar recorridos funcionales prioritarios.**
  - Descripcion: cubrir sesion, biblioteca, catalogo, gestores, lectura, narrativa, perfil, estadisticas y administracion por roles.
  - Por que se necesita: son los recorridos que pueden provocar perdida de trabajo, permisos incorrectos o datos inconsistentes.
  - Que se espera lograr: regresion repetible de lectura y mutaciones principales.
  - Peligros si se mantiene como estaba: los fallos solo se descubren en uso manual tardio.
  - Peligros del cambio: una semilla insuficiente puede producir falsos positivos.

- [ ] **Hito 3 - Ejecutar comunidad, realtime y seguridad.**
  - Descripcion: probar capacidades, relaciones, feed, chat, clubes, notificaciones, Firebase/WebSocket, autorizacion, XSS y resiliencia.
  - Por que se necesita: estas superficies combinan multiusuario, privacidad, idempotencia y transporte asincrono.
  - Que se espera lograr: demostrar aislamiento entre cuentas y degradacion segura cuando falla realtime.
  - Peligros si se mantiene como estaba: fugas de datos, duplicados o sesiones corruptas pasan inadvertidos.
  - Peligros del cambio: pruebas destructivas mal protegidas pueden afectar recursos compartidos.

- [ ] **Hito 4 - Cerrar campaña y gates.**
  - Descripcion: completar visual desktop, smoke movil, WCAG 2.2 AA pragmatico, baseline de rendimiento, triage y CI nocturna.
  - Por que se necesita: la calidad funcional no cubre estabilidad visual, uso por teclado ni degradaciones de rendimiento.
  - Que se espera lograr: cero defectos criticos/altos, medios aceptados y evidencias reproducibles.
  - Peligros si se mantiene como estaba: el producto puede estar funcional pero ser inusable o inestable.
  - Peligros del cambio: snapshots o umbrales mal calibrados generan ruido de mantenimiento.

## Limites

- El email real y el ciclo de entrega de enlaces quedan fuera; los estados frontend se validan con respuestas controladas.
- La campaña cubre endpoints usados por el frontend, no toda la API backend.
- Movil es smoke funcional; los defectos cosmeticos no bloquean si el uso basico permanece intacto.
- Los hallazgos se diagnostican y documentan; no se corrigen automaticamente salvo trabajo aprobado aparte.
