package es.yosiftware.libros.ui.cuenta

import android.app.Activity
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import es.yosiftware.libros.cuenta.AccesoALaSesion
import es.yosiftware.libros.cuenta.OtraApp
import es.yosiftware.sesion.ErrorSesion
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.Normas
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/** El de la actividad, para lo que abre lo de la cuenta desde el shell (la hoja «Más»), sin pasarlo de mano en mano. */
val LocalCuenta = staticCompositionLocalOf<CuentaViewModel?> { null }

/** Como en el navegador: hasta cinco cuentas por app (ecosistema-kit/APK.md, «Cambiar de cuenta dentro de la app»). */
const val MAXIMO_DE_CUENTAS = 5

/**
 * La cuenta, para la interfaz: el estado de la sesión, las acciones de cada estado y su error, como `CuentaViewModel`
 * de 3.5 Companion. Vive en la actividad, no en la cuenta: sobrevive a los cambios de cuenta (los dirige) y a plegar.
 *
 * - Una acción a la vez ([ocupado]); su error, con la frase de la plataforma, en [error]. Cerrar la ventana de Google no
 *   es un error. Ninguna acción espera para siempre ([limiteMs], por encima de los 3 minutos de Google).
 * - Entrar con Google enciende el servicio en primer plano corto ([alEmpezarGoogle]) y lo apaga al terminar, pase lo que
 *   pase ([alTerminarGoogle]).
 * - «Continuar como @alias» ([otrasApps]) se busca sin bloquear la pantalla y solo se usa con el toque de la persona.
 * - [anadiendo]: se está entrando con otra cuenta para añadirla; se vuelve a la de antes con [cancelarAnadir].
 *
 * [mostrarCodigos]: en QA, el error lleva su código, para diagnosticar en los móviles que no dejan leer su registro.
 */
class CuentaViewModel(
    val sesion: AccesoALaSesion?,
    private val alEmpezarGoogle: () -> Unit = {},
    private val alTerminarGoogle: () -> Unit = {},
    private val mostrarCodigos: Boolean = false,
    private val limiteMs: Long = LIMITE_MS,
) : ViewModel() {
    var ocupado by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    /** Un aviso que no es un error (por ejemplo, al volver del navegador). */
    var aviso by mutableStateOf<String?>(null)
        private set

    var otrasApps by mutableStateOf<List<OtraApp>>(emptyList())
        private set

    var anadiendo by mutableStateOf(false)
        private set

    /** Las normas que se están leyendo, a pantalla completa, o `null`. */
    var normas by mutableStateOf<Normas?>(null)
        private set

    /** Se ha abierto el navegador para confirmar el correo o vincular la forma de entrar. */
    var enElNavegador by mutableStateOf(false)
        private set

    private var busqueda: Job? = null

    init {
        sesion?.let { s ->
            viewModelScope.launch {
                var anterior: Class<*>? = null
                s.estado.collect { estado ->
                    // Las normas abiertas son las de un paso: al pasar a otro, se cierran.
                    if (anterior != null && estado.javaClass != anterior) normas = null
                    anterior = estado.javaClass
                    // Al entrar con la nueva, ya no se está añadiendo, y lo que ofrecían otras apps ya no vale.
                    if (estado is EstadoSesion.ConSesion) {
                        anadiendo = false
                        otrasApps = emptyList()
                    }
                    if (estado !is EstadoSesion.SinSesion) busqueda?.cancel()
                }
            }
        }
    }

    fun olvidarError() {
        error = null
        aviso = null
    }

    /** En la pantalla de entrar, sin bloquearla: puede tardar unos segundos y nunca lanza errores. */
    fun buscarOtrasApps() {
        val s = sesion ?: return
        busqueda?.cancel()
        busqueda = viewModelScope.launch { otrasApps = s.sesionesEnOtrasApps() }
    }

    /** Con el toque de la persona: nunca se entra sin él (decisión del propietario, APK.md). */
    fun continuarCon(otra: OtraApp) {
        aviso = null
        accion {
            continuarCon(otra)
            otrasApps = otrasApps - otra
        }
    }

    fun entrarConContrasena(correo: String, contrasena: String) {
        aviso = null
        accion { entrarConContrasena(correo.trim(), contrasena) }
    }

    fun entrarConGoogle(actividad: Activity) {
        if (sesion == null || ocupado) return
        aviso = null
        alEmpezarGoogle()
        accion(alTerminar = alTerminarGoogle) { entrarConGoogle(actividad) }
    }

    fun completarAlta(alias: String) = accion { completarAlta(alias.trim()) }
    fun enviarCodigo(codigo: String) = accion { enviarCodigo(codigo.trim()) }
    fun conservarCuenta() = accion { conservarCuenta() }
    fun cancelar() = accion { cancelar() }
    fun reintentar() = accion { reintentar() }

    fun leerNormasDeUso() = accion { normas = leerNormasDeUso() }
    fun leerNormasDeLaWeb() = accion { normas = leerNormasDeLaWeb() }

    fun cerrarNormas() {
        normas = null
    }

    fun aceptarNormasDeUso() = accion {
        aceptarNormasDeUso()
        normas = null
    }

    fun aceptarNormasDeLaWeb() = accion {
        aceptarNormasDeLaWeb()
        normas = null
    }

    fun alAbrirElNavegador() {
        enElNavegador = true
    }

    /**
     * Al volver a la app después de abrir el navegador: la persona entra otra vez (APK.md, `AbrirEnNavegador`), así que
     * se vuelve al formulario de entrar con un aviso.
     */
    fun alVolverDelNavegador() {
        if (!enElNavegador) return
        enElNavegador = false
        aviso = "Si ya lo has hecho en el navegador, entra otra vez para terminar."
        accion { cancelar() }
    }

    fun anadirCuenta() = accion {
        anadirCuenta()
        anadiendo = true
        otrasApps = emptyList()
    }

    fun cancelarAnadir() = accion {
        cancelarAnadir()
        anadiendo = false
    }

    fun elegirCuenta(id: String) = accion {
        anadiendo = false
        elegirCuenta(id)
    }

    fun olvidarCuenta(id: String) = accion { olvidarCuenta(id) }

    fun salir() = accion {
        anadiendo = false
        salir()
    }

    fun salirDeTodas() = accion {
        anadiendo = false
        salirDeTodas()
    }

    private fun accion(alTerminar: () -> Unit = {}, bloque: suspend AccesoALaSesion.() -> Unit) {
        val s = sesion
        if (s == null || ocupado) return alTerminar()
        ocupado = true
        error = null
        viewModelScope.launch {
            try {
                withTimeout(limiteMs) { s.bloque() }
            } catch (_: TimeoutCancellationException) {
                error = "No ha llegado respuesta. Vuelve a intentarlo."
            } catch (e: CancellationException) {
                throw e
            } catch (e: ErrorSesion) {
                error = when {
                    // Cerrar la ventana de Google no es un error que haya que contar.
                    e.codigo == "google_cancelado" -> null
                    mostrarCodigos -> "${e.mensaje} [${e.codigo}]"
                    else -> e.mensaje
                }
            } finally {
                alTerminar()
                ocupado = false
            }
        }
    }

    private companion object {
        /** Entrar no puede quedarse esperando para siempre. Por encima de los 3 minutos que la librería espera a Google. */
        const val LIMITE_MS = 240_000L
    }
}
