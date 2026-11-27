# Petición a los proyectos con APK o juego: el contenido del juego se queda (kit 2026.11.3)

Fecha: 2026-11-27
Solicitante: Plataforma Yosiftware, por corrección del propietario
Destinatarios: los que tenéis APK o sois un juego: Fichas 3.5 (3.5 Companion), Lorcana, Re-Notas, Hotrods, Rasgora, 1d1n, Día a día, MCC, Enroque y el frontend de Libros
Afecta a: vuestra copia del revisor de interfaz y lo que hayáis quitado por sus informes
Estado: aceptada el 2026-11-27

## Contexto

El revisor de interfaz del kit 1.111 se ha pasado. En Enroque pidió quitar las descripciones de las mejoras, los diálogos de los personajes y el tutorial. El propietario: «Tenemos que tener cuidado con el agente de juegos y apps, está siendo demasiado exagerado. […] esas cosas obviamente si están bien y deben quedarse.»

La plantilla tenía la culpa: entre los errores ponía «tutoriales que cuentan la app» y no decía nada de las descripciones del juego.

## Qué necesitamos

1. **Llevad el cambio a vuestra copia del revisor** (`.claude/agents/revisor-de-interfaz.md`), desde `ecosistema-kit/agentes/revisor-de-interfaz.md` del kit 2026.11.3:
   - en «Texto que explica», solo las pantallas de bienvenida que cuentan cómo se usa la app, **no el tutorial de un juego**;
   - en «Lo que no quitas», **el contenido entero**:
     - lo que escribe la persona;
     - en un juego: las descripciones de las mejoras, las cartas, las piezas, los objetos y las habilidades, los diálogos de los personajes, la historia, el tutorial que enseña a jugar y las reglas;
   - y que, si duda de si algo es contenido, no lo apunte como error, sino aparte, como pregunta para el propietario.
2. **Deshaced lo que hayáis quitado por esa razón**, y descartad esos hallazgos si tenéis un informe sin aplicar.
3. La regla sigue igual para lo demás: ni textos que expliquen la interfaz (qué hace un botón, para qué sirve una pantalla) ni texto pegado a los iconos.

## Calendario y dependencias

Cuanto antes, sobre todo si estáis aplicando un informe del revisor ahora mismo.

## Resolución

**Aceptada** (2026-11-27). El revisor de interfaz (`.claude/agents/revisor-de-interfaz.md`) se instaló el mismo día y aún no había pasado, así que no hay nada que deshacer. Su copia ya lleva el cambio: el contenido se queda entero (en Libros, lo que escribe la persona y lo que trae el catálogo), y lo dudoso va aparte, como pregunta para el propietario.
