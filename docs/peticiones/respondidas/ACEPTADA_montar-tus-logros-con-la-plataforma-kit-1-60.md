# Petición a las webs con logros: montarlos con la plataforma (kit 1.60)

Fecha: 2026-10-25
Solicitante: plataforma común de Yosiftware (`C:\Users\Yosi\Desktop\administracion yosiftware`), por decisión del propietario
Destinatarios: Poke-Voice, Libros (la API y el frontend), Fichas 3.5 y 1d1m
Afecta a: los logros, trofeos e insignias de cada web, y su aviso

## Contexto

La plataforma tiene ya un sistema de **logros** común para todo el ecosistema (kit 1.60, `ecosistema-kit/LOGROS.md`; referencia en `docs/publica/LOGROS.md` y en «Logros» de `ENDPOINTS.md`).

El backend de cada web declara su catálogo y concede los logros con su credencial de servicio. La plataforma:

- los enseña en «Tu cuenta › Logros» (en la web social y en la app Yosiftware), en el perfil público, con sus trofeos y sus insignias, y en tu web (`GET /v1/logros`);
- avisa al conseguirlos: una notificación con el icono de tu web y, en tu web, el aviso de la campana;
- calcula la rareza («Lo tiene el 3 %»).

Los requisitos, las recompensas, las «runs» y las clasificaciones siguen siendo de cada web.

El propietario quiere que las webs que pueden tener logros los monten con este sistema: «mándales peticiones a libros y fichas para que monten los suyos propios, que son webs que pueden nutrirse también de este sistema». Antes, al pedir el sistema: «tiene cosas que seguro le vendrán bien a poke-voice si las modelamos nosotros».

El modelo se hizo después de revisar los logros de Poke-Voice, para que les sirva sin quitarles nada:

- cuatro niveles, cada uno con el nombre que le ponga la web;
- grupos;
- visibilidad pública, con pista o secreta;
- fechas pasadas, para pasar los que ya tiene cada cuenta;
- el aviso del SDK, que se puede apagar si la web tiene el suyo.

## Qué necesitamos

Lo común, para todas:

1. **El catálogo**, declarado entero desde el backend al arrancar (`PUT /v1/servicio/logros`), con claves estables. Opcional: la imagen cuadrada de cada logro.
2. **Conceder** desde el backend cuando se cumple un logro (`PUT /v1/servicio/logros/{clave}/cuentas/{idCuenta}`), y llevar el **progreso** de los que tienen meta (`…/progreso`). Nunca desde el navegador.
3. **El aviso:** si tu web tiene el suyo, declara `avisoEnLaWeb: false` y enséñalo cuando la concesión responda `nuevo: true`. Si no, deja que lo enseñe la campana.
4. **Enlazar** a «Tu cuenta › Logros» de la web social (`?vista=logros`) desde donde enseñes los logros.
5. **Respondednos en la sección «Resolución»:** qué aceptáis, qué no y cuándo.

### Poke-Voice

- **Pasar los suyos a la plataforma, sin perder nada:**
  - el catálogo con sus grupos (la Pokédex, PokeDiscover y cada modo de juego);
  - sus niveles: `"niveles": { "bronce": "Pokéball", "plata": "Superball", "oro": "Ultraball", "platino": "Master Ball" }`;
  - la visibilidad de cada uno.
- **Migrar los que ya tiene cada cuenta**, con la fecha de la primera vez (`{ "conseguido": "<fecha ISO con zona>" }`): con una fecha de hace más de un día no se avisa. Cada web cambia hasta 300 logros por cuenta y día, así que caben todos de una vez.
- **Su aviso propio**, con la estética del juego, se queda: `avisoEnLaWeb: false`.
- **Lo que sigue siendo suyo:** las runs, los requisitos combinados (`RequirementExpressionV1`) y las recompensas. La plataforma guarda que se consiguió y cuándo. La run y el modo en que se consiguió siguen en su guardado.
- **Dejar de guardarlos en dos sitios:** `pokevoice-achievements-v1` y el guardado en la nube, en lo que toca a los logros conseguidos.

### Libros (API y frontend)

- **Montar sus logros.** Libros no tiene, y es una web que puede nutrirse de ellos. Algunas ideas, que deciden ellos:
  - leer el primer libro, 10, 50 o 100 libros;
  - la primera reseña;
  - leer libros de 10 autores distintos;
  - terminar una saga;
  - un año seguido leyendo cada mes.
- **Los grupos**, si les sirven: por ejemplo, lectura, reseñas y clubes.
- **La APK Kotlin** ve los logros en la app Yosiftware. Si quiere enseñarlos en la suya, con `GET /v1/logros` y el token de la plataforma.

### Fichas 3.5 (backend y web)

- **Montar sus logros.** Fichas no tiene, y es una web que puede nutrirse de ellos. Algunas ideas, que deciden ellos:
  - el primer personaje;
  - un personaje de cada clase;
  - llegar a nivel 10 o 20;
  - la primera partida en un espacio (campaña);
  - el primer retrato encargado a p.i.c.
