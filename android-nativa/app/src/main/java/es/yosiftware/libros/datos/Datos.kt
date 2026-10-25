package es.yosiftware.libros.datos

import android.content.Context
import es.yosiftware.libros.BuildConfig
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.FuenteDePerfiles
import es.yosiftware.libros.datos.cuenta.PerfilesDeLaPlataforma
import es.yosiftware.libros.datos.red.ClienteLibros
import es.yosiftware.libros.datos.red.ClientePlataforma
import es.yosiftware.libros.datos.red.EstadoDeRed
import es.yosiftware.libros.datos.red.TiempoReal
import es.yosiftware.libros.datos.red.TokensDeLaSesion
import es.yosiftware.libros.datos.repositorios.RepositorioCatalogo
import es.yosiftware.libros.datos.repositorios.RepositorioClubes
import es.yosiftware.libros.datos.repositorios.RepositorioChat
import es.yosiftware.libros.datos.repositorios.RepositorioColeccion
import es.yosiftware.libros.datos.repositorios.LlamadaDePlataforma
import es.yosiftware.libros.datos.repositorios.RepositorioDispositivos
import es.yosiftware.libros.datos.repositorios.RepositorioEntidades
import es.yosiftware.libros.datos.repositorios.RepositorioEspacios
import es.yosiftware.libros.datos.repositorios.RepositorioEstadisticas
import es.yosiftware.libros.datos.repositorios.RepositorioLibro
import es.yosiftware.libros.datos.repositorios.RepositorioNovedades
import es.yosiftware.libros.datos.repositorios.RepositorioPeticiones
import es.yosiftware.libros.datos.repositorios.RepositorioReportes
import es.yosiftware.libros.datos.repositorios.RepositorioUsuario
import es.yosiftware.libros.push.PushDeLaCuenta
import es.yosiftware.libros.ui.mensajes.BandejaDeChat
import es.yosiftware.sesion.SesionYosiftware
import kotlinx.coroutines.CoroutineScope

/**
 * Los datos de la app, uno por proceso (`LibrosApp.datos`): el ámbito de la cuenta, el único cliente de la API de
 * Libros, el de la plataforma, el estado de la red y los repositorios por área. Sin sesión configurada (sin el
 * `google-services.json`), las llamadas a la API fallan con `sin_sesion` y no hay cliente de la plataforma.
 */
class Datos(contexto: Context, sesion: SesionYosiftware?, alcance: CoroutineScope) {
    /** `qa` o `produccion`. */
    val entorno = if (BuildConfig.PLATAFORMA_QA) "qa" else "produccion"

    val ambito = AmbitoDeCuenta(
        entorno = entorno,
        padre = alcance,
        cuentaActivaGuardada = { sesion?.cuentas?.value?.firstOrNull { it.activa }?.id },
    ).also { ambito -> sesion?.let { ambito.escuchar(it.estado) } }

    val api = ClienteLibros(BuildConfig.API_LIBROS, TokensDeLaSesion(sesion), ambito)
    val plataforma: ClientePlataforma? = sesion?.let { ClientePlataforma(it, ambito) }

    /** Los perfiles públicos de las cuentas (nombre y avatar), con el cliente de la plataforma. */
    val perfiles: FuenteDePerfiles? = sesion?.let { s -> plataforma?.let { PerfilesDeLaPlataforma(it, s.configuracion.api) } }

    /** La API de la plataforma de esta compilación, para las miniaturas de los avatares. */
    val apiPlataforma: String? = sesion?.configuracion?.api
    val red: EstadoDeRed = EstadoDeRed.de(contexto)

    val catalogo = RepositorioCatalogo(api)
    val coleccion = RepositorioColeccion(api)
    val libro = RepositorioLibro(api)
    val entidades = RepositorioEntidades(api)
    val estadisticas = RepositorioEstadisticas(api, coleccion, libro)
    val peticiones = RepositorioPeticiones(api)
    val reportes = RepositorioReportes(api)
    val clubes = RepositorioClubes(api)
    val usuario = RepositorioUsuario(api)

    /** Una llamada a la API de la plataforma con la cuenta activa. Sin sesión, `sin_sesion`. */
    private val llamadaDePlataforma = LlamadaDePlataforma { metodo, ruta, cuerpo ->
        plataforma?.llamar(metodo, ruta, cuerpo) ?: throw ErrorDeLibros.sinSesion()
    }

    /** La pertenencia a los clubes (los espacios) y el resumen social, en la plataforma. */
    val espacios = RepositorioEspacios(llamadaDePlataforma)

    /** La Actividad de Comunidad: el feed de novedades de Libros en la plataforma. */
    val novedades = RepositorioNovedades(llamadaDePlataforma)

    /** El chat de la plataforma: la bandeja, las conversaciones y el ticket del tiempo real. */
    val chat = RepositorioChat(llamadaDePlataforma)

    /** Este móvil en el push de la cuenta, y el acuse de los avisos. */
    val dispositivos = RepositorioDispositivos(llamadaDePlataforma) { metodo, ruta, cuerpo ->
        plataforma?.sinToken(metodo, ruta, cuerpo) ?: throw ErrorDeLibros.sinSesion()
    }

    /** El socket del tiempo real de la plataforma (chat y canales de los clubes); sin sesión, no hay. */
    val tiempoReal: TiempoReal? = plataforma?.let { TiempoReal({ chat.ticket() }, alcance) }

    /** La bandeja del chat de la cuenta, de la que salen los contadores de mensajes sin leer. */
    val bandeja = BandejaDeChat(chat.takeIf { plataforma != null }, tiempoReal, ambito, alcance)

    /** El push de las cuentas en este móvil (push/). */
    val push = PushDeLaCuenta(contexto, sesion, ambito, dispositivos, entorno)
}
