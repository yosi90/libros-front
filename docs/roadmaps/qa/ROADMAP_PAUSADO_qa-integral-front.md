# QA integral del frontend

> Estado: pausado. Backend QA ya está operativo; no se activará hasta cerrar el roadmap RTF vigente, que espera una build WinForms conectada de forma verificable a QA.

## Objetivo

Construir y ejecutar una campaña híbrida de QA que cubra las superficies activas del frontend y los contratos backend que consume, con automatizacion estable, integracion real aislada, accesibilidad, seguridad, visual y rendimiento.

## Checklist

- [ ] **Hito 0 - Cerrar prerrequisitos y activar la iniciativa.**
  - Descripcion: cerrar la checklist RTF, completar CORS/Hosting de la respuesta backend y cambiar este documento y su checklist de `PAUSADO` a `ACTIVO`/`pendiente`.
  - Por que se necesita: solo puede existir un roadmap activo y ninguna prueba destructiva puede apuntar a produccion.
  - Que se espera lograr: iniciar la campaña con entorno, identidades y dataset seguros.
  - Peligros si se mantiene como estaba: resultados no reproducibles o alteracion de datos reales.
  - Peligros del cambio: depender de infraestructura externa puede retrasar la campaña real.
  - Avance operativo: el GitHub Environment `qa`, las cinco credenciales, las variables de contrato y WIF ya existen. Backend PR #2 fija sitio `libros-qa`, canal `live`, CORS y dominio Auth. El workflow manual mantiene toda la campaña bloqueada por `QA_HOSTING_DEPLOY_ENABLED=false`, salvo la comprobación WIF de solo lectura.

- [ ] **Hito 1 - Estabilizar las puertas automaticas.**
  - Descripcion: sanear Karma, validar OpenAPI, separar configuración QA y crear smoke E2E, accesibilidad, visual y captura de errores.
  - Por que se necesita: build y cuatro pruebas de shell no protegen los recorridos del producto.
  - Que se espera lograr: un gate rapido y determinista para pull requests y despliegues.
  - Peligros si se mantiene como estaba: regresiones funcionales llegan a preview o produccion sin señal automatica.
  - Peligros del cambio: tests inestables pueden bloquear cambios correctos si no se aislan datos y tiempos.
  - Avance local: Karma y umbrales de cobertura saneados; OpenAPI válido con 22 avisos registrados; build producción/QA, smoke Chromium/Firefox, axe, visual Chromium y smoke compacto preparados. El arnés real consume `/runtime-config`, lease global, reset, aliases y los cinco escenarios entregados; falta validarlo desde `main` con WIF y runner real.

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
