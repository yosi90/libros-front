package es.yosiftware.libros.ui.editor

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import es.yosiftware.libros.LibrosApp
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import java.io.File
import kotlinx.coroutines.launch

/**
 * El dictado por voz a los editores de escenas y entradas (roadmap de la IA de la API, IA3). Un solo botón en la barra
 * del editor; cómo se dicta lo elige la persona en Preferencias › Lectura y escritura ([PreferenciaDeDictado]):
 * - **del móvil**, gratis: el reconocedor de voz de Android, que escribe cada frase al terminarla;
 * - **con su clave de IA**: graba un trozo (hasta [GrabadoraParaIA.MAXIMO_MS]) y lo transcribe la API por la pasarela,
 *   con los nombres del libro como pista. El audio no se guarda.
 */
object UnirDictado {
    /**
     * Lo que se inserta tras [antes]: con un espacio delante si hace falta, y con mayúscula al empezar una frase (al
     * principio, tras un salto de línea o tras «.», «?», «!» o «…»). Sin espacio delante de un signo de puntuación.
     */
    fun texto(antes: CharSequence, dictado: String): String {
        val limpio = dictado.trim()
        if (limpio.isEmpty()) return ""
        val previo = antes.trimEnd { it == ' ' || it == ' ' }
        val alEmpezarFrase = previo.isEmpty() || previo.last() in "\n.?!…"
        val cuerpo = if (alEmpezarFrase) limpio.replaceFirstChar { it.titlecase() } else limpio
        val hueco = antes.isNotEmpty() && !antes.last().isWhitespace() && cuerpo.first() !in ".,;:?!…)»”"
        return (if (hueco) " " else "") + cuerpo
    }
}

/** Cómo se dicta: lo elige la persona en Preferencias. Es del móvil, no de la cuenta. */
enum class ModoDeDictado { DEL_MOVIL, CON_IA }

object PreferenciaDeDictado {
    private const val ARCHIVO = "preferencias"
    private const val MODO = "dictado_modo"
    private const val MODELO = "dictado_modelo"
    private const val PROVEEDOR = "dictado_proveedor"

    data class Eleccion(val modo: ModoDeDictado, val modelo: String?, val proveedor: String?) {
        /** Con IA solo si hay un modelo elegido; si no, del móvil. */
        val conIA: Boolean get() = modo == ModoDeDictado.CON_IA && modelo != null && proveedor != null
    }

    fun leer(contexto: Context): Eleccion {
        val p = contexto.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)
        val modo = runCatching { ModoDeDictado.valueOf(p.getString(MODO, null) ?: "") }.getOrDefault(ModoDeDictado.DEL_MOVIL)
        return Eleccion(modo, p.getString(MODELO, null), p.getString(PROVEEDOR, null))
    }

    fun guardar(contexto: Context, eleccion: Eleccion) = contexto.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE).edit {
        putString(MODO, eleccion.modo.name)
        putString(MODELO, eleccion.modelo)
        putString(PROVEEDOR, eleccion.proveedor)
    }

    fun delMovilDisponible(contexto: Context): Boolean = SpeechRecognizer.isRecognitionAvailable(contexto)
}

/** El reconocedor de voz de Android, seguido: al terminar cada frase la escribe y vuelve a escuchar hasta [parar]. */
class ReconocedorDelSistema(
    contexto: Context,
    private val alTexto: (String) -> Unit,
    private val alTerminar: (String?) -> Unit,
) {
    private val reconocedor = SpeechRecognizer.createSpeechRecognizer(contexto)
    private var activo = false
    private val intento = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES")
        .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
        .putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L)

    init {
        reconocedor.setRecognitionListener(object : RecognitionListener {
            override fun onResults(resultados: Bundle?) {
                resultados?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let { if (it.isNotBlank()) alTexto(it) }
                if (activo) reconocedor.startListening(intento) else alTerminar(null)
            }

            override fun onError(error: Int) {
                // Un silencio o algo que no se entiende: se sigue escuchando mientras la persona no pare.
                if (activo && (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT)) {
                    reconocedor.startListening(intento)
                    return
                }
                val estabaActivo = activo
                activo = false
                alTerminar(if (estabaActivo) mensajeDe(error) else null)
            }

            override fun onReadyForSpeech(params: Bundle?) = Unit
            override fun onBeginningOfSpeech() = Unit
            override fun onRmsChanged(rmsdB: Float) = Unit
            override fun onBufferReceived(buffer: ByteArray?) = Unit
            override fun onEndOfSpeech() = Unit
            override fun onPartialResults(parciales: Bundle?) = Unit
            override fun onEvent(eventType: Int, params: Bundle?) = Unit
        })
    }

    fun empezar() {
        activo = true
        reconocedor.startListening(intento)
    }

    /** Termina la frase que se esté diciendo (llega en `onResults`) y no vuelve a escuchar. */
    fun parar() {
        activo = false
        reconocedor.stopListening()
    }

    fun destruir() {
        activo = false
        reconocedor.destroy()
    }

    private fun mensajeDe(error: Int): String = when (error) {
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Para dictar, Libros necesita el micrófono."
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "El dictado del móvil necesita conexión."
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "El reconocedor de voz está ocupado. Prueba otra vez."
        else -> "El dictado se ha cortado. Prueba otra vez."
    }
}

