# Integrar un proyecto con Notificapp

Copia **esta carpeta completa** en la raíz del proyecto y añade inmediatamente `/plugin-kit/` a su `.gitignore`. El kit copiado es material de referencia y herramientas locales; no debe entrar en Git. Si el proyecto crea un plugin, guarda **su manifiesto y su interfaz propios** en una carpeta versionada fuera de `plugin-kit/`, como `notificapp-plugin/`. Hay dos integraciones independientes que pueden convivir en la misma API:

```gitignore
/plugin-kit/
```

Comprueba el resultado con `git check-ignore -v plugin-kit/README.md`. Si el kit ya estaba versionado antes de añadir la regla, el agente debe retirarlo del índice **sin borrar la copia local**. No ignores `notificapp-plugin/`: ese código propio sí debe quedar en Git.

| Quién trabaja | Qué envía a Notificapp | Guía |
| --- | --- | --- |
| API del proyecto | Nuevas solicitudes confirmadas y un panel propio dentro de la APK para consultarlas o responderlas | [PROJECT_PLUGIN.md](PROJECT_PLUGIN.md) |
| Codex o Claude en la API | Su respuesta final o una pregunta al propietario | [AGENT_NOTIFICATIONS.md](AGENT_NOTIFICATIONS.md) |
| Codex o Claude en el frontend web | Su respuesta final o una pregunta al propietario | [AGENT_NOTIFICATIONS.md](AGENT_NOTIFICATIONS.md) |

El **plugin de proyecto** es responsabilidad de la API que guarda las solicitudes. Incluye un `manifest.json` y un `ui/index.html` autocontenido para la APK; no se añade al frontend web. Si el panel necesita consultar o contestar solicitudes, esa API implementa las rutas declaradas por el plugin. La API publica el aviso cuando la solicitud ya quedó confirmada. El frontend web sigue hablando con su propia API y no publica un segundo aviso de la misma solicitud.

Los **avisos de agente** son otra vía. El Codex de la API necesita ambos recorridos: crear el plugin para las solicitudes **y** configurar sus propios avisos de fin de turno y pregunta. El Codex del frontend web solo necesita la vía de agente. La credencial de agente pertenece al equipo donde corre, nunca al ZIP ni a la credencial del plugin. Copiar esta carpeta no concede acceso por sí mismo: el propietario debe configurar esa credencial en un archivo privado del equipo.

Para añadir instrucciones a cada repositorio, copia el bloque correspondiente de [AGENTS_SNIPPET.md](AGENTS_SNIPPET.md) a su `AGENTS.md`. Los avisos de agente admiten `--title` para elegir una cabecera como `Codex ha finalizado en Libros` o `Claude pregunta por el frontend de Fichas`; el cuerpo conserva la respuesta o pregunta íntegra.

El primer ZIP de un plugin se entrega para revisión local. Libros ya tiene panel instalado; Fichas existe sin panel y su primera versión se integra como actualización de su identidad actual. Las actualizaciones remotas solo se habilitan después de aprobar el primer paquete. La guía del plugin explica cómo el propietario activa el permiso en la APK, dónde obtiene el agente la credencial privada y cómo publica la siguiente versión.
