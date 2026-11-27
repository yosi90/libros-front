# Petición a los proyectos del ecosistema: la interfaz de la app y del juego habla con iconos, su revisor, el diseñador para todos (kit 1.111) y el versionado común (kit 2026.11.1)

Fecha: 2026-11-27
Solicitante: Plataforma Yosiftware, por decisión del propietario
Destinatarios: todos los proyectos con interfaz. Notificapp, Yosiftadísticas, Fichas 3.5 (Rol y 3.5 Companion), Nodaria, Lorcana, Poke-Voice, Re-Notas, Hotrods, Rasgora, 1d1n, Día a día, p.i.c., la plantilla de proyectos, MCC, Enroque y el frontend de Libros
Afecta a: vuestro `.claude/agents/`, vuestro `AGENTS.md`, las versiones de vuestro código y, si tenéis APK o sois un juego, los textos de vuestras pantallas
Estado: entregada el 2026-11-27, la misma copia en la carpeta de peticiones de cada proyecto

## Contexto

El propietario, el 2026-11-27: «Tiendes a ser muy verboso y a explicar demasiado todo. Poner textos explicando y texto a los iconos. En web tampoco me gusta pero es pasable, pero en juegos y apks, queda prohibido con el siguiente kit del ecosistema y quiero que cada proyecto tenga un agente que solamente se dedique al diseño de interfaces de móvil y de juegos. Su función no es diseñar, que para eso ya tenemos al diseñador, su función será buscar errores como los que te acabo de describir.» Y, después: «el agente diseñador mándaselo a todo el ecosistema también, el de fable 5.2», y «tenemos que poner una convención estándar de versionado para todo el ecosistema».

Está en el kit 1.111 y en el 2026.11.1, el primero numerado por fecha (fuente vigente: `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`):

- el versionado, en `VERSIONADO.md`;
- la regla, en `APK.md` («La interfaz habla con iconos») y en `GODOT.md`;
- el revisor, en `agentes/revisor-de-interfaz.md`;
- el diseñador, en `agentes/disenador.md`;
- las líneas de `BLOQUE_AGENTS.md` y las casillas de `LISTA_DE_COMPROBACION.md`.

## Qué necesitamos

### Si tenéis APK o sois un juego (también un juego solo web)

Fichas 3.5 (Companion), Lorcana, Re-Notas, Hotrods, Rasgora, 1d1n, Día a día, MCC, Enroque y el frontend de Libros. **Obligatorio.**

1. **La regla:**
   - **Fuera:** los textos que explican (ayudas bajo los campos, subtítulos que dicen para qué sirve una pantalla, tutoriales, estados vacíos con instrucciones, avisos que narran lo que ya se ve) y el texto pegado a los iconos. El icono va solo, con su nombre accesible (`contentDescription`, o `tooltip_text` en Godot).
   - **Se quedan:** el aviso «Gratis, por ahora» (Día a día ya no lo lleva), los textos legales, los errores y las confirmaciones en una frase, y el contenido de la persona y del juego. El revisor puede pedir que se les dé estilo.
2. **El revisor de interfaz:** copiad `agentes/revisor-de-interfaz.md` a `.claude/agents/revisor-de-interfaz.md`, rellenad sus huecos (dónde están vuestras pantallas y vuestros textos) y versionadlo. Va con Sonnet. No diseña ni arregla: busca esos errores y devuelve la lista.
3. **Pasadlo una vez en modo `completo`** por todas vuestras pantallas. **Cada ronda del revisor lleva una ronda de arreglos del diseñador** (propietario: «Cada ronda del agente revisor del front que conlleve una ronda de arreglos del agente de diseño»): pasadle el informe entero, él maqueta las pantallas corregidas en un solo encargo, las programáis a partir de su maqueta, con capturas, y el revisor vuelve a pasar.
4. **Desde entonces, pasadlo antes de publicar cada versión** de la APK o del juego, de QA o de producción, sobre lo nuevo desde la última publicada. No publiquéis con hallazgos abiertos, salvo que el propietario acepte uno en concreto.
5. Llevad la línea nueva de `BLOQUE_AGENTS.md` a vuestro `AGENTS.md` y marcad la casilla de la lista (APK).

