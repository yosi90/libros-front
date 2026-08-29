# Integración Android — Hito 13

> Estado: finalizado el 29 de agosto de 2026. Convierte el spike aprobado en una integración nativa mantenible; no publica todavía una APK de producción.

## Implementación cerrada

- `NativeRuntimeService` integra el estado de red, la reanudación de servicios realtime y el botón Atrás con prioridad para diálogos, historial y salida.
- `ExternalNavigationService` abre destinos HTTP(S) mediante el navegador del sistema en Android y rechaza esquemas no permitidos.
- La apertura de una notificación push entrega únicamente su identificador al store; el destino se resuelve desde la notificación persistida y las reglas de navegación existentes.
- El WebView declara `viewport-fit=cover`, redimensionado ante teclado y mantiene los recursos de icono, splash y safe areas ya aprobados.
- Los builds nativos generan un sello QA o producción después de copiar Angular. Gradle rechaza un flavor si el sello falta o pertenece al entorno contrario.
- QA y producción mantienen package, manifiestos, App Links y source sets Firebase separados. APK, keystore, configuración Firebase y assets copiados continúan fuera del repositorio.

## Evidencia automatizada

- Build web producción: verde; solo conserva el aviso histórico de presupuesto Sass.
- Suite unitaria completa: `292 SUCCESS`.
- Controles QA: `34/34`.
- `assembleQaDebug`: verde con el bundle QA sellado.
- `assembleProductionDebug` sobre un bundle QA: rechazo temprano esperado por entorno incorrecto.
- Bundle nativo producción: contiene únicamente la API productiva y genera el sello correcto.
- Gradle producción con ese bundle: se detiene únicamente por la ausencia deliberada de `android/app/src/production/google-services.json`.

## Evidencia en Honor Magic V3

- La APK QA se instaló como actualización sobre `es.yosiftware.libros.qa` y arrancó en `native-mobile`, plegado a 353 × 792 CSS px, sin errores del WebView.
- Tras la recarga necesaria por el defecto conocido posterior a aceptar políticas, restauró `/dashboard/books`, Firebase/sesión y la colección.
- Pasar a segundo plano y regresar conservó ruta, sesión y UI sin recarga ni errores.
- Atrás desde la raíz de Biblioteca cerró la actividad; reabrirla restauró directamente la misma sesión.
- Forzar `/dashboard/adminpanel` activó el guard de escritorio y devolvió a `/dashboard/books`.

El fallo histórico que deja Biblioteca cargando inmediatamente después de aceptar políticas sigue reproducible y queda fuera de este cierre por decisión del propietario; una recarga restaura la sesión correctamente.

## Puerta de producción transferida a H14

Firebase producción todavía no tiene registrada una aplicación Android para `es.yosiftware.libros`. No se utilizará la firma debug ni se copiará `google-services.json` de QA. El Hito 14 comienza creando una clave release estable, conservando una copia offline y obteniendo sus huellas SHA-1/SHA-256; con ellas se registrará la aplicación Firebase productiva y se instalará su configuración en el source set ignorado de producción antes de generar cualquier APK firmada.
