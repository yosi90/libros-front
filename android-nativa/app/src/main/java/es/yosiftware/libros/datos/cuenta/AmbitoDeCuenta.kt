package es.yosiftware.libros.datos.cuenta

import es.yosiftware.sesion.EstadoSesion
import java.io.File
import java.security.MessageDigest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** De quién es lo que se ve: el entorno, la cuenta y la generación en la que empezó. */
data class Identidad(val entorno: String, val cuentaId: String, val generacion: Long)

/**
 * El ámbito de la cuenta (ecosistema-kit/CAMBIO_DE_CUENTA.md y APK.md, «Cambiar de cuenta dentro de la app»): la pieza
 * común que usan los datos y los ViewModels para no mezclar cuentas.
 *
 * - **Identidad.** Cada cambio de `ConSesion.cuenta.id` es una identidad nueva, y cada paso por `Comprobando`,
 *   `SinSesion` o un paso de entrar termina la anterior, aunque después vuelva la misma (A → B → A, o A → Comprobando →
 *   A al elegir otra vez la misma cuenta). `SinConexion` no termina la identidad que hubiera: es la misma sesión
 *   guardada, sin red; si no la había, es la cuenta activa guardada en la app ([cuentaActivaGuardada]).
 * - **Generación.** Sube con cada identidad nueva ([actual]). Lo que empezó en una generación anterior se descarta al
 *   llegar (`exigir`, [mientrasSeaLaMisma]), aunque la cuenta haya vuelto: no se pinta, no se reintenta ni se guarda.
 * - **Trabajos.** [alcance] es el de la identidad de ahora: se cancela entero al cambiar (canales, sondeos, cachés que
 *   se llenan…). Los ViewModels cancelan los suyos con [ViewModelDeCuenta].
 * - **Persistencia.** Todo lo privado que se guarde va por entorno y cuenta: [carpeta] y [clave]. Lo de una cuenta se
 *   queda con ella hasta que vuelva; no se borra al cambiar ni se entrega a la otra.
 * - **Memoria.** Quien guarde algo de la cuenta en memoria lo vacía en [alCambiar].
 */
class AmbitoDeCuenta(
    /** `qa` o `produccion`: dos compilaciones distintas, pero también se separa aquí por si comparten carpeta. */
    private val entorno: String,
    private val padre: CoroutineScope,
    private val cuentaActivaGuardada: () -> String? = { null },
) : Generacion {
    private var generacion = 0L
    private val identidadActual = MutableStateFlow<Identidad?>(null)
    private val oyentes = mutableListOf<(Identidad?) -> Unit>()
    private var trabajos: Job = SupervisorJob(padre.coroutineContext[Job])

    /** La identidad de ahora; `null` sin cuenta (al arrancar, mientras se comprueba, sin sesión o entrando). */
    val identidad: StateFlow<Identidad?> = identidadActual.asStateFlow()

    /** El alcance de la identidad de ahora: lo que se lance en él se cancela al cambiar de cuenta. */
    @Volatile
    var alcance: CoroutineScope = CoroutineScope(padre.coroutineContext + trabajos)
        private set

    @Synchronized
    override fun actual(): Long = generacion

    /** Escucha [estados] (el de `SesionYosiftware`) en el hilo principal, sin esperar a la composición. */
    fun escuchar(estados: Flow<EstadoSesion>) {
        padre.launch(Dispatchers.Main.immediate) { estados.collect(::alCambiarEstado) }
    }

    /** Aplica un estado de la sesión. Público para las pruebas y para quien no tenga el flujo. */
    fun alCambiarEstado(estado: EstadoSesion) {
        val anterior = identidadActual.value
        val cuenta = when (estado) {
            is EstadoSesion.ConSesion -> estado.cuenta.id
            is EstadoSesion.SinConexion -> anterior?.cuentaId ?: cuentaActivaGuardada()
            else -> null
        }
        if (cuenta == anterior?.cuentaId) return
        val nueva = synchronized(this) {
            generacion++
            cuenta?.let { Identidad(entorno, it, generacion) }
        }
        // Lo que empezó con la anterior se corta antes de enseñar nada de la nueva.
        trabajos.cancel()
        trabajos = SupervisorJob(padre.coroutineContext[Job])
        alcance = CoroutineScope(padre.coroutineContext + trabajos)
        identidadActual.value = nueva
        synchronized(oyentes) { oyentes.toList() }.forEach { it(nueva) }
    }

    /** [accion] se llama con cada identidad nueva (o `null`), después de cancelar los trabajos de la anterior. */
    fun alCambiar(accion: (Identidad?) -> Unit): () -> Unit {
        synchronized(oyentes) { oyentes += accion }
        return { synchronized(oyentes) { oyentes -= accion } }
    }

    /**
     * Ejecuta [bloque] y devuelve su resultado solo si la identidad sigue siendo la del principio; si ha cambiado
     * (aunque haya vuelto la misma cuenta), lanza [RespuestaDeOtraCuenta] y el resultado se descarta.
     */
    suspend fun <T> mientrasSeaLaMisma(bloque: suspend () -> T): T {
        val deInicio = actual()
        val resultado = bloque()
        exigir(deInicio)
        return resultado
    }

    /**
     * La carpeta de la cuenta de ahora dentro de [base]: `base/<entorno>/<cuenta>`, con el id de la cuenta resumido
     * (SHA-256) para que no aparezca en las rutas. `null` sin cuenta: sin identidad no se guarda nada privado.
     */
    fun carpeta(base: File): File? = identidadActual.value?.let { File(File(base, it.entorno), resumen(it.cuentaId)) }

    /** Una clave de la cuenta de ahora para guardar [nombre] (preferencias, cachés en memoria): `entorno:cuenta:nombre`. */
    fun clave(nombre: String): String? = identidadActual.value?.let { "${it.entorno}:${resumen(it.cuentaId)}:$nombre" }

    private fun resumen(cuentaId: String): String =
        MessageDigest.getInstance("SHA-256").digest(cuentaId.toByteArray()).take(16).joinToString("") { "%02x".format(it.toInt() and 0xff) }
}
