# Petición al frontend de Libros: publicar la app de Libros en Google Play, con el aviso «Gratis, por ahora» (kit 1.77)

Fecha: 2026-11-05
Solicitante: Plataforma Yosiftware, por decisión del propietario
Afecta a: vuestra APK en Kotlin (`android-nativa/`), su flujo de publicación en GitHub, su firma y su ficha

## Actualización del 2026-11-05: Google Play deja de ser obligatorio

Decisión del propietario, el mismo día, después de intentar la primera subida: **publicar en Google Play ya no es obligatorio y queda en pausa para todo el ecosistema.** Su cuenta de desarrollador es personal, y Google exige antes de producción una prueba cerrada con al menos 12 personas durante 14 días seguidos, que hoy no hay forma de reunir.

- **No subáis nada a Play ni preparéis nada para su consola.** Las APK se siguen instalando con la descarga de la plataforma («Publicar una versión de tu APK», `publicar_apk.py`).
- **El aviso «Gratis, por ahora» sigue siendo obligatorio** dentro de la app (punto 2 de «Qué necesitamos», con su texto), porque no depende de Play. Lo de ponerlo en la ficha de Play solo vale si algún día se publica allí.
- Lo que ya tengáis hecho para Play (el AAB, la ficha, las respuestas de «Contenido de la app») no se tira: guardadlo para cuando se retome, sin seguir con ello.
- El kit 1.79 lo recoge: en `APK.md`, «Google Play» pasa a opcional y en pausa.
- La app Yosiftware llegó a la prueba interna de Play: la consola aceptó su paquete, su firma con la clave propia y su AAB. El camino está comprobado hasta ahí, y se retomará cuando haya personas para la prueba cerrada.

Esta petición sigue abierta solo por el aviso de gratuidad: respondedla con eso (aceptada, aceptada en parte o rechazada, con su motivo).

## Contexto

El propietario ha decidido (2026-11-05) que **toda APK del ecosistema se publique en Google Play**. Sustituye a «olvidemos Google Play», del 2026-10-19 y a lo que la petición de la migración dejó fuera de alcance («Google Play y la monetización»). La cuenta de desarrollador es suya, una sola para todas las apps, y **la app Yosiftware es la primera**: su ficha y sus respuestas de «Contenido de la app» estarán en `apps/social-android/play/` del repositorio de la plataforma, para que os sirvan de ejemplo. Solo va a Play la compilación de producción; la de QA (`.qa`) sigue con la descarga de la plataforma en QA.

Con una **regla temporal, el aviso de gratuidad**: mientras el propietario no diga otra cosa, cada app avisa de que el servicio es gratuito por ahora y lo paga él. El texto es el mismo en todas; solo podéis cambiar «Este servicio» por el nombre de vuestra app:

> **Gratis, por ahora**
>
> Este servicio es gratuito por ahora, pero mantenerlo cuesta dinero: el servidor lo paga de su bolsillo la persona que crea Yosiftware. Si algún día llega tanta gente que el servidor no da abasto, habrá que cerrarlo al público o buscar la forma de que dé lo suficiente para mantenerlo y seguir mejorándolo. Eso se decidirá con encuestas públicas a la comunidad, en las que podrá votar cualquier persona con cuenta de Yosiftware, desde la app Yosiftware o desde la web social.

