package es.yosiftware.libros.sonido

import es.yosiftware.libros.push.MensajeDePush
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.SoundPool
import android.os.SystemClock
import android.util.Log
import androidx.annotation.RawRes
import androidx.core.content.edit
import es.yosiftware.libros.R
import es.yosiftware.libros.datos.modelos.TipoDeEstado
import java.util.concurrent.ConcurrentHashMap

// Los sonidos de la APK: efectos cortos que salen de `Libros API/scripts/ia_sonidos_apk.py` (ElevenLabs por la pasarela
// de IA, 6/11/2026), en WAV mono de 16 bits a 22 050 Hz, recortados y nivelados, en `res/raw/`. Suenan pocas veces y
// por algo que la persona ha hecho o le ha llegado: nunca al escribir ni en el autoguardado.

/** Cada sonido, con su archivo de `res/raw/`. */
enum class Sonido(@param:RawRes val recurso: Int) {
    /** Un logro de Libros conseguido (el evento `notificacion.creada` del tiempo real). */
    LOGRO(R.raw.logro),

    /** Una obra marcada como leída. */
    LIBRO_TERMINADO(R.raw.libro_terminado),

    /** Un capítulo nuevo guardado o el progreso de un club: las páginas avanzan. */
    PAGINA(R.raw.pagina),

    /** Una obra o una edición que entra en la biblioteca. */
    ESTANTERIA(R.raw.estanteria),
    MENSAJE_ENVIADO(R.raw.mensaje_enviado),

    /** Un mensaje de otra persona con su conversación abierta. */
    MENSAJE_RECIBIDO(R.raw.mensaje_recibido),

    /** Un push con la app delante (sin el aviso del sistema, que suena con el canal de avisos). */
    NOTIFICACION(R.raw.notificacion),

    /** Un borrado confirmado: una escena, una entrada, una nota, un mensaje… */
    BORRAR(R.raw.borrar),

    /** Un aviso de error ([es.yosiftware.libros.ui.componentes.Avisos]). */
    ERROR(R.raw.error),
}

/** Lo que usan los ViewModels de [Sonidos], para poder probarlos sin Android. */
fun interface Sonador {
    fun reproducir(sonido: Sonido)

    companion object {
        /** Sin sonidos (las muestras y las pruebas que no los miran). */
        val MUDO = Sonador {}
    }
}

/** Cuándo suena un sonido y cuál toca, sin Android: lo que se prueba en la JVM. */
object CuandoSuena {
    /** El mismo sonido no se repite antes de este tiempo: una racha de errores o de borrados suena una vez. */
    const val SEPARACION_MS = 1_500L

    /**
     * Si suena: con la preferencia encendida, el móvil con el timbre normal (en silencio o en vibración, no) y si el
     * mismo sonido no ha sonado hace menos de [separacion] ([ultimaVez] es `null` si no ha sonado aún).
     */
    fun suena(encendidos: Boolean, modoDeTimbre: Int, ultimaVez: Long?, ahora: Long, separacion: Long = SEPARACION_MS): Boolean =
        encendidos && modoDeTimbre == AudioManager.RINGER_MODE_NORMAL && (ultimaVez == null || ahora - ultimaVez >= separacion)

    /**
     * El sonido al guardar el estado de una obra: terminarla (pasar a «Leído») suena a libro terminado, aunque entre a
     * la vez en la biblioteca; entrar con otro estado, a estantería; lo demás no suena.
     */
    fun alGuardarEstado(nuevo: TipoDeEstado?, anterior: TipoDeEstado?, entra: Boolean): Sonido? = when {
        nuevo == TipoDeEstado.LEIDO && anterior != TipoDeEstado.LEIDO -> Sonido.LIBRO_TERMINADO
        entra -> Sonido.ESTANTERIA
        else -> null
    }

    /**
     * El sonido de un push con la app delante (que no saca el aviso del sistema, ni su sonido): el de los avisos. Un
     * logro ya suena al llegar por el tiempo real, y el chat, con su conversación abierta.
     */
    fun alLlegarUnPush(push: MensajeDePush): Sonido? =
        if (push.esChat || push.tipoNotificacion == "logro.conseguido") null else Sonido.NOTIFICACION
}

/** «Sonidos» en Preferencias: del móvil, no de la cuenta, y encendidos por defecto (como la escena al abrir un libro). */
object PreferenciaDeSonidos {
    private const val CLAVE = "sonidos"

    fun encendidos(contexto: Context): Boolean = contexto.getSharedPreferences("preferencias", Context.MODE_PRIVATE).getBoolean(CLAVE, true)

    fun cambiar(contexto: Context, encendidos: Boolean) =
        contexto.getSharedPreferences("preferencias", Context.MODE_PRIVATE).edit { putBoolean(CLAVE, encendidos) }
}

/**
 * El único reproductor de la app (`Datos.sonidos`): un `SoundPool` con todos precargados al arrancar, como sonidos de
 * la interfaz (`USAGE_ASSISTANCE_SONIFICATION`). Si algo falla (al cargar o al sonar), no suena y la app sigue igual.
 */
class Sonidos(contexto: Context) : Sonador {
    private val contexto = contexto.applicationContext
    private val audio = this.contexto.getSystemService(AudioManager::class.java)

    /** El id de cada sonido en el `SoundPool`, y los que ya están listos para sonar. */
    private val ids = ConcurrentHashMap<Sonido, Int>()
    private val listos: MutableSet<Int> = ConcurrentHashMap.newKeySet()
    private val ultimas = ConcurrentHashMap<Sonido, Long>()

    private val pool: SoundPool? = try {
        SoundPool.Builder()
            .setMaxStreams(2)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            .build()
            .also { pool ->
                pool.setOnLoadCompleteListener { _, id, estado -> if (estado == 0) listos += id }
                Sonido.entries.forEach { sonido -> ids[sonido] = pool.load(this.contexto, sonido.recurso, 1) }
            }
    } catch (error: RuntimeException) {
        Log.w(ETIQUETA, "Los sonidos no se han podido cargar", error)
        null
    }

    override fun reproducir(sonido: Sonido) {
        try {
            val pool = pool ?: return
            val id = ids[sonido]?.takeIf { it in listos } ?: return
            val ahora = SystemClock.elapsedRealtime()
            val modo = audio?.ringerMode ?: AudioManager.RINGER_MODE_SILENT
            if (!CuandoSuena.suena(PreferenciaDeSonidos.encendidos(contexto), modo, ultimas[sonido], ahora)) return
            ultimas[sonido] = ahora
            pool.play(id, VOLUMEN, VOLUMEN, 1, 0, 1f)
        } catch (error: RuntimeException) {
            Log.w(ETIQUETA, "El sonido ${sonido.name} no ha podido sonar", error)
        }
    }

    private companion object {
        /** Los archivos ya vienen nivelados: un poco por debajo del máximo, para que acompañen sin sobresaltar. */
        const val VOLUMEN = 0.8f
        const val ETIQUETA = "LibrosSonidos"
    }
}
