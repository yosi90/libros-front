# Petición de la plataforma Yosiftware: montar el revisor de documentación (kit 1.91)

Fecha: 2026-11-12
Solicitante: la plataforma Yosiftware (`administracion yosiftware`), por decisión del propietario
Afecta a: la documentación viva de cada proyecto (`AGENTS.md`, normas, contexto, `README`, roadmap activo), su `.claude/` y su forma de trabajar con agentes
Estado: entregada el 2026-11-12. **Obligatoria.**

## Contexto

El propietario lo explica así: «las normas de trabajo y las documentaciones se vuelven textos infinitos que atesoran conocimiento muchas veces inútil». Por ejemplo, «se hicieron cambios en la interfaz y ya no hace falta el botón de borrar texto»: ayuda unos días y, a la larga, solo molesta.

Quiere mantener documentado todo el contexto posible del proyecto, sin guardar más tiempo del necesario lo que solo sirvió a corto plazo.

El kit 1.91 trae un agente que se encarga de eso:

- **la plantilla**, `ecosistema-kit/agentes/revisor-de-documentacion.md`;
- **su contador**, `ecosistema-kit/herramientas/revision_de_documentacion.py`;
- **un bloque obligatorio** para vuestro `AGENTS.md`, en `ecosistema-kit/BLOQUE_AGENTS.md`.

La plataforma ya lo tiene montado.

## Decisiones del propietario

- **Es obligatorio** para todos los proyectos del ecosistema.
- **Auditoría completa al adoptarlo**, en su propia rama.
- **Revisión continua cada 10 respuestas** de vuestros agentes, solo sobre lo nuevo.
- **Lo caducado se borra** o se condensa en el estado actual. No se archiva, porque Git guarda el historial.
- **El revisor aplica los cambios él mismo** y deja lo dudoso como propuesta.

## Qué os pedimos

1. **Copiad el kit 1.91** desde la fuente vigente (`C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit`, rama `main`).
2. **Montad el revisor** como dice `ecosistema-kit/README.md`, «Cómo se usa», punto 4:
   - la copia rellenada en `.claude/agents/revisor-de-documentacion.md`, versionada;
   - el gancho `Stop` del contador en `.claude/settings.json`, versionado. Si ya tenéis ese archivo, unidlo con lo que tenga;
   - el bloque nuevo de `BLOQUE_AGENTS.md` en vuestro `AGENTS.md`.
3. **Si os trabaja Codex:** el bloque le dice que ejecute `py -3 ecosistema-kit/herramientas/revision_de_documentacion.py contar` al cerrar cada respuesta y que, si responde «TOCA», lance la revisión antes de responder. Codex no tiene un gancho de proyecto que lo haga por él.
4. **Lanzad la auditoría completa** en la rama `revision-de-documentacion/completa`. Revisad lo que haya quitado, unidla y ejecutad `… hecha --completa`. Anotad en vuestro contexto la fecha, la revisión y el veredicto.
5. **Respondednos** en `C:\Users\Yosi\Desktop\administracion yosiftware\docs\peticiones\`, con:
   - la revisión en la que lo montasteis;
   - el tamaño de vuestra documentación antes y después;
   - lo que el revisor dejó como propuesta, si algo os parece que la plantilla debería cambiar para todos.

## Lo que no hace falta

- Tocar el código: el revisor no lo toca. Eso es del revisor de duplicados.
- Rehacer las peticiones, los roadmaps finalizados ni los textos legales: son registros y quedan fuera.
- Tocar el `.gitignore`: el contador guarda su cuenta en vuestra carpeta `.git/`.

## Para la plantilla de proyectos

Montadlo en la propia plantilla, para que todo proyecto nuevo nazca con él:

- el agente;
- el gancho;
- el bloque;
- en sus instrucciones de arranque, la auditoría completa en cuanto haya documentación.

## Resolución

**Aceptada** (2026-11-25). Montado en `9bae7418` del frontend, con el kit 1.107 (`e9f0a9d`).

- El agente, en `.claude/agents/revisor-de-documentacion.md`; el gancho `Stop`, en `.claude/settings.json` (lo escribió el agente sin problema); y el bloque nuevo, en `AGENTS.md`.
- La auditoría completa se hizo en la rama `revision-de-documentacion/completa`, se unió en `a9936a9d` y se anotó con `hecha --completa`. La documentación viva pasó de unos 455 kB a unos 245 kB. Veredicto: «Quedan propuestas», todas propias del proyecto. Están en `docs/codex/PROJECT_WORKING_NOTES.md`, «Revisores del kit».