### Todos los que tenéis interfaz: el diseñador

**Obligatorio desde el kit 1.111.**

1. Copiad `agentes/disenador.md` a `.claude/agents/disenador.md`, rellenad sus huecos y versionadlo. Sigue con Fable 5.2 y con sus dos reglas: **solo diseña** (nunca escribe, revisa ni arregla código) y **solo se le llama para decidir o rehacer un diseño**, en una ronda por encargo.
2. **Si ya lo tenéis** (Rasgora, 1d1n, MCC, Día a día), añadid a vuestra copia lo nuevo de la plantilla: la ronda de arreglos tras cada ronda del revisor de interfaz («Para qué te llaman») y que, en la app y en el juego, la interfaz habla con iconos («Cómo trabajas»).
3. Llevad la línea del diseñador de `BLOQUE_AGENTS.md`, que ya no dice «opcional», a vuestro `AGENTS.md`.

**La plantilla de proyectos:** que los proyectos nuevos nazcan con los dos agentes, el diseñador siempre y el revisor de interfaz si tienen APK o son un juego.

### Todos: el versionado común

**Obligatorio desde el kit 2026.11.1** (`VERSIONADO.md`).

1. **El kit, por fecha:** `AAAA.MM.N` (año, mes y entrega del mes). Detrás de la 1.112 va la `2026.11.1`. Anotad en vuestro contexto qué kit tenéis con el número nuevo. Lo que pide cada entrega lo dice su nota, que empieza por **Obligatorio**, **Recomendado** o **Informativo**.
2. **Vuestro código, con versionado semántico estricto** (`MAYOR.MENOR.ARREGLO`):
   - el MAYOR sube si quien lo usa tiene que cambiar algo; el MENOR, si añadís algo compatible; el ARREGLO, con un arreglo;
   - `0.x` solo antes de producción: si ya estáis en producción con una `0.x`, vuestra próxima versión es la `1.0.0`;
   - la compilación de QA lleva el sufijo `-qa`.
3. **La versión, a la vista:**
   - la salud o el `/verify` de vuestra API dice `"version"`, y el MAYOR del contrato va en la ruta;
   - vuestra web la lleva en `package.json` y la enseña en «Acerca de», los ajustes o el pie;
   - vuestra APK calcula `versionCode = MAYOR × 10000 + MENOR × 100 + ARREGLO` y la enseña en «Acerca de» o los ajustes;
   - un juego de Godot la lleva en `config/version`.
4. Una nota por versión publicada y, recomendado, una etiqueta de Git por cada versión de producción.
5. Llevad la línea del versionado de `BLOQUE_AGENTS.md` a vuestro `AGENTS.md` y marcad su casilla de la lista. No hace falta cambiar nada ya publicado: seguid la norma desde vuestra próxima publicación.

## Comprobaciones previas

La plataforma lo está haciendo en lo suyo:

- **Los agentes:** el revisor y el diseñador, en su `.claude/agents/`.
- **La auditoría completa de la app Yosiftware:** el revisor pasó por todas las pantallas y encontró unos 250 textos de más. El diseñador está haciendo su ronda de arreglos, y saldrá como la app 1.0.0.
- **Las normas:** pasar el revisor antes de cada publicación, con su ronda del diseñador, y subir la versión con cada publicación ya están en `NORMAS_DE_TRABAJO.md`.
- **Sus versiones:**
  - la API, en la 1.0.0, la dice en `/verify`;
  - las webs, en la 1.0.0 de su `package.json`;
  - el SDK (1.33.1), la librería de la sesión (1.12.0) y el addon de Godot (1.2.1) ya seguían la norma.

## Calendario y dependencias

Sin fecha fija, pero las dos normas valen desde ya: **vuestra próxima publicación ya pasa por el revisor de interfaz, si tenéis APK o sois un juego, y ya sigue el versionado**. No cambia nada de la librería, del addon ni del contrato.

## Fuera de alcance

- La web que no es un juego: no está prohibido, aunque al propietario tampoco le gusta. Si queréis, podéis pasarle el revisor.
- Vuestro diseño, que es vuestro y de vuestro diseñador.

## Resolución

<!-- La rellena cada destinatario en su copia. -->