La norma completa está en el **kit 1.77**: `ecosistema-kit/APK.md`, «Google Play (kit 1.77, obligatorio)», y los dos puntos nuevos de «App Android» en `LISTA_DE_COMPROBACION.md`. Fuente vigente: `C:\Users\Yosi\Desktop\administracion yosiftware\ecosistema-kit\`. Esta petición la resume para vuestra app; si algo no coincide, manda el kit.

## Vuestra app hoy

- **Paquete:** `es.yosiftware.libros` (la de QA, `es.yosiftware.libros.qa`, no va a Play).
- **En producción:** la plataforma sirve la 2.0.3 (`versionCode` 20003), publicada el 29 de octubre con vuestra credencial.
- **Compilación:** la variante `produccion` de `android-nativa/`, con `versionCode` y `versionName` por `-PversionCode=… -PversionName=…`.
- **Firma:** la de siempre, la misma que la APK de Capacitor. La usa `.github/workflows/android-nativa-publicacion.yml` desde los secretos `ANDROID_KEY*` de GitHub, y el propietario guarda copias fuera. En el servidor no está (`android-nativa/.runtime/firma/` no existe).
- **Push** con FCM (`push/ServicioPush.kt`) y mensajes entre personas.
- **Ya tenéis** el icono de 512 × 512 y la ficha de 1600 × 900 en `android-nativa/ficha/`.

## Qué necesitamos

1. **Copiad el kit 1.77** y leed «Google Play» en `APK.md`.
2. **El aviso dentro de la app.** Se enseña solo una vez al instalarla y cada vez que se actualiza (por ejemplo, guardando el `versionCode` con el que se vio), antes o después de entrar, sin pedir nada más que «Entendido». Y está **siempre a mano**, con el mismo texto, en los ajustes de la app o un «Acerca de», donde mejor encaje en vuestra navegación. Las encuestas aún no existen: no las enlacéis ni prometáis fechas.
3. **El paquete: AAB.** Play solo acepta Android App Bundle. En vuestro caso, `gradlew :app:bundleProduccionRelease` en `android-nativa/`. Lo natural es que vuestro flujo de GitHub (`android-nativa-publicacion.yml`), que ya firma con la clave de siempre y comprueba la huella con el `assetlinks.json` de producción, deje también el AAB firmado como artefacto. Antes de subirlo:
   - `versionCode` y `versionName` suben, como en la descarga de la plataforma; el mismo `versionCode` no se puede subir dos veces a Play.
   - El `targetSdk` que exija Play en ese momento (la consola rechaza el que no llega) y la compilación de publicación, no depurable.
   - Sin el permiso `com.google.android.gms.permission.AD_ID` si no tenéis anuncios: miradlo en el manifiesto final, porque alguna librería lo añade.
4. **La firma: Play App Signing con vuestra clave de publicación actual**, no con una nueva. Al crear la app, el propietario elige en «Firma de la app» subir una clave propia, y la consola le da una clave pública de cifrado. Con ella se exporta vuestra clave con la herramienta oficial de Google, **PEPK** (`java -jar pepk.jar … --encryption-key-file=<la clave pública de la consola>`). Vuestra clave está en los secretos de GitHub y en las copias del propietario, no en el servidor: la exportación con PEPK la hace el propietario con su copia, o vosotros con él donde esté la clave, sin que quede en un registro de Actions. Así, Google firma lo que instala Play con vuestra misma clave: quien ya tiene vuestra APK la actualiza desde Play sin desinstalarla, y las huellas SHA-1 y SHA-256 dadas de alta en Firebase y en el registro de la plataforma siguen siendo las buenas, así que entrar con Google sigue funcionando. **Que Google no genere una clave nueva**: cambiarían las huellas y entrar con Google dejaría de funcionar hasta dar de alta las nuevas (habría que pedírnoslo antes). La clave de subida puede ser la misma; si usáis otra, no hace falta darla de alta. La contraseña nunca se muestra ni pasa por Git.
5. **Lo que entregáis al propietario**, que es quien crea la app en la consola (la API de Play no puede crearla):
   - el AAB de producción firmado, y el archivo cifrado de PEPK cuando os dé la clave pública;
   - **la ficha**, en español de España: título (hasta 30 caracteres), descripción corta (80) y larga (4000), **con el aviso al final de la descripción larga**; el icono de 512 × 512 (el de vuestra ficha de la app), un gráfico de 1024 × 500 y al menos dos capturas del móvil (también de plegable, si las tenéis);
   - **vuestras respuestas de «Contenido de la app»**:
     - política de privacidad: `https://social.yosiftware.es/?vista=normas` (la de la plataforma; si vuestra app trata datos propios, también la vuestra, enlazada desde la de vuestra web);
     - eliminación de la cuenta: dentro de la app, el camino a «Borrar la cuenta» (la vista `cuenta` de la web social o la app Yosiftware); fuera, `https://social.yosiftware.es/?vista=cuenta`; y cómo se borran vuestros datos propios (solos, al llegar el aviso del borrado por el feed de cambios, `FEED_DE_CAMBIOS.md`);
     - acceso a la app: una cuenta de producción para la revisión de Google, con su correo y su contraseña, nunca una de QA ni la del propietario;
     - anuncios; seguridad de los datos (lo que manda vuestra app y lo que manda la librería de la sesión: el correo y la contraseña o la cuenta de Google al entrar, a Firebase Authentication y a la plataforma; cifrado en tránsito; la cuenta se puede borrar); clasificación de contenido (el cuestionario de IARC: si hay chat o se comparte contenido entre personas, decidlo); y público objetivo (la cuenta exige 14 años: ninguna franja por debajo de 13).

   Guardad la ficha y las respuestas versionadas en vuestro repositorio (por ejemplo, en una carpeta `play/` junto a la app, como hará la plataforma), sin secretos: la contraseña de la cuenta de revisión va al propietario por un canal privado.
