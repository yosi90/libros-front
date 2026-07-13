# Comunidad, notificaciones y tiempo real

## Objetivo

Construir una experiencia social centrada en la lectura con una ruta completa de Comunidad, un cajon global de notificaciones y chat, clubes de lectura utiles y una integracion realtime resiliente. REST sigue siendo la fuente de verdad; privacidad, spoilers, bloqueos y sanciones se aplican tanto en frontend como en backend.

## Implementaciones pendientes

Las comprobaciones de contrato, regresion, accesibilidad y experiencia manual se mantienen exclusivamente en `docs/pruebas/community/[pendiente][comunidad-notificaciones-realtime].md`.

- [ ] **1. Completar gates, sanciones y limites de producto.**
  - **Descripcion:** terminar de aplicar las restricciones efectivas de politicas y sanciones en todas las capacidades sociales afectadas.
  - **Por que se necesita:** una sancion parcial no debe cerrar la sesion ni dejar accesible una superficie restringida.
  - **Que se espera lograr:** restricciones explicables, acotadas y aplicadas de inmediato.
  - **Peligros si se mantiene como estaba:** acciones disponibles pese a una restriccion o estado realtime residual despues de una sancion.
  - **Peligros del cambio:** bloquear una capacidad que no corresponde al alcance autorizado por backend.
  - [x] Aplicar gates solo a la capacidad afectada por politica o sancion.
  - [x] Limpiar realtime y degradar la UI ante `account_sanctioned`.
  - [x] Cubrir limites y requisitos de politica como estados de producto.

- [ ] **2. Completar la recuperacion realtime.**
  - **Descripcion:** reconciliar toda proyeccion efimera contra REST despues de una reconexion.
  - **Por que se necesita:** REST es la fuente de verdad cuando los eventos se pierden o llegan desordenados.
  - **Que se espera lograr:** estado social consistente tras recuperar red, visibilidad o socket.
  - **Peligros si se mantiene como estaba:** conversaciones, membresias o permisos obsoletos despues de reconectar.
  - **Peligros del cambio:** recargas redundantes o sobrescritura de acciones optimistas aun pendientes.
  - [x] Reconciliar siempre contra REST despues de reconectar en los dominios que aun no lo hacen.

- [ ] **3. Completar push web.**
  - **Descripcion:** activar el canal push opcional sin duplicar notificaciones ni pedir permisos de forma invasiva.
  - **Por que se necesita:** las preferencias push no pueden entregar avisos mientras no exista registro de dispositivo y ciclo de vida de token.
  - **Que se espera lograr:** consentimiento explicito, entrega deduplicada y revocacion segura.
  - **Peligros si se mantiene como estaba:** preferencias sin efecto o avisos repetidos entre centro, toast y push.
  - **Peligros del cambio:** solicitar permisos demasiado pronto o conservar tokens revocados.
  - [x] Deduplicar centro, toast y push.
  - [x] Registrar push web solo tras permiso explicito.
  - [x] Sincronizar alta, rotacion y revocacion de tokens push.

- [ ] **4. Completar el bloqueo inmediato.**
  - **Descripcion:** retirar la relacion bloqueada de todas las superficies sociales afectadas.
  - **Por que se necesita:** un bloqueo debe detener de inmediato contenido, chat, presencia e interacciones residuales.
  - **Que se espera lograr:** aislamiento coherente en toda la experiencia social.
  - **Peligros si se mantiene como estaba:** contenido o presencia visibles despues de bloquear.
  - **Peligros del cambio:** ocultar datos no afectados por el alcance definido por backend.
  - [x] Aplicar bloqueo inmediato a todas las superficies sociales.

- [ ] **5. Completar audiencias, autoactividad y spoilers del feed.**
  - **Descripcion:** finalizar las reglas sociales que todavia no se representan completamente en el cliente.
  - **Por que se necesita:** feed, actividad automatica y spoilers deben respetar audiencia, consentimiento y progreso lector.
  - **Que se espera lograr:** publicaciones previsibles, privacidad correcta y proteccion consistente de spoilers.
  - **Peligros si se mantiene como estaba:** actividad inesperada, audiencia incompleta o revelado accidental de contenido.
  - **Peligros del cambio:** divergir de las reglas centralizadas en backend.
  - [x] Añadir audiencia publico, seguidores, amigos y club.
  - [x] Usar seguidores como audiencia automatica predeterminada.
  - [x] Explicar una vez cada tipo de autoactividad.
  - [ ] Permitir excluir el evento concreto antes de publicarlo.
  - [ ] Heredar contexto spoiler en comentarios y debates.
  - [ ] Excluir contenido bloqueado, sancionado o fuera de audiencia.

- [ ] **9. Preparar el lanzamiento progresivo.**
  - **Descripcion:** endurecer las superficies restantes y activarlas por fases sin romper la biblioteca existente.
  - **Por que se necesita:** realtime y permisos generan fallos parciales que deben ser recuperables y observables.
  - **Que se espera lograr:** experiencia degradable a REST, activable por fases y operable.
  - **Peligros si se mantiene como estaba:** superficies a medias visibles, fallos silenciosos y despliegues no reversibles.
  - **Peligros del cambio:** flags abandonados o telemetria que no represente la entrega real.
  - [ ] Auditar estados secundarios de cada herramienta interna de clubes y moderacion.
  - [ ] Ocultar superficies mediante flags hasta su minimo util.
  - [ ] Activar sanciones, realtime, notificaciones, feed, chat y clubes por fases.
  - [ ] Completar metricas operativas de entrega y denegaciones de permisos.
  - [ ] Documentar recuperacion y compatibilidad de versiones.

## Interfaces previstas

- Rutas: `/dashboard/community`, `/dashboard/community/users/:id` y `/dashboard/community/clubs/:id`.
- Dominios: moderacion, notificaciones, relaciones, feed, spoilers, chat, clubes y eventos realtime.
- Adaptadores: sesion Firebase, gateway WebSocket, presencia/typing, push web y servicios REST por dominio.
- Los clientes REST y los adaptadores WebSocket pueden tiparse contra los contratos OpenAPI y realtime aceptados.

## Decisiones de producto

- Lectura primero; REST es la fuente de verdad.
- Seguir alimenta el feed y la amistad controla el chat directo.
- Un perfil privado no publica actividad ni puede localizarse; `@alias` exacto solo busca entre perfiles publicos.
- La autoactividad empieza activa en perfiles publicos, avisa por categoria y puede excluirse por evento.
- La audiencia automatica predeterminada son los seguidores.
- Los spoilers estructurados son opcionales y siempre revelables.
- Push web es opcional; no hay correo social.
- Chat v1 no incluye adjuntos ni llamadas.
