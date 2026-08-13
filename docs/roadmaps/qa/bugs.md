# QA transversal - Bugs y mejoras acotadas

## Pendiente

- [ ] Actualizar las dependencias Angular afectadas por avisos XSS/fuga de cache y la dependencia transitiva `websocket-driver`: `npm audit --omit=dev` registra 10 vulnerabilidades de produccion (1 baja, 8 altas y 1 critica). Requiere un lote de actualizacion y regresion propio; no aplicar `npm audit fix` sin revisar el cambio de framework.
- [ ] Resolver los 22 avisos estructurales de Redocly del contrato copiado: rutas ambiguas de notificaciones/chat/clubes/coleccion, `ClubId` requerido pero no definido en un `allOf` y componentes no usados. El contrato es valido y no tiene errores de referencia.
- [ ] Corregir o aislar los nueve avisos de selectores Bootstrap que muestra el build de produccion.
- [ ] Recuperar el presupuesto inicial de producción: el build actual supera el límite de 2 MB por 1,17 kB. No bloquea la compilación, pero debe evitarse que siga creciendo.
- [ ] Inspeccionar visualmente el nuevo bloque de salud administrativo con la cuenta QA; los secretos del Environment ya están completos y falta ejecutar la campaña autenticada tras publicar el workflow.
- [ ] Integrar el diagnóstico ya tipado de `/health/realtime` en Operación de Comunidad; no mostrar objetos arbitrarios y mantener el acceso limitado a administración.

## En curso

- Ninguno registrado.

## Finalizado

- [x] Modelar `realtime-recovery` como transporte al menos una vez: cada uno de los cuatro eventos exige dos o más frames, una sola aplicación y al menos un duplicado; las observaciones completas se conservan como archivo físico del artefacto.
- [x] Acotar `realtime-recovery` a la identidad devuelta por cada `POST`: el historial exige un único artículo por ID sin confundir la previsualización lateral, y la reconciliación offline contrasta el mismo ID en REST y DOM.
- [x] Alinear `X-Client-Version` de la build QA con el semver numérico aceptado por `/comunidad/capacidades` y hacer que `realtime-recovery` adjunte la respuesta de capacidades antes de esperar al socket.
- [x] Sincronizar `realtime-recovery` con el socket creado tras navegar al chat: la navegación completa sustituye la conexión previa y Chromium podía publicar el primer mensaje antes de que el nuevo canal estuviera abierto (run `31697054367`); se mantienen las exigencias de cuatro eventos, duplicación, deduplicación y reordenamiento.
- [x] Resolver el directorio público de Hosting respecto a la configuración QA temporal: el run `31698663996` superó toda la campaña Chromium/Firefox, pero Firebase buscó el artefacto bajo `test-results/dist` al interpretar desde allí `firebase.qa.json`.
- [x] Hacer que Karma CI finalice por si mismo, sin reporter HTML tardio ni contaminacion global entre specs: 207/207 pruebas y cobertura; la ejecución actual termina dentro del minuto operativo sin procesos huerfanos.
- [x] Fijar el baseline inicial de cobertura global en 28% statements, 21% ramas, 23% funciones y 30% lineas, redondeado hacia abajo.