6. **La primera vez, en la consola (lo hace el propietario):** crear la app («App», «Gratis», español de España), la firma con PEPK, la **prueba interna** primero (sirve para ver que la firma, entrar con Google y el push funcionan con lo que instala Play), «Contenido de la app» completo antes de pasar de ahí, y la ficha. **Si la cuenta de desarrollador lo exige** (si es personal y nueva), antes de producción Google pide una **prueba cerrada con al menos 12 personas durante 14 días seguidos**: la coordina la plataforma con una sola lista para todas las apps, así que no busquéis personas por vuestra cuenta. Producción, cuando lo diga el propietario; entonces el enlace de instalación de vuestra tarjeta en «Apps» pasa a vuestra ficha de Play (`https://play.google.com/store/apps/details?id=<paquete>`), y se lo pedís a él.
7. **Cada versión, después:** subid el `versionCode`, compilad el AAB, probadlo y subidlo a la pista de **prueba interna**; de ahí se promociona a la cerrada o a producción. Se hace con la API de publicación de Google Play (`androidpublisher` v3) y una **cuenta de servicio de vuestro proyecto**, que el propietario invita en la consola («Usuarios y permisos») con permisos solo sobre vuestra app. Su clave JSON va en un archivo privado (por ejemplo, en `.runtime/`) que Git ignore: comprobadlo con `git check-ignore`. La plataforma tiene su herramienta en `ops/play/` y la pasará al kit cuando haya hecho su primera subida; no hace falta que hagáis la vuestra antes. **Nunca subáis a producción sin que lo diga el propietario.**
8. **La descarga de la plataforma sigue** («Publicar una versión de tu APK», con `publicar_apk.py`) mientras vuestra app no esté en producción en Play, y después para quien no use Play. Lleva la misma firma, así que se pasa de una a otra sin desinstalar, siempre que el `versionCode` de la que llega sea mayor.
9. **Responded en vuestra copia** con lo que hagáis y cuándo, o con lo que no os encaje: si algo de vuestra app choca con Play o con el aviso, decidlo ahí. Se puede aceptar en parte o rechazar con su motivo, y lo vemos con el propietario.

## Lo vuestro

- **El `assetlinks.json` de producción sigue valiendo:** con vuestra propia clave, la huella de lo que instala Play es la misma.
- **Seguridad de los datos:** además de lo de la sesión, el push con FCM (identificador de instalación) y lo que vuestra API guarda de cada persona, igual que lo cuenta vuestra política.
- **Clasificación de contenido:** hay mensajes entre personas; decidlo en el cuestionario.
- **Libros API no tiene que hacer nada:** esta petición solo va a la carpeta del frontend, que es donde vive la APK.

## Comprobaciones previas

- El kit 1.77 ya está escrito en la fuente vigente. La app Yosiftware va primero: su aviso, su AAB, su ficha y la herramienta de subida están en preparación (roadmap `ACTIVO_acceso-y-google-play`, fase 5).
- Lo de vuestra app, comprobado el 2026-11-05 sin abrir ningún secreto: `GET /v1/webs` de producción (2.0.3), `android-nativa/app/build.gradle.kts`, el `README.md` de `android-nativa/`, el roadmap de la APK en Kotlin (la firma por GitHub) y que `android-nativa/.runtime/` no tiene la carpeta `firma`.

## Calendario y dependencias

Sin fecha. Ya estáis en producción con la descarga de la plataforma, así que podéis preparar el AAB, el aviso y la ficha en cuanto queráis, y entregarlos cuando el propietario cree vuestra app en la consola.

Depende del propietario: crear la app en la consola, daros la clave pública para PEPK e invitar a vuestra cuenta de servicio. Y, si la cuenta lo exige, de la prueba cerrada común.

## Fuera de alcance

- La compilación de QA, que no va a Play.
- Las webs: no tienen que hacer nada.
- Las encuestas y cualquier forma de pago: el aviso las anuncia, pero aún no existen.
- Cambiar de paquete o de clave de firma.

## Estado de respuesta

**Aceptada en parte** (2026-11-05), según la actualización del mismo día.

- **El aviso «Gratis, por ahora»: hecho.** El texto común del kit, tal cual (una prueba lo compara con `ecosistema-kit/APK.md`), en una hoja con «Entendido» (`android-nativa/app/src/main/java/es/yosiftware/libros/ui/preferencias/Gratuidad.kt`). Sale sola una vez al instalar la app y con cada `versionCode` nuevo, con o sin sesión, y está siempre a mano en Preferencias › Privacidad, «Gratis, por ahora». Comprobado en el Honor con la variante de QA.
- **Google Play: en pausa** (kit 1.79). No se ha preparado AAB, ficha ni respuestas de la consola, ni se sube nada. Se retomará cuando lo diga el propietario.
