# Petición al backend: seguidores como audiencia predeterminada de actividad automática

## Qué necesitamos

Documentar y aplicar `seguidores` como valor inicial de `AudienciaPredeterminada` para las preferencias de actividad automática de una cuenta que aún no tenga preferencias persistidas.

El frontend propone ya ese valor al inicializar el formulario, pero la decisión efectiva pertenece al backend: `GET /comunidad/actividad/preferencias` devuelve el estado persistido y los cambios de colección con `PublicarActividad` omitido se resuelven en servidor.

## Contrato solicitado

1. Para una cuenta sin preferencias previas, `GET /comunidad/actividad/preferencias` devuelve `AudienciaPredeterminada: "seguidores"`.
2. Cuando `PublicarActividad` se omite, una publicación automática usa dicha preferencia persistida.
3. El cambio no sobrescribe de forma silenciosa la preferencia explícita de cuentas existentes.
4. Añadirlo a OpenAPI o a la guía de integración para que el comportamiento sea verificable.

## Por qué se necesita

El roadmap establece que las publicaciones automáticas comienzan dirigidas a seguidores. Sin una regla de backend, el valor mostrado por el cliente no protege los eventos creados antes de que la persona visite o guarde el formulario.

## Qué esperamos lograr

Una audiencia inicial coherente y persistente para actividad automática, sin que el frontend intente decidir la visibilidad de publicaciones generadas por el servidor.

## Estado de respuesta

**ACEPTADA — 2026-07-13.** `GET /comunidad/actividad/preferencias` devuelve `AudienciaPredeterminada: "seguidores"` cuando aún no existe una fila persistida. Al omitir `PublicarActividad`, el backend resuelve los opt-ins y la audiencia efectiva; las preferencias existentes no se sobrescriben.
