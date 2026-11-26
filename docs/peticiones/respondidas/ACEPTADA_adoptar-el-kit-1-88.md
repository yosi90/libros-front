# Petición a las APK: la privacidad de vuestra app antes de instalarla y el aviso de gratuidad en cuatro idiomas (kit 1.88)

Fecha: 2026-11-07
Solicitante: Plataforma Yosiftware (a petición de Día a día, tras la revisión de su asesor legal; textos aprobados por el propietario)
Destinatarios: las siete APK registradas: el frontend de Libros (su APK en Kotlin), Rol (3.5 Companion), Lorcana (Yosircana), Re-Notas, 1d1n, Rasgora y Día a día
Afecta a: lo que entregáis al propietario para la ficha de vuestra app y, si vuestra app habla otros idiomas, el aviso «Gratis, por ahora»
Estado: entregada el 2026-11-07, con la plataforma ya en producción (`fb5d13d`), la misma copia en la carpeta de cada proyecto

## Contexto

Las directrices de transparencia del CEPD (WP260 rev.01, § 11) piden que, en una app, la información de privacidad propia de esa app se pueda leer **antes de descargarla**, y no solo la política general. Hasta hoy, la tarjeta de «Apps» de la web social y las descargas de la plataforma no enlazaban nada propio de cada app.

Además, el aviso «Gratis, por ahora» solo estaba en español. Una app en otro idioma lo enseñaba en español, porque es un texto común y no se traduce por cuenta propia.

## Qué hay desde el kit 1.88

Está en `ecosistema-kit/APK.md` (fuente vigente: `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`):

1. **«La ficha de la app»: la dirección de vuestra información de privacidad.**
   - Es una dirección https de `yosiftware.es`, normalmente la sección legal de vuestra web, con lo que trata vuestra app. Para la cuenta, que enlace a la política de la plataforma.
   - La pone el propietario en la ficha de vuestra entrada, en cada entorno, y desde ese momento es pública.
   - La tarjeta de vuestra app la enlaza como «Privacidad de la app» junto a «Instalarla» en tres sitios: «Apps» de la web social, la invitación a un espacio y el Hall.
   - En la app Yosiftware, tocar vuestra app sin tenerla instalada lleva a esa tarjeta, y no directo a la descarga.
   - Llega en `GET /v1/webs`, `app.privacidad`.
2. **«El aviso de gratuidad», «En otros idiomas»:** el texto oficial en inglés, portugués de Portugal y alemán, con su botón.

## Qué os pedimos

- **Si vuestra app trata datos propios** (guarda algo en vuestro servidor o en el móvil, aparte de la sesión de la plataforma): pasad al propietario la dirección de su información de privacidad, la de QA y la de producción. Antes de vuestra próxima publicación en producción, comprobad que llega en `GET /v1/webs` (`app.privacidad` de vuestra clave). Si vuestra app solo usa la cuenta de la plataforma, no hace falta.
- **Si vuestra app habla inglés, portugués o alemán:** enseñad el aviso de gratuidad con el texto oficial de cada idioma. Si habla otro idioma, pedídnoslo; no lo traduzcáis por vuestra cuenta.
- Marcad los dos puntos nuevos de `LISTA_DE_COMPROBACION.md` (APK).

No cambia nada de la librería de la sesión ni de vuestra compilación.

## Fuera de alcance

- El texto de vuestra información de privacidad, que es vuestro.
- Google Play, que sigue en pausa.

## Resolución

**Aceptada** (2026-11-26).

- La política de privacidad propia de Libros está publicada en `https://libros.yosiftware.es/privacidad/`: estática, se lee sin sesión y no carga nada de fuera. Se enlaza desde la portada y desde «Cuenta y seguridad».
- Las normas de Libros, versión 3, llevan el apartado `datos`, que remite a esa política, y el apartado `ia` con los cuatro usos de la IA.
- El propietario puso esa dirección en la ficha de la app en los dos entornos (la misma en QA, porque la política es la misma). Comprobado el 2026-11-26: `GET /v1/webs` da `app.privacidad` = `https://libros.yosiftware.es/privacidad/` para `libros` en producción y en QA.
- La APK solo habla español: el aviso de gratuidad en otros idiomas no aplica.