- **3.5 Companion** los ve en la app Yosiftware o, si quiere, con `GET /v1/logros`.

### 1d1m

- **Usarlos desde el principio**, como dice su roadmap de creación (propuesta 10). Algunas ideas:
  - el primer resuelto;
  - sin errores;
  - rachas de 7, 30 y 365 días;
  - 100 resueltos;
  - el especial del mes.
- **Las rachas y los resueltos** llevan progreso. **Las clasificaciones** siguen siendo de 1d1m.
- **Un resuelto que resulte trampa**, al revisarlo: se le quita el logro (`DELETE …/cuentas/{idCuenta}`), con su aviso.

## Comprobaciones previas

- La plataforma lo ha probado de extremo a extremo con su web de pruebas, que declara un catálogo, concede y lleva el progreso (`webs/pruebas/e2e/logros.spec.ts`). Comprobado:
  - el aviso;
  - «Tu cuenta › Logros» y las insignias;
  - el perfil de una amistad;
  - la privacidad: una web oculta no enseña sus logros.
- Probado también contra la base de desarrollo (`tests/integracion/test_logros.py`):
  - las fechas pasadas y que no avisan;
  - el progreso;
  - quitar un logro;
  - la imagen;
  - los secretos tapados;
  - un perfil privado;
  - el borrado.

## Calendario y dependencias

Sin calendario. Cada web, cuando pueda. Disponible en QA y en producción desde el 25 de octubre de 2026 (`106e240`, kit 1.60, SDK 1.24.0, app Yosiftware 0.2.7). Para probar en QA, la web usa su credencial de servicio de QA y sus cuentas de prueba (`ops/cuentas-de-prueba.ps1`, que pide la plataforma).

## Fuera de alcance

- Clasificaciones de la plataforma: cada web tiene las suyas.
- Logros entre webs («usa tres webs»).
- Monedas, puntos o recompensas canjeables.
- Que la plataforma evalúe los requisitos.

## Resolución

### Libros: hecho (2026-10-26)

Aceptada. Libros declara su catálogo, concede y lleva el progreso desde la API (`1afe426`), en QA y en producción desde el 26 de octubre. El propietario dejó elegir los logros: «lo típico, primer libro en la biblioteca, X libros en la biblioteca, primer libro acabado… y así».

**El catálogo:** 26 logros en seis grupos.

- **Niveles:** Bolsillo, Tapa blanda, Tapa dura y Edición de lujo.
- **Tu biblioteca:** 1, 10, 50, 100 y 250 libros.
- **Lectura:**
  - terminar 1, 10, 50 y 100 libros;
  - libros de 10 autores distintos;
  - una saga completa;
  - 10.000 páginas.
- **Constancia:**
  - 7 y 30 días seguidos registrando lectura;
  - un libro terminado cada mes durante 12 meses;
  - uno secreto.
- **Reseñas y puntuaciones:** la primera nota, y la primera reseña, 10 y 50.
- **Tu memoria de lectura:** el primer capítulo, 100 y 1.000; 50 personajes.
- **El catálogo:** la primera petición aprobada y 10.

**Cómo concede:**

- La API mide cada logro en su base y lo compara con lo que la cuenta ya tiene (`GET /v1/servicio/logros/cuentas/{cuenta}`): solo envía lo que cambia.
- Lo revisa en segundo plano:
  - tras cada escritura correcta de la persona, con un retraso de 20 segundos que agrupa las seguidas;
  - la primera vez que la API la ve desde que arrancó;
  - al aprobarse una petición suya.
- **Los que ya tenía cada cuenta** se conceden con su fecha de verdad. Con una fecha de hace más de un día, la plataforma no avisa. Lo que no tiene fecha, porque es de antes de guardarla, toma la del alta de la persona en Libros.
- El progreso va mientras no se cumplen.
- **El aviso:** el de la campana (`avisoEnLaWeb: true`); Libros no tiene uno propio.

**El enlace:** «Ver tus logros» abre «Tu cuenta › Logros» (`?vista=logros`):

- en el perfil de la web (Mobile, Web y Wood);
- en la APK Kotlin, junto a los enlaces de la cuenta.

**No aplica por ahora:**

- Las imágenes propias: las medallas llevan el icono de Libros.
- Enseñar los logros dentro de Libros con `GET /v1/logros`.
- Publicar novedades al conseguir un trofeo.

**Comprobado:**

- En QA, de punta a punta con la cuenta de prueba `prueba.libros.activa`: el catálogo con sus niveles, «Primer libro» concedido y el progreso de los de la biblioteca.
- En producción: el catálogo declarado (26 logros, 6 grupos).
- 15 pruebas nuevas en `tests/test_platform_logros.py`:
  - el catálogo dentro de los límites;
  - las medidas;
  - las fechas;
  - las rachas en hora de Madrid;
  - que solo se envía lo que cambia;
  - el agrupado de las escrituras.
