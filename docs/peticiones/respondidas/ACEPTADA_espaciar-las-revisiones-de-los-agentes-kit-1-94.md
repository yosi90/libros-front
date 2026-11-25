# Petición de la plataforma Yosiftware: espaciar las revisiones de los agentes (kit 1.94)

Fecha: 2026-11-13
Solicitante: la plataforma Yosiftware (`administracion yosiftware`), por decisión del propietario
Afecta a: vuestro `AGENTS.md`, vuestras normas de trabajo y vuestros dos revisores (`.claude/agents/revisor-de-documentacion.md` y `.claude/agents/revisor-de-duplicados.md`)
Estado: entregada el 2026-11-13. **Obligatoria.**

## Contexto

El propietario ha decidido que los dos revisores se lancen menos (2026-11-13): «Hay que limitar la revisión de la documentación a una vez al día. Hecha cuando hable con el agente por primera vez ese día. Y las revisiones del agente de duplicados que se hagan una vez cada 3 cambios al código, en lugar de siempre».

- **La de documentación, una vez al día:** al cerrar la primera respuesta del día, y solo si algo ha cambiado desde la última. Sustituye a «cada 10 respuestas» (kit 1.91).
- **La de duplicados, cada 3 cambios al código:** en modo `corregir`, solo sobre lo nuevo. Un cambio al código es un commit que toca algo que no es documentación (ni `.md` ni `docs/`). Sustituye a «al unir cada rama y antes de cerrar un trabajo en paralelo» (kit 1.51).

Las dos las pide el mismo contador del kit, `herramientas/revision_de_documentacion.py`, que ya llama vuestro gancho `Stop`.

## Qué os pedimos

1. **Copiad el kit 1.94** desde la fuente vigente (`C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit`, rama `main`). **No toquéis vuestro `.claude/settings.json`:** el gancho es el mismo.
2. **Poned al día los dos bloques** de `ecosistema-kit/BLOQUE_AGENTS.md` en vuestro `AGENTS.md`: el del revisor de duplicados y el del de documentación.
3. **Poned al día vuestras normas de trabajo** donde digan cuándo se lanza cada revisor («cada 10 respuestas», «al unir cada rama», «antes de cerrar»).
4. **Poned al día vuestros dos agentes:**
   - en los dos, la `description`;
   - en el de documentación, el título del modo `continuo`;
   - en el de duplicados, «El alcance», en «Qué te piden».

   Están en las plantillas del kit (`agentes/`).
5. **Si os trabaja Codex:** sigue ejecutando `… contar` al cerrar cada respuesta. Ahora puede responder «TOCA» por cualquiera de las dos revisiones; lanzad la que diga. Al terminar la de duplicados, `… hecha --duplicados`.
6. **Comprobad** con `py -3 ecosistema-kit/herramientas/revision_de_documentacion.py estado`: dice el día de la última revisión de documentación y cuántos cambios al código lleváis desde la última de duplicados.
7. **Respondednos** en `C:\Users\Yosi\Desktop\administracion yosiftware\docs\peticiones\` con la revisión en la que lo pusisteis.

## Lo que no hace falta

- Volver a lanzar las auditorías completas: siguen siendo una vez, al instalar cada revisor.
- Tocar el `.gitignore` ni el gancho.

## Para la plantilla de proyectos

Lo mismo en la propia plantilla, para que todo proyecto nuevo nazca así.

## Resolución

**Aceptada** (2026-11-25), con el kit 1.107 (`e9f0a9d`); en el frontend, `9bae7418`, y en la API, `9229973`.

- Los dos bloques de `BLOQUE_AGENTS.md` están en `AGENTS.md`.
- En el revisor de duplicados, la `description` y «El alcance»; el revisor de documentación ya nació con la plantilla del 1.94.
- Las normas de trabajo no decían cuándo se lanzaba cada revisor: no había nada más que cambiar.
- `… estado` dice el día de la última revisión de documentación y los cambios al código desde la de duplicados.
