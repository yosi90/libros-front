package es.yosiftware.libros.push

import android.app.NotificationManager
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.datos.cuenta.Identidad
import es.yosiftware.libros.datos.repositorios.RepositorioDispositivos
import es.yosiftware.sesion.ConfiguracionSesion
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.SesionYosiftware
import java.security.MessageDigest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Cómo está el push en este móvil para la cuenta activa (Preferencias › Permisos del móvil). */
enum class EstadoDelPush { NO_DISPONIBLE, SIN_PERMISO, DESACTIVADO, ACTIVADO }

/**
 * El push de las cuentas de la app en este móvil (copia adaptada de `RegistroDePush.kt` de la app Yosiftware):
 * - **Registrar.** El dispositivo va ligado a la sesión que lo registra y la librería solo da tokens de la cuenta activa,
 *   así que cada cuenta registra el móvil cuando está activa y con la app a la vista: al entrar, al cambiar a ella y, si
 *   no, una vez al día (la plataforma borra los que no se usan en 60 días). Solo con el permiso de avisos (U1) y si la
 *   persona no lo ha desactivado en esa cuenta. El registro de las demás se conserva: su sesión sigue y le pueden llegar
 *   avisos (D2: solo de las cuentas con sesión).
 * - **Cambiar de cuenta.** Antes de enseñar la nueva, se cierran los avisos visibles de las otras (CAMBIO_DE_CUENTA.md,
 *   obligación 5). Cada aviso lleva en sus extras la clave resumida de su cuenta ([clave]), nunca el id en claro.
 * - **Desactivar** quita el dispositivo de la cuenta y no se vuelve a registrar solo.
 *
 * Lo que se guarda (`SharedPreferences("push")`) es del dispositivo, separado por entorno y cuenta con la clave resumida.
 */
class PushDeLaCuenta(
    private val contexto: Context,
    private val sesion: SesionYosiftware?,
    private val ambito: AmbitoDeCuenta,
    private val dispositivos: RepositorioDispositivos,
    private val entorno: String,
) {
    private val preferencias: SharedPreferences = contexto.getSharedPreferences("push", Context.MODE_PRIVATE)
    private val nombre = ConfiguracionSesion.nombreDelDispositivo(contexto)
    private val actual = MutableStateFlow(EstadoDelPush.NO_DISPONIBLE)
    val estado: StateFlow<EstadoDelPush> = actual.asStateFlow()

    private var aLaVista = false

    init {
        ambito.alCambiar { identidad ->
            cerrarAvisosDeOtras(identidad)
            if (identidad != null && aLaVista) registrarSiToca()
            recalcular()
        }
    }

    /** La app pasa a primer plano (`LibrosApp`): registra la cuenta activa si toca. */
    fun alVerse(visible: Boolean) {
        aLaVista = visible
        if (visible) registrarSiToca()
        recalcular()
    }

    /** FCM ha registrado (otra vez) la instalación: si el FID es otro, la cuenta activa lo vuelve a registrar. */
    fun alRegistrarse(fid: String) {
        if (fid == preferencias.getString(FID, null)) return
        preferencias.edit().putString(FID, fid).apply()
        registrarSiToca(forzar = true)
    }

    /** Se ha concedido el permiso de avisos: se registra al momento. */
    fun alConcederPermiso() {
        registrarSiToca(forzar = true)
        recalcular()
    }

    fun activar() {
        val clave = claveActiva() ?: return
        preferencias.edit().putStringSet(APAGADAS, apagadas() - clave).apply()
        registrarSiToca(forzar = true)
        recalcular()
    }

    fun desactivar() {
        val clave = claveActiva() ?: return
        preferencias.edit().putStringSet(APAGADAS, apagadas() + clave).remove(ULTIMO + clave).apply()
        recalcular()
        val guardado = preferencias.getLong(ID + clave, 0)
        ambito.alcance.launch {
            try {
                val id = guardado.takeIf { it > 0 } ?: ambito.mientrasSeaLaMisma { dispositivos.este() } ?: return@launch
                ambito.mientrasSeaLaMisma { dispositivos.quitar(id) }
                preferencias.edit().remove(ID + clave).apply()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // `dispositivo_no_encontrado`: ya no estaba. Sin red: la marca queda y no se registra más.
                Log.w(PushLibros.ETIQUETA, "No se ha podido quitar el dispositivo: ${ErrorDeLibros.de(e).codigo}")
            }
        }
    }

    /** Recalcula [estado] (al volver de Ajustes, al conceder el permiso…). */
    fun recalcular() {
        actual.value = when {
            !PushLibros.disponible || sesion == null -> EstadoDelPush.NO_DISPONIBLE
            !PushLibros.permitido(contexto) -> EstadoDelPush.SIN_PERMISO
            claveActiva()?.let { it in apagadas() } != false -> EstadoDelPush.DESACTIVADO
            else -> EstadoDelPush.ACTIVADO
        }
    }

    private fun registrarSiToca(forzar: Boolean = false) {
        if (!PushLibros.disponible || !PushLibros.permitido(contexto)) return
        if (sesion?.estado?.value !is EstadoSesion.ConSesion) return
        val clave = claveActiva() ?: return
        if (clave in apagadas()) return
        val ultimo = preferencias.getLong(ULTIMO + clave, 0)
        if (!forzar && System.currentTimeMillis() - ultimo < UN_DIA) return
        ambito.alcance.launch {
            try {
                val fid = PushLibros.fid() ?: return@launch
                val id = ambito.mientrasSeaLaMisma { dispositivos.registrar(fid, nombre) }
                preferencias.edit().putString(FID, fid).putLong(ULTIMO + clave, System.currentTimeMillis()).putLong(ID + clave, id).apply()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // Sin red o `demasiadas_peticiones`: se reintenta al volver a la app.
                Log.w(PushLibros.ETIQUETA, "No se ha podido registrar el móvil: ${ErrorDeLibros.de(e).codigo}")
            }
        }
    }

    private fun cerrarAvisosDeOtras(identidad: Identidad?) {
        val propia = identidad?.let { clave(entorno, it.cuentaId) }
        val gestor = contexto.getSystemService(NotificationManager::class.java) ?: return
        runCatching {
            gestor.activeNotifications
                .filter { it.notification.channelId == PushLibros.CANAL_AVISOS || it.notification.channelId == PushLibros.CANAL_MENSAJES }
                .filter { it.notification.extras.getString(EXTRA_CUENTA) != propia }
                .forEach { gestor.cancel(it.tag, it.id) }
        }
    }

    private fun claveActiva(): String? = ambito.identidad.value?.let { clave(entorno, it.cuentaId) }

    private fun apagadas(): Set<String> = preferencias.getStringSet(APAGADAS, emptySet()).orEmpty()

    companion object {
        /** En los extras de cada aviso: la clave resumida de su cuenta. */
        const val EXTRA_CUENTA = "cuenta"
        private const val FID = "fid"
        private const val APAGADAS = "apagadas"
        private const val ULTIMO = "ultimo:"
        private const val ID = "id:"
        private const val UN_DIA = 24 * 60 * 60 * 1000L

        /** La clave de una cuenta en este entorno: su id (con o sin guiones) resumido con SHA-256. */
        fun clave(entorno: String, cuenta: String): String =
            MessageDigest.getInstance("SHA-256").digest("$entorno:${cuenta.replace("-", "").lowercase()}".toByteArray())
                .take(16).joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }
}
