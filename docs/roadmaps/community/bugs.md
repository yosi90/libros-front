# Comunidad - Bugs y mejoras acotadas

## Pendiente

- [ ] **Club borrado: avisar del plazo de 30 días.** La API (`5e4dbf0`) borra un club entero a los 30 días de borrarlo y responde `RestaurableHasta` en el `DELETE`; pasado el plazo, restaurar da `409 club_restore_expired`. La web (Web, Wood y Mobile) aún dice «El histórico y los miembros se conservan…», y la APK, lo suyo: hay que decir hasta cuándo se puede restaurar.

## Finalizado

Lo cerrado de las normas, la moderación, el tiempo real (WebSocket y Firebase), los perfiles, las relaciones y los grupos propios se retiró con la adhesión: son de la plataforma. Su historial está en Git.

- [x] Normas pendientes (decisión del propietario, 6/10/2026, tras no ver el único aviso de una versión nueva): el aviso no sale una sola vez, sino al entrar y como mucho una vez por pantalla bloqueada. Hoy las normas las enseña el SDK de la plataforma.
- [x] La restauración inicial de las ventanas de chat no se guarda como un cambio de la persona; los guardados reales reconcilian los conflictos de versión `409`.
- [x] Clubes: el navegador sigue el patrón editorial de Preferencias; Descubrir solo busca por nombre y destaca la creación; las pestañas y acciones deshabilitadas explican con tooltip qué las bloquea.
- [x] Clubes previene en local dos reglas del contrato: no se crea un club sin libros ni antologías en la colección, y una lectura de club de tipo libro solo admite obras de la biblioteca personal. El backend conserva la validación definitiva.
- [x] Sin cabeceras globales ni botones de recarga en Resumen, Comunidad y Clubes; los controles internos se conservan.
- [x] El acceso principal del chat abre `Comunidad › Mensajes`; la bandeja ofrece abrir el listado en ventana solo si aún no está abierto.
