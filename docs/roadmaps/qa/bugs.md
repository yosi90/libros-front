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

- [x] Alinear `X-Client-Version` de la build QA con el semver numérico aceptado por `/comunidad/capacidades` y hacer que `realtime-recovery` adjunte la respuesta de capacidades antes de esperar al socket.
- [x] Hacer que Karma CI finalice por si mismo, sin reporter HTML tardio ni contaminacion global entre specs: 207/207 pruebas y cobertura; la ejecución actual termina dentro del minuto operativo sin procesos huerfanos.
- [x] Fijar el baseline inicial de cobertura global en 28% statements, 21% ramas, 23% funciones y 30% lineas, redondeado hacia abajo.
