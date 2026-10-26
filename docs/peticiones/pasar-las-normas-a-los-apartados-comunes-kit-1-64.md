# Petición a los servicios con normas propias: pasarlas a los apartados comunes (kit 1.64)

Fecha: 2026-10-26
Solicitante: Plataforma Yosiftware
Afecta a: los servicios que tienen normas propias publicadas (Rol, Libros, Nodaria, p.i.c., Re-Notas y 1d1n)
Estado: entregada el 2026-10-26, con el kit 1.64 en QA y en producción (`a4e78a3`)

## Contexto

Las normas propias de cada servicio eran un Markdown libre, y cada una tenía sus apartados, en su orden. Decisión del propietario: todas siguen ahora la misma estructura, con unos apartados fijos y siempre en el mismo orden, de los que cada servicio usa los que le tocan. Y cada servicio publica él mismo sus normas, siempre junto con una versión nueva de su web, su API o su app.

Lo que cambia para vosotros:

- **Diez apartados con título fijo**, que pone la plataforma: `objeto`, `requisitos`, `uso`, `contenido`, `comunidades`, `ia`, `datos`, `terceros`, `moderacion` y `responsabilidad`. Siempre van `objeto`, `uso` y `moderacion`; `contenido`, si dejáis publicar, e `ia`, si usáis la IA.
- **La cabecera y el cierre los pone la plataforma**, iguales en todos los servicios: el título, la versión, la fecha, «Qué cambia», la frase que remite a las normas de Yosiftware, «Cambios en estas normas» y «Ley aplicable y contacto». No los escribáis.
- **Nada interno.** Las normas hablan solo a quien usa vuestro servicio. La plataforma rechaza quién las aprobó o redactó, que son un borrador, a petición de quién se hicieron, nombres del equipo o de agentes, notas pendientes, rutas y código.
- **Las publicáis vosotros** con `herramientas/publicar_normas.py` y vuestra credencial de servicio, cuando el propietario os lo encienda.

Fuente vigente del kit: `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\` (versión 1.64). Todo está en `ecosistema-kit/NORMAS.md`, con la plantilla en `plantillas/normas/`. El contrato, en `docs/publica/ENDPOINTS.md` («Publicar las normas desde el propio servicio»), y la guía, en `docs/publica/NORMAS_DE_LOS_SERVICIOS.md`.

## Qué necesitamos

1. **Copiar el kit 1.64.**
2. **Pasar vuestras normas vigentes a los apartados**, en una carpeta de vuestro repositorio (`NORMAS.md`, «Si ya tenías normas»):
   - repartid lo que dicen entre los apartados, sin cambiar el fondo;
   - quitad lo que ya dicen las normas de Yosiftware;
   - `importante: false` si no cambiáis el fondo.
3. **Comprobarlas con la vista previa** en QA y en producción (`publicar_normas.py vista-previa`). Funciona aunque aún no podáis publicar.
4. **Pedir al propietario que os encienda la publicación** en la administración, respondiendo en vuestra copia con la vista previa de producción.
5. **Publicarlas en QA y en producción** con la próxima versión de vuestra web, vuestra API o vuestra app.
6. **Añadir a vuestro `AGENTS.md`** el párrafo nuevo de `BLOQUE_AGENTS.md` sobre las normas.
7. **Responder en vuestra copia** con lo que hagáis, o «No aplica» con su motivo.

## Comprobaciones previas

- La plataforma acepta tal cual el texto de vuestras normas vigentes de producción: ninguna lleva nada interno. Comprobado el 2026-10-26.
- La versión 1 de las normas de Rol en QA sí lleva notas internas («borrador para publicar», «Lo publica el propietario»). Ya no es la vigente, y la 2 está limpia.

| Servicio | Sus apartados de hoy, y dónde caben |
| --- | --- |
| Rol (Fichas 3.5) | «Tus personajes» y «Buscador de partidas», en `uso` y `contenido`; «Campañas» y «Roles», en `comunidades`; «Contenido propio y catálogo», en `contenido` y `terceros`; «Moderación», en `moderacion`. «Cambios en las normas» lo pone ya la plataforma. |
| Libros (API y frontend) | «Aporta contenido propio y respetuoso» y «Reseñas y puntuaciones», en `uso` y `contenido`; «El catálogo», en `contenido` y `terceros`; «Clubes de lectura», en `comunidades`; «Derechos sobre tus aportaciones», en `contenido`; «Revisión y retirada», en `moderacion`. |
| Nodaria | «Proyectos públicos», en `contenido` y `uso`; «Si alguien incumple estas normas», en `moderacion`. Le falta `objeto`. |
| p.i.c. | «Qué puedes publicar» y «Qué no puedes publicar», en `contenido` y `uso`; «Si algo incumple las normas», en `moderacion`. Le falta `objeto`. Si genera con IA para la persona, `ia`. |
| Re-Notas | «Graba solo a la vista», «Nunca a escondidas» y «Úsalo para lo que es», en `uso`; «Órdenes a Reno» y «Los resultados de Reno pueden equivocarse», en `ia`; «Tu responsabilidad y la nuestra», en `responsabilidad`; «Si no se cumplen», en `moderacion`. |
| 1d1n | «Juega tú, y juega limpio» y «No destripes el del día», en `uso`; «Lo que se guarda de tus partidas», en `datos`; «La revisión de los resueltos» y «Si se incumplen estas normas», en `moderacion`. |

## Calendario y dependencias

Sin fecha: con vuestra próxima versión. Mientras tanto, vuestras normas vigentes siguen valiendo tal cual.

## Fuera de alcance

- Cambiar lo que piden vuestras normas: eso es cosa vuestra y, si es importante, de una versión importante.
- Las normas comunes de Yosiftware y la política de privacidad, que son de la plataforma.

## Resolución

### Libros: hecho (2026-10-26)

Aceptada.

1. **El kit 1.64**, copiado en los dos repositorios (la API y el frontend).
2. **Las normas, por apartados**, en la carpeta `normas/` de la API. Siguen el reparto de la tabla:
   - `objeto` es nuevo: qué es Libros, con la frase de a qué se aplican las normas.
   - `uso`: reseñar lo leído, los spoilers y los datos honestos del catálogo.
   - `contenido`: el catálogo común, lo que se puede subir y los derechos sobre lo que se aporta.
   - `comunidades`: los clubes.
   - `terceros`: las portadas y los derechos sobre los libros.
   - `moderacion`: la revisión y la retirada, con el enlace para alegar.

   Sale el párrafo de insultos, acoso, spam y material ilegal, porque ya lo dicen las normas de Yosiftware. El fondo no cambia, así que `importante: false`.
3. **Un apartado nuevo, `ia`**, porque Libros ya usa la IA. Completa sinopsis y páginas del catálogo, con su clave y a su cargo. El apartado dice que esos datos pueden tener errores y cómo corregirlos. Lo dice también `cambios`.
4. **La vista previa**, en QA y en producción: versión 2. Solo avisa de «petición», que en Libros son las peticiones al catálogo.
5. **El `AGENTS.md`** de los dos repositorios lleva el párrafo nuevo de `BLOQUE_AGENTS.md`.

6. **Publicadas** en QA y en producción el 26 de octubre, como versión 2 (`importante: false`) con la API `2026.10.26`, una vez el propietario encendió la publicación. En producción, `GET /v1/webs/libros/normas` da la versión 2 con sus siete apartados.
