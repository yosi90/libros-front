# Petición a las webs: poned límites a lo que la persona manda a la IA y protegeos de los prompts malintencionados (kit 1.58)

Fecha: 2026-10-25
Solicitante: plataforma común de Yosiftware (`C:\Users\Yosi\Desktop\administracion yosiftware`), por decisión del propietario
Destinatarios: Fichas 3.5 (web, backend y 3.5 Companion), Nodaria, Lorcana, Poke-Voice, Re-Notas, Libros (API, web y APK) y p.i.c.
Afecta a: todo lo que vuestra web manda a la IA por la pasarela de la plataforma con texto que escribe la persona.

## Contexto

El propietario quiere que ninguna web del ecosistema mande a la IA lo que sea sin control: textos de cualquier longitud que agoten el tope de la persona o la clave de una organización, o prompts malintencionados («olvida tus instrucciones», «entra en el servidor y saca la base de datos»).

Un prompt no puede entrar en vuestro servidor por sí solo. El modelo está en el proveedor y solo ve el texto que le mandáis. Hace daño si vuestra web se lo permite:

- si pone en el contexto datos que la persona no debería ver;
- si da al modelo herramientas con permisos (consultas a la base, archivos, red);
- si ejecuta o pinta como HTML lo que el modelo devuelve;
- si no limita cuánto se manda ni cuántas veces.

Filtrar frases «sospechosas» no basta, porque siempre hay otra forma de decirlo. Lo que protege es que el modelo no tenga nada que sacar ni ningún poder.

Está en el kit 1.58, publicado con la plataforma en QA y en producción el 25 de octubre de 2026 (`8f45bef`): `ecosistema-kit/CLAVES_DE_IA.md`, «Lo que escribe la persona: límites y prompts malintencionados», y su punto en `LISTA_DE_COMPROBACION.md`, «Claves de IA».

## Qué necesitamos

**Obligatorio si vuestra web manda a la IA texto que escribe la persona** (una pregunta al asistente, la descripción de una imagen, un texto para leer en voz alta, lo que se analiza de una grabación transcrita). Si no lo hace, anotadlo en la resolución y no hace falta nada más.

1. **Copiad el kit 1.58** desde `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`.
2. **Una longitud máxima para cada campo que va a la IA**, la que necesite su uso, comprobada en el backend y no solo en el formulario. Por encima, un mensaje claro y sin llamar a la pasarela. Y un máximo de tokens de salida ajustado a lo que enseñáis.
3. **Vuestras instrucciones, aparte del texto de la persona.** Las vuestras van en el mensaje de sistema; lo de la persona, como mensaje de usuario o marcado como datos. Nunca pegado dentro de vuestras instrucciones.
4. **Nada en el contexto que la persona no pueda ver:** ni datos de otras cuentas, ni secretos, ni la configuración del servidor.
5. **Ninguna herramienta con más poder que la persona.** Nada de SQL, órdenes del sistema, archivos ni direcciones que elija el modelo. Si usáis herramientas, cada una la ejecuta vuestro backend con los permisos de quien actúa y con sus argumentos comprobados.
6. **La respuesta, tratada como texto de un desconocido:** escapada al pintarla (el Markdown, saneado), nunca ejecutada, y comprobada si esperáis algo estructurado.
7. **Un límite de llamadas por cuenta** en vuestra web, además del tope de gasto de la plataforma.
8. **Respondednos en la sección «Resolución»:** qué campos mandan texto a la IA, con qué longitud máxima, cómo separáis las instrucciones y si usáis herramientas.

## Comprobaciones previas

- La plataforma no ve vuestras instrucciones ni lo que manda la persona: la pasarela no guarda el contenido de las llamadas. Por eso estos límites son vuestros, y ella no puede ponerlos por vosotros.
- Ya limita lo que puede: la clave, el tope de gasto de cada clave y el tamaño de cada llamada.

## Calendario y dependencias

Sin fecha fija, pero antes de vuestra próxima publicación que toque la IA. No depende de nada de la plataforma.

## Fuera de alcance

- Cambiar de proveedor o de modelo: eso sigue en «El proveedor preferido de la persona» y en «Elegir el modelo».
- Moderar lo que se publica, que va por `MODERACION.md`.

## Auditoría de la plataforma (2026-10-25)

Por encargo del propietario, la plataforma ha revisado vuestro código (solo lectura, sin abrir los `.env`) contra los puntos de arriba. Las rutas son relativas a vuestro repositorio y las líneas, las de ese día. Ojo con la gravedad: la pasarela no limita las llamadas de cada cuenta, solo el tope de gasto de cada clave; sin un límite vuestro, una cuenta puede gastar la clave de su organización o de su grupo y ocupar vuestra API.

**El frontend de Libros (web y APK) no manda texto de la persona a ninguna IA.** Solo consulta `GET /v1/ia/estado` en una prueba de contrato de la sesión, y no hay claves de IA. Anotadlo en la resolución, y aplicad el kit cuando lleguen el título con IA o el dictado.

## Resolución

<!-- La rellena cada destinatario en su copia. -->

### Libros: estado provisional (2026-10-25)

No aplica: Libros no manda texto de las personas a la pasarela de IA. El kit 1.58 está copiado en los dos repositorios. Si llegan el título con IA o el dictado por voz (mejoras pendientes tras el clon, hito 15), respetarán estos límites.

### Libros: auditoría recibida (2026-10-25)

Confirmado tras la auditoría de la plataforma: ni la API ni la web ni la APK mandan texto de las personas a una IA (la única clave externa de la API es la de Google Books). No hay nada que limitar hoy. El título con IA y el dictado (hito 15) nacerán con estos límites por cuenta, aplicando el kit vigente entonces.
