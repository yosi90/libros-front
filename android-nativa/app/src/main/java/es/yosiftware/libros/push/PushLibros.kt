package es.yosiftware.libros.push

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.tasks.Task
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.installations.FirebaseInstallations
import com.google.firebase.messaging.FirebaseMessaging
import es.yosiftware.libros.BuildConfig
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * El push central de la plataforma (hito 12; copia de `apps/social-android/…/push/Push.kt`). La plataforma envía por el
 * identificador de instalación de Firebase (FID) de los dispositivos que registra cada sesión
 * (`POST /v1/cuenta/dispositivos`) un mensaje solo de datos, y la app compone el aviso ([ServicioPush]).
 *
 * Firebase se inicia a mano con los datos del `google-services.json` del entorno que el build copia a `BuildConfig`
 * (sin el plugin de `google-services`); si faltan, no hay push y la app sigue igual. Solo la mensajería: sin analítica
 * (apagada en el manifiesto) ni nada más de Firebase.
 */
object PushLibros {
    /** Lo que te pasa en Libros, y los mensajes del chat: dos canales, para silenciar el chat aparte. */
    const val CANAL_AVISOS = "avisos"
    const val CANAL_MENSAJES = "mensajes"

    /** El del servicio de entrada con Google (cuenta/ServicioDeEntrada.kt). */
    private const val CANAL_ENTRADA = "entrada"

    @Volatile
    var disponible: Boolean = false
        private set

    /**
     * Los orígenes de la web de Libros de este entorno. En QA, los enlaces de la API de Libros van a
     * `libros.dev.yosiftware.es` y los de la plataforma a `qa-libros.yosiftware.es`: valen los dos.
     */
    val origenesDeLibros: List<String> =
        if (BuildConfig.PLATAFORMA_QA) listOf(BuildConfig.WEB_LIBROS, "https://libros.dev.yosiftware.es/") else listOf(BuildConfig.WEB_LIBROS)

    /** En la `Application`: crea los canales e inicia Firebase si el entorno lo trae. */
    fun iniciar(contexto: Context) {
        crearCanales(contexto)
        if (BuildConfig.FIREBASE_APP.isEmpty() || BuildConfig.FIREBASE_REMITENTE.isEmpty()) return
        val opciones = FirebaseOptions.Builder()
            .setApplicationId(BuildConfig.FIREBASE_APP)
            .setApiKey(BuildConfig.FIREBASE_CLAVE_API)
            .setProjectId(BuildConfig.FIREBASE_PROYECTO)
            .setGcmSenderId(BuildConfig.FIREBASE_REMITENTE)
            .build()
        try {
            if (FirebaseApp.getApps(contexto).isEmpty()) FirebaseApp.initializeApp(contexto, opciones)
            // El registro automático sigue apagado (manifiesto): con el modelo por FID se registra a mano ([fid]).
            disponible = true
        } catch (error: IllegalStateException) {
            Log.w(ETIQUETA, "Firebase no se ha podido iniciar", error)
            disponible = false
        }
    }

    /** El FID de esta instalación, ya registrada en FCM; `null` sin push o si Firebase no responde. */
    suspend fun fid(): String? {
        if (!disponible) return null
        val registrada = esperar(FirebaseMessaging.getInstance().register()) != null
        if (!registrada) return null
        return esperar(FirebaseInstallations.getInstance().id) as String?
    }

    /** El resultado de una tarea de Firebase, o `null` si falla (para un `Task<Void>`, `Unit` si va bien). */
    private suspend fun <T> esperar(tarea: Task<T>): Any? = suspendCancellableCoroutine { continuacion ->
        tarea.addOnCompleteListener { hecha ->
            // El motivo, en el registro del sistema (sin datos de la persona).
            if (!hecha.isSuccessful) Log.w(ETIQUETA, "Firebase no ha podido registrar el móvil", hecha.exception)
            continuacion.resume(if (hecha.isSuccessful) hecha.result ?: Unit else null)
        }
    }

    /** Si los avisos se pueden enseñar: el permiso (Android 13 en adelante) y las notificaciones de la app encendidas. */
    fun permitido(contexto: Context): Boolean {
        val permiso = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(contexto, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        return permiso && NotificationManagerCompat.from(contexto).areNotificationsEnabled()
    }

    private fun crearCanales(contexto: Context) {
        val gestor = contexto.getSystemService(NotificationManager::class.java) ?: return
        gestor.createNotificationChannel(
            NotificationChannel(CANAL_AVISOS, "Avisos", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Lo que te pasa en Libros: tus peticiones, tus clubes y tus reportes."
                lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
            },
        )
        gestor.createNotificationChannel(
            NotificationChannel(CANAL_MENSAJES, "Mensajes", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Los mensajes nuevos del chat, uno por conversación."
                lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
            },
        )
        // La APK nativa se instala encima de la de Capacitor: sus canales («chat-messages», el de FCM por defecto…)
        // seguirían en Ajustes sin usarse.
        val propios = setOf(CANAL_AVISOS, CANAL_MENSAJES, CANAL_ENTRADA)
        gestor.notificationChannels.map { it.id }.filterNot { it in propios }.forEach(gestor::deleteNotificationChannel)
    }

    const val ETIQUETA = "LibrosPush"
}
