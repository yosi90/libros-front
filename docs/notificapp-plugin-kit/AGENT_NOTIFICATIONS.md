# Avisos de Codex y Claude desde cualquier proyecto

Esta guía sirve tanto para el agente que trabaja en la **API** como para el que trabaja en el **frontend web**. Al copiar la carpeta, añade `/plugin-kit/` al `.gitignore` raíz de ese proyecto: el cliente `agent_notify.py` se usa desde la copia local, sin versionar el kit. Sus avisos van al espacio «Agentes» de Notificapp. No usan el ZIP, el token ni las rutas del plugin de proyecto. En una API pueden coexistir las dos integraciones: la API publica solicitudes nuevas mediante su plugin y su Codex o Claude publica sus propias respuestas y preguntas como agente. El frontend web solo necesita esta vía de agente.

## Credencial del equipo

El propietario registra y configura **un emisor de agentes por equipo**, no uno por repositorio. Dos agentes que trabajan en proyectos distintos del mismo equipo pueden usar la misma credencial privada; si trabajan en equipos distintos, cada equipo necesita la suya. El propietario puede crear un emisor nuevo en el servidor de Notificapp con `python -m notificapp.agent_cli add <id-del-equipo> <nombre>`. Si ya existe uno para ese equipo, se reutiliza. El cliente necesita la ruta de un archivo privado que contenga solo el token mediante `NOTIFICAPP_AGENT_TOKEN_FILE` o `--token-file`.

No copies el token al repositorio, al `AGENTS.md`, al ZIP ni a la respuesta del agente. **Copiar esta carpeta no conecta por sí solo al agente**: falta la configuración privada del equipo. Pide al propietario que confirme si ese equipo ya tiene emisor antes de crear otro.

## Qué enviar

| `kind` | Cuándo | Título por defecto |
| --- | --- | --- |
| `agent_finished` | Al terminar una respuesta | `Codex ha finalizado` o `Claude ha finalizado` |
| `agent_question` | Antes de dejar una pregunta esperando respuesta | `Codex necesita tu respuesta` o `Claude necesita tu respuesta` |

El campo `agent` es `Codex` o `Claude` y aparece como etiqueta independiente en la APK. El agente puede elegir con `--title` **cualquier cabecera de 1 a 200 caracteres** que identifique proyecto y situación: `Codex ha finalizado en Libros`, `Codex te pregunta por la API de Fichas` o `Claude ha terminado en el frontend de Canarias Mu`. El `body` sigue siendo el texto **completo y exacto** de la respuesta final o de la pregunta, sin resumirlo para la notificación.

El cliente [agent_notify.py](agent_notify.py) incluido en esta carpeta envía el aviso y guarda en `~/.notificapp/pending-agent/` los fallos de red o servidor para reintento. Ejemplos desde la raíz del proyecto que copió esta carpeta:

```powershell
python plugin-kit/agent_notify.py --kind agent_question --body-file ruta\pregunta.txt --agent Codex --title "Codex te pregunta por la API de Fichas"
python plugin-kit/agent_notify.py --kind agent_finished --body-file ruta\respuesta-final.txt --agent Claude --title "Claude ha terminado en el frontend de Libros"
python plugin-kit/agent_notify.py --drain
```

Puedes pasar `--token-file <ruta-privada>` si no usas la variable de entorno. El cuerpo procede de un archivo UTF-8. Si reintentas manualmente el mismo hecho, reutiliza `--external-id <id-estable>` para evitar duplicados. Una respuesta HTTP 4xx indica configuración o autorización incorrecta y no se deja en cola.

## Hooks y preguntas

En clientes Codex que ejecuten `notify`, puede configurarse en el archivo **de usuario/equipo** `~/.codex/config.toml`, con una ruta absoluta al script copiado:

```toml
notify = ["python", "<ruta-absoluta>/plugin-kit/agent_notify.py", "--codex-notify"]
```

El hook recibe el texto final y, si está presente, `cwd`; cuando no se fija `--title`, el cliente forma `Codex ha finalizado en <carpeta del proyecto>`. Un aviso explícito puede elegir una cabecera más precisa. La [documentación oficial de Codex](https://learn.chatgpt.com/docs/config-file/config-advanced#notifications) solo declara `agent-turn-complete` para `notify` y advierte que `notify` en la configuración local de un proyecto se ignora: **no garantiza avisos automáticos de preguntas**. Para estas, el agente debe enviar `agent_question` antes de esperar respuesta, salvo que su cliente tenga otro hook probado. Para cada cliente, usa un único mecanismo de cierre: si su hook está configurado y comprobado, deja que publique él solo la respuesta final; usa el envío manual únicamente cuando no haya hook operativo. El hook se ejecuta después de la respuesta final, por lo que enviar antes un aviso manual junto a un hook activo crea duplicados.

El cliente local del repositorio de Notificapp ofrece el mismo `--title` con `python -m notificapp.sender --body-file <archivo> --kind agent_finished|agent_question`. Su credencial se carga de una configuración privada diferente de la de este cliente copiable.

Un aviso `agent_question` indica que hay que volver a la conversación del agente. **Responder desde la APK para reanudar esa sesión todavía no está implementado.** Un panel de plugin de proyecto sí puede responder a solicitudes de su API cuando esa API exponga la acción correspondiente.
