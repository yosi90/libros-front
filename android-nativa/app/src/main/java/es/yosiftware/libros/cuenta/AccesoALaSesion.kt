package es.yosiftware.libros.cuenta

import android.app.Activity
import es.yosiftware.sesion.CuentaGuardada
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.Normas
import es.yosiftware.sesion.SesionEnOtraApp
import es.yosiftware.sesion.SesionYosiftware
import kotlinx.coroutines.flow.StateFlow

/**
 * La sesión de otra app del ecosistema de este móvil, para «Continuar como @[alias]» (ecosistema-kit/APK.md, «La sesión
 * de otra app»). [app] es `null` si la persona oculta que usa esa app. La de la librería no se puede crear fuera de
 * ella, así que las pantallas usan esta, que la lleva dentro.
 */
class OtraApp(val alias: String, val app: String?, internal val deLaLibreria: SesionEnOtraApp? = null) {
    override fun toString() = "OtraApp(alias=$alias, app=$app)"
}

/**
 * Lo que la interfaz usa de `SesionYosiftware` (librería 1.7.0, sin cambios): el estado, las cuentas guardadas, las
 * acciones de cada estado y las direcciones del navegador. La app usa [DeLaLibreria]; las pruebas de la JVM, una falsa
 * (la sesión de verdad no se puede crear fuera de Android). No añade nada: cada función es la de la librería.
 */
interface AccesoALaSesion {
    val estado: StateFlow<EstadoSesion>
    val cuentas: StateFlow<List<CuentaGuardada>>

    suspend fun entrarConContrasena(correo: String, contrasena: String)
    suspend fun entrarConGoogle(actividad: Activity)
    suspend fun sesionesEnOtrasApps(): List<OtraApp>
    suspend fun continuarCon(otra: OtraApp)
    suspend fun completarAlta(alias: String)
    suspend fun enviarCodigo(codigo: String)
    suspend fun conservarCuenta()
    suspend fun cancelar()
    suspend fun reintentar()
    suspend fun leerNormasDeUso(): Normas
    suspend fun aceptarNormasDeUso()
    suspend fun leerNormasDeLaWeb(): Normas
    suspend fun aceptarNormasDeLaWeb()
    suspend fun anadirCuenta()
    suspend fun cancelarAnadir()
    suspend fun elegirCuenta(id: String)
    suspend fun olvidarCuenta(id: String)
    suspend fun salir()
    suspend fun salirDeTodas()

    /** Crear una cuenta con contraseña: en la página de acceso, en el navegador del sistema. */
    fun direccionCrearCuenta(): String

    /** La página de acceso: recuperar la contraseña. */
    fun direccionPaginaDeAcceso(): String

    /** Una vista de la web social (`perfil`, `sesiones`, `privacidad`…). */
    fun direccionWebSocial(vista: String? = null): String

    /** La de la app. */
    class DeLaLibreria(private val sesion: SesionYosiftware) : AccesoALaSesion {
        override val estado get() = sesion.estado
        override val cuentas get() = sesion.cuentas

        override suspend fun entrarConContrasena(correo: String, contrasena: String) = sesion.entrarConContrasena(correo, contrasena)
        override suspend fun entrarConGoogle(actividad: Activity) = sesion.entrarConGoogle(actividad)
        override suspend fun sesionesEnOtrasApps() = sesion.sesionesEnOtrasApps().map { OtraApp(it.alias, it.app, it) }

        override suspend fun continuarCon(otra: OtraApp) {
            sesion.continuarCon(otra.deLaLibreria ?: return)
        }

        override suspend fun completarAlta(alias: String) = sesion.completarAlta(alias)
        override suspend fun enviarCodigo(codigo: String) = sesion.enviarCodigo(codigo)
        override suspend fun conservarCuenta() = sesion.conservarCuenta()
        override suspend fun cancelar() = sesion.cancelar()
        override suspend fun reintentar() = sesion.reintentar()
        override suspend fun leerNormasDeUso() = sesion.leerNormasDeUso()
        override suspend fun aceptarNormasDeUso() = sesion.aceptarNormasDeUso()
        override suspend fun leerNormasDeLaWeb() = sesion.leerNormasDeLaWeb()
        override suspend fun aceptarNormasDeLaWeb() = sesion.aceptarNormasDeLaWeb()
        override suspend fun anadirCuenta() = sesion.anadirCuenta()
        override suspend fun cancelarAnadir() = sesion.cancelarAnadir()
        override suspend fun elegirCuenta(id: String) = sesion.elegirCuenta(id)
        override suspend fun olvidarCuenta(id: String) = sesion.olvidarCuenta(id)
        override suspend fun salir() = sesion.salir()
        override suspend fun salirDeTodas() = sesion.salirDeTodas()
        override fun direccionCrearCuenta() = sesion.direccionCrearCuenta()
        override fun direccionPaginaDeAcceso() = sesion.direccionPaginaDeAcceso()
        override fun direccionWebSocial(vista: String?) = sesion.direccionWebSocial(vista)
    }
}