/**
 * Graba un trozo de audio (AAC en MP4, 16 kHz, mono) para transcribirlo con la IA. Mira el volumen mientras graba: sin
 * voz ([huboVoz]) no se envía, porque los modelos de transcripción se inventan frases con el silencio.
 */
class GrabadoraParaIA(private val contexto: Context, private val alLimite: () -> Unit) {
    private var grabadora: MediaRecorder? = null
    private val archivo = File(contexto.cacheDir, "dictado.m4a")
    private val principal = Handler(Looper.getMainLooper())
    private var picoDeVolumen = 0
    private val medir = object : Runnable {
        override fun run() {
            val actual = grabadora ?: return
            picoDeVolumen = maxOf(picoDeVolumen, runCatching { actual.maxAmplitude }.getOrDefault(0))
            principal.postDelayed(this, 150)
        }
    }

    /** Si en lo grabado se ha oído algo más que el ruido de fondo. */
    val huboVoz: Boolean get() = picoDeVolumen >= UMBRAL_DE_VOZ

    fun empezar() {
        archivo.delete()
        picoDeVolumen = 0
        @Suppress("DEPRECATION")
        val nueva = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) MediaRecorder(contexto) else MediaRecorder()
        nueva.apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioSamplingRate(16_000)
            setAudioChannels(1)
            setAudioEncodingBitRate(32_000)
            setMaxDuration(MAXIMO_MS)
            setOnInfoListener { _, que, _ -> if (que == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) alLimite() }
            setOutputFile(archivo.path)
            prepare()
            start()
        }
        grabadora = nueva
        principal.postDelayed(medir, 150)
    }

    /** El audio grabado, o null si fue demasiado corto para guardarse. El archivo se borra. */
    fun parar(): ByteArray? {
        val actual = grabadora ?: return null
        medir.run()
        grabadora = null
        principal.removeCallbacks(medir)
        val bien = runCatching { actual.stop() }.isSuccess
        actual.release()
        val datos = if (bien && archivo.exists()) archivo.readBytes() else null
        archivo.delete()
        return datos
    }

    fun cancelar() {
        principal.removeCallbacks(medir)
        grabadora?.let { runCatching { it.stop() }; it.release() }
        grabadora = null
        archivo.delete()
    }

    companion object {
        /** Tres minutos por trozo: de sobra para dictar y lejos de los 10 MB de la API. */
        const val MAXIMO_MS = 180_000
        const val TIPO = "audio/mp4"
        /** El pico de `maxAmplitude` (de 0 a 32767) por debajo del cual se toma por silencio: una voz cerca pasa de 3000. */
        const val UMBRAL_DE_VOZ = 1500
    }
}

private enum class EstadoDelDictado { PARADO, ESCUCHANDO, TRANSCRIBIENDO }

/**
 * El botón de la barra del editor: el micrófono para empezar y, mientras se dicta, el cuadrado para parar (en el color
 * de error, para que se vea que está escuchando). Con la IA, al parar se transcribe (con su rueda). No sale si no hay
 * forma de dictar: ni reconocedor en el móvil ni la IA elegida.
 */
