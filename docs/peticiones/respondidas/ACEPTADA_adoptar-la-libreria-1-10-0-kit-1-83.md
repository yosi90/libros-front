# Petición a las APK: la librería de la sesión 1.10.0 y los espacios con vuestro nombre (kit 1.83)

Fecha: 2026-11-06
Solicitante: Plataforma Yosiftware (a petición de Libros; el nombre de los espacios, por decisión del propietario)
Destinatarios: las siete APK registradas: el frontend de Libros (su APK en Kotlin), Rol (3.5 Companion), Lorcana (Yosircana), Re-Notas, 1d1n, Rasgora y Día a día
Afecta a: la carpeta `sesion/` de la librería Kotlin que copiasteis del kit y, si vuestra web tiene espacios, vuestro backend
Estado: entregada el 2026-11-06, la misma copia en la carpeta de cada proyecto

## Contexto

La auditoría de duplicados de la APK de Libros encontró código que Libros escribía por su cuenta porque la librería 1.9.0 no lo daba:
- el `detalle` de los errores;
- parte de los espacios;
- buscar personas;
- una tabla de frases para llamar «club» a sus espacios.

Cualquier app con espacios o con moderación tendría que escribir lo mismo. Ahora lo da la plataforma.

**No es obligatorio.** La 1.10.0 es compatible con la 1.9.0: solo añade. Os la recomendamos para tener el kit al día y, sobre todo, si vuestra app rehace algo de esto.

## Qué trae la 1.10.0

Está en `ecosistema-kit/APK.md`, «La librería 1.10.0» (fuente vigente: `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`). En resumen:

- **`ErrorSesion.detalle`**: el `detalle` de la plataforma, tal cual. Con `cuenta_restringida`, `restriccion` lo da leído: `RestriccionDeCuenta(alcance, hasta)`. La frase para la persona es el `mensaje`, que ya dice qué está limitado, hasta cuándo y dónde verlo.
- **Los espacios que faltaban** (`sesion.espacios`):
  - las peticiones de entrar: `pedirEntrar`, `retirarSolicitud`, `solicitudes`, `aprobarSolicitud` y `rechazarSolicitud`;
  - las invitaciones enviadas: `invitacionesEnviadas` y `retirarInvitacion`.
- **`sesion.social`**: `buscarPersonas(texto)` y `resumen()`.
- **Atadas a la cuenta.** Si la persona cambia de cuenta o sale antes de que termine una llamada de `sesion.espacios` o `sesion.social`, la respuesta se descarta y llega `ErrorSesion` con `cuenta_cambiada`.

## Los espacios con vuestro nombre (si vuestra web tiene espacios)

Si en vuestra web no son «espacios» (en Libros son «clubes»), vuestro backend lo declara una vez con su credencial de servicio, como los roles:

```http
PUT /v1/servicio/espacios/nombre
{ "singular": "club", "plural": "clubes", "femenino": false }
```

Desde entonces, los errores de los espacios os llegan con vuestro nombre, en la web y en la APK: «Este club ya tiene 2000 miembros», «Ese club no existe o ya no está». Está en `ecosistema-kit/ESPACIOS.md`, «Cómo los llamas». Sin declararlo, siguen diciendo «espacio».

## Qué tenéis que hacer, si la adoptáis

1. Copiar la carpeta `sesion/` del kit encima de la vuestra.
2. Si vuestra app rehacía algo de lo de arriba con su propio cliente (`conTokenDePlataforma`), cambiarlo por la librería y retirar vuestra copia.
3. Si vuestra web tiene espacios con otro nombre, declararlo desde vuestro backend, y retirar vuestra tabla de frases por `code`. Enseñad el `error` tal cual.
4. Probarlo con la variante de QA contra la plataforma de QA.

Si no hacéis nada, todo sigue funcionando como hasta ahora con la 1.9.0.

## Seguimiento

| Proyecto | Carpeta | Estado |
| --- | --- | --- |
| Libros | `C:\Users\Yosi\Desktop\Memoria bibliográfica\front\docs\peticiones\` | Entregada; es quien la pidió |
| Rol (3.5 Companion) | `C:\Users\Yosi\Desktop\Fichas 3.5\docs\peticiones\` | Entregada |
| Lorcana | `C:\Users\Yosi\Desktop\mazos lorcana\docs\peticiones\` | Entregada |
| Re-Notas | `C:\Users\Yosi\Desktop\re-notas\docs\peticiones\` | Entregada |
| 1d1n | `C:\Users\Yosi\Desktop\Un día, un monograma - 1d1m\docs\peticiones\` | Entregada |
| Rasgora | `C:\Users\Yosi\Desktop\Rasgora\docs\peticiones\` | Entregada |
| Día a día | `C:\Users\Yosi\Desktop\rueda-mental\docs\peticiones\` | Entregada |

## Resolución

**Aceptada y adoptada (2026-11-06).** Libros la pidió y la adoptó el mismo día:

- **Backend** (`Libros API` `9082990`, en QA y en producción): declara al arrancar que sus espacios se llaman «clubes» (`PUT /v1/servicio/espacios/nombre`, `utils/platform_spaces.py`, `declarar_nombre()`). Los registros de QA y de producción lo confirman.
- **APK** (`android-nativa/yosiftware-sesion/`, librería 1.10.0 copiada sin cambios de `59ea2a9`): `RepositorioEspacios` ya no escribe rutas; todo va por `sesion.espacios` y `sesion.social`, con sus modelos. Fuera las copias de los modelos, `Restricciones.kt` (la frase de `cuenta_restringida` es la de la plataforma) y la tabla de frases de `MensajesDeEspacios.kt`. `cuenta_cambiada` se descarta en silencio. Puntos 9, 10 y 13 de `docs/roadmaps/ecosistema/ROADMAP_PAUSADO_duplicados-apk-kotlin.md`. Probado en el Xiaomi contra QA: el resumen social, la búsqueda de personas del club, invitar y retirar una invitación, un error de la plataforma y la pestaña Acceso.
- **Web**: fuera `SPACE_ERROR_MESSAGES`; `spaceErrorMessage` enseña la frase de la plataforma. La frase de la restricción de la web se queda: el aviso del panel se compone con el estado de la sesión del SDK (no hay un error de la plataforma que enseñar) y `platform_restriction_active` es un error de la API de Libros.

Publicación: web `1d6bd3c1` y APK 2.0.7.
