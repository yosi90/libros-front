package es.yosiftware.libros.ui.cuenta

import android.app.Activity
import es.yosiftware.libros.cuenta.AccesoALaSesion
import es.yosiftware.libros.cuenta.OtraApp
import es.yosiftware.sesion.Cuenta
import es.yosiftware.sesion.CuentaGuardada
import es.yosiftware.sesion.ErrorSesion
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.Normas
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableStateFlow

fun cuenta(id: String) = Cuenta(id, "alias-$id", "$id@correo.es", true, "activa", false)

fun conSesion(id: String) = EstadoSesion.ConSesion(cuenta(id), null)

fun guardada(id: String, activa: Boolean = false, caducada: Boolean = false) = CuentaGuardada(id, "alias-$id", activa, caducada)

/**
 * Una sesión falsa para las pruebas de la JVM: el estado y las cuentas se cambian a mano, cada acción se anota en
 * [llamadas] y puede fallar ([fallo]) o quedarse esperando ([espera]).
 */
class SesionFalsa : AccesoALaSesion {
    override val estado = MutableStateFlow<EstadoSesion>(EstadoSesion.SinSesion())
    override val cuentas = MutableStateFlow<List<CuentaGuardada>>(emptyList())

    val llamadas = mutableListOf<String>()
    var fallo: ErrorSesion? = null
    var espera: CompletableDeferred<Unit>? = null
    var otras: List<OtraApp> = emptyList()
    var normas = Normas(1, 2, "Normas de uso", "# Normas\n\nTexto.")

    private suspend fun hacer(nombre: String) {
        llamadas += nombre
        espera?.await()
        fallo?.let { throw it }
    }

    override suspend fun entrarConContrasena(correo: String, contrasena: String) = hacer("contrasena:$correo:$contrasena")
    override suspend fun entrarConGoogle(actividad: Activity) = hacer("google")

    override suspend fun sesionesEnOtrasApps(): List<OtraApp> {
        llamadas += "otrasApps"
        return otras
    }

    override suspend fun continuarCon(otra: OtraApp) = hacer("continuarCon:${otra.alias}")
    override suspend fun completarAlta(alias: String) = hacer("alta:$alias")
    override suspend fun enviarCodigo(codigo: String) = hacer("codigo:$codigo")
    override suspend fun conservarCuenta() = hacer("conservar")
    override suspend fun cancelar() = hacer("cancelar")
    override suspend fun reintentar() = hacer("reintentar")

    override suspend fun leerNormasDeUso(): Normas {
        hacer("leerNormasDeUso")
        return normas
    }

    override suspend fun aceptarNormasDeUso() = hacer("aceptarNormasDeUso")

    override suspend fun leerNormasDeLaWeb(): Normas {
        hacer("leerNormasDeLaWeb")
        return normas
    }

    override suspend fun aceptarNormasDeLaWeb() = hacer("aceptarNormasDeLaWeb")
    override suspend fun anadirCuenta() = hacer("anadir")
    override suspend fun cancelarAnadir() = hacer("cancelarAnadir")
    override suspend fun elegirCuenta(id: String) = hacer("elegir:$id")
    override suspend fun olvidarCuenta(id: String) = hacer("olvidar:$id")
    override suspend fun salir() = hacer("salir")
    override suspend fun salirDeTodas() = hacer("salirDeTodas")
    override fun direccionCrearCuenta() = "https://acceso/?vista=registro"
    override fun direccionPaginaDeAcceso() = "https://acceso/"
    override fun direccionWebSocial(vista: String?) = "https://social/" + (vista?.let { "?vista=$it" } ?: "")
}