@Composable
internal fun BotonDeDictado(campo: CampoRtf?, idLibro: Int?) {
    val contexto = LocalContext.current
    val colores = LocalColores.current
    val alcance = rememberCoroutineScope()
    val eleccion = remember { PreferenciaDeDictado.leer(contexto) }
    val delMovil = remember { PreferenciaDeDictado.delMovilDisponible(contexto) }
    if (!eleccion.conIA && !delMovil) return
    var estado by remember { mutableStateOf(EstadoDelDictado.PARADO) }
    val avisar = { texto: String -> Toast.makeText(contexto, texto, Toast.LENGTH_LONG).show() }

    var reconocedor by remember { mutableStateOf<ReconocedorDelSistema?>(null) }
    var grabadora by remember { mutableStateOf<GrabadoraParaIA?>(null) }
    DisposableEffect(Unit) {
        onDispose {
            reconocedor?.destruir()
            grabadora?.cancelar()
        }
    }

    fun transcribir(audio: ByteArray) {
        val modelo = eleccion.modelo ?: return
        val proveedor = eleccion.proveedor ?: return
        estado = EstadoDelDictado.TRANSCRIBIENDO
        alcance.launch {
            try {
                val texto = LibrosApp.datos(contexto).dictado.dictar(audio, GrabadoraParaIA.TIPO, proveedor, modelo, idLibro)
                if (texto.isNotBlank()) campo?.insertarDictado(texto) else avisar("No se ha entendido nada. Prueba otra vez.")
            } catch (e: ErrorDeLibros) {
                avisar(e.mensajeO("No se ha podido transcribir el dictado."))
            } finally {
                estado = EstadoDelDictado.PARADO
            }
        }
    }

    fun pararGrabacion() {
        val actual = grabadora
        val audio = actual?.parar()
        grabadora = null
        when {
            audio == null || audio.isEmpty() -> {
                estado = EstadoDelDictado.PARADO
                avisar("La grabación ha sido demasiado corta.")
            }
            !actual.huboVoz -> {
                estado = EstadoDelDictado.PARADO
                avisar("No se ha oído nada. Acerca el móvil y prueba otra vez.")
            }
            else -> transcribir(audio)
        }
    }

    fun empezar() {
        try {
            if (eleccion.conIA) {
                grabadora = GrabadoraParaIA(contexto) { pararGrabacion() }.also { it.empezar() }
            } else {
                reconocedor = (reconocedor ?: ReconocedorDelSistema(contexto, alTexto = { campo?.insertarDictado(it) }) { aviso ->
                    estado = EstadoDelDictado.PARADO
                    aviso?.let(avisar)
                }).also { it.empezar() }
            }
            estado = EstadoDelDictado.ESCUCHANDO
        } catch (e: Exception) {
            grabadora?.cancelar()
            grabadora = null
            estado = EstadoDelDictado.PARADO
            avisar("No se ha podido abrir el micrófono.")
        }
    }

    val permiso = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { concedido ->
        if (concedido) empezar() else avisar("Para dictar, Libros necesita el micrófono. Puedes darle permiso en los ajustes del móvil.")
    }

    val escuchando = estado == EstadoDelDictado.ESCUCHANDO
    val forma = RoundedCornerShape(6.dp)
    Box(
        Modifier.size(28.dp).clip(forma)
            .background(if (escuchando) colores.error else colores.superficie)
            .border(1.dp, if (escuchando) colores.error else Color.Transparent, forma)
            .clickable(enabled = estado != EstadoDelDictado.TRANSCRIBIENDO) {
                when {
                    escuchando && eleccion.conIA -> pararGrabacion()
                    escuchando -> reconocedor?.parar()
                    ContextCompat.checkSelfPermission(contexto, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED -> empezar()
                    else -> permiso.launch(Manifest.permission.RECORD_AUDIO)
                }
            }
            .semantics {
                contentDescription = when (estado) {
                    EstadoDelDictado.PARADO -> if (eleccion.conIA) "Dictar con tu clave de IA" else "Dictar"
                    EstadoDelDictado.ESCUCHANDO -> "Parar el dictado"
                    EstadoDelDictado.TRANSCRIBIENDO -> "Transcribiendo el dictado"
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        if (estado == EstadoDelDictado.TRANSCRIBIENDO) {
            CircularProgressIndicator(Modifier.size(13.dp), color = colores.primario, strokeWidth = 1.5.dp)
        } else {
            Icon(
                painterResource(if (escuchando) Iconos.stop else Iconos.mic),
                contentDescription = null,
                tint = if (escuchando) Color.White else colores.tintaSuave,
                modifier = Modifier.size(13.dp),
            )
        }
    }
}
