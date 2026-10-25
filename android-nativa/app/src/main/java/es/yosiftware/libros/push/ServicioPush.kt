package es.yosiftware.libros.push

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.os.bundleOf
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import es.yosiftware.libros.BuildConfig
import es.yosiftware.libros.LibrosApp
import es.yosiftware.libros.MainActivity
import es.yosiftware.libros.R
import es.yosiftware.libros.datos.red.Red
import es.yosiftware.sesion.EstadoSesion
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.Request

/**
 * Recibe el push de la plataforma y compone el aviso (copia adaptada de `ServicioPush.kt` de la app Yosiftware). Corre
 * en un hilo de FCM, con unos segundos de margen:
 * 1. espera a que la sesión deje de comprobarse (con la app en frío, el proceso arranca por el push), como mucho 5 s; si
 *    no llega, no se enseña nada: sin una cuenta comprobable, nada privado;
 * 2. decide si es de Libros y para qué cuenta ([FiltroDePush]);
 * 3. sin permiso de avisos, nada (ni se da por leída);
 * 4. con la app delante y la cuenta activa, no hay aviso del sistema: lo enseña la app (D4);
 * 5. si no, el aviso, con su versión pública para la pantalla de bloqueo.
 */
class ServicioPush : FirebaseMessagingService() {
    override fun onMessageReceived(mensaje: RemoteMessage) {
        val push = MensajeDePush.de(mensaje.data) ?: return
        val app = application as LibrosApp
        val sesion = app.sesion ?: return
        val estado = runBlocking { withTimeoutOrNull(5_000) { sesion.estado.first { it !is EstadoSesion.Comprobando } } } ?: return
        val activa = when (estado) {
            is EstadoSesion.ConSesion -> estado.cuenta.id
            is EstadoSesion.SinConexion -> sesion.cuentas.value.firstOrNull { it.activa }?.id
            else -> null
        }
        val cuentas = sesion.cuentas.value.map { CuentaDelMovil(it.id, it.alias, it.caducada) }
        val decision = FiltroDePush.decidir(push, activa, cuentas, PushLibros.origenesDeLibros) as? DecisionDePush.Enseñar ?: return
        if (!PushLibros.permitido(this)) return
        if (decision.paraAlias == null && app.aLaVista) {
            app.avisoRecibido.tryEmit(push)
            return
        }
        avisar(push, decision.paraAlias)
    }

    override fun onNewToken(token: String) = Unit

    override fun onRegistered(fid: String) {
        (application as LibrosApp).datos.push.alRegistrarse(fid)
    }

    @SuppressLint("MissingPermission") // Se comprueba con PushLibros.permitido.
    private fun avisar(push: MensajeDePush, paraOtraCuenta: String?) {
        val entorno = if (BuildConfig.PLATAFORMA_QA) "qa" else "produccion"
        val abrir = Intent(this, MainActivity::class.java)
            .setAction(AperturaDeAviso.ACCION)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .also { AperturaDeAviso.de(push).ponerEn(it) }
        val pulsar = PendingIntent.getActivity(this, push.etiqueta.hashCode(), abrir, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val canal = if (push.esChat) PushLibros.CANAL_MENSAJES else PushLibros.CANAL_AVISOS
        val color = getColor(R.color.primario)
        // Lo que se ve con el móvil bloqueado: sin contenido (los textos de la APK de Capacitor en el chat).
        val publica = NotificationCompat.Builder(this, canal)
            .setSmallIcon(R.drawable.mi_auto_stories)
            .setColor(color)
            .setContentTitle(if (push.esChat) "Nuevo mensaje" else "Libros")
            .setContentText(if (push.esChat) "Tienes un mensaje nuevo" else "Tienes un aviso nuevo")
            .build()
        val aviso = NotificationCompat.Builder(this, canal)
            .setSmallIcon(R.drawable.mi_auto_stories)
            .setColor(color)
            .setContentTitle(push.titulo)
            .setContentText(push.cuerpo)
            .setStyle(push.cuerpo?.let { NotificationCompat.BigTextStyle().bigText(it) })
            .setSubText(paraOtraCuenta?.let { "Para @$it" })
            .setLargeIcon(push.icono?.let(::imagen))
            .setCategory(if (push.esChat) NotificationCompat.CATEGORY_MESSAGE else NotificationCompat.CATEGORY_SOCIAL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publica)
            .setAutoCancel(true)
            .setContentIntent(pulsar)
            .addExtras(bundleOf(PushDeLaCuenta.EXTRA_CUENTA to push.cuenta?.let { PushDeLaCuenta.clave(entorno, it) }))
            .build()
        try {
            // La misma etiqueta sustituye al aviso anterior (el chat, uno por conversación).
            NotificationManagerCompat.from(this).notify(push.etiqueta, ID_DEL_AVISO, aviso)
        } catch (_: SecurityException) {
            // El permiso se ha retirado entre la comprobación y el aviso.
        }
    }

    /** El avatar o el icono de la web, si llega en unos segundos; si no, el aviso sale sin él. */
    private fun imagen(direccion: String): Bitmap? {
        if (!direccion.startsWith("https://")) return null
        val http = Red.cliente.newBuilder().callTimeout(5, TimeUnit.SECONDS).build()
        return try {
            http.newCall(Request.Builder().url(direccion).build()).execute().use { respuesta ->
                if (!respuesta.isSuccessful) null else respuesta.body.bytes().let { BitmapFactory.decodeByteArray(it, 0, it.size) }
            }
        } catch (_: IOException) {
            null
        }
    }

    private companion object {
        const val ID_DEL_AVISO = 1
    }
}

/** Lo que lleva el aviso a la app al pulsarlo: para qué cuenta es, adónde lleva y la firma para darlo por leído. */
data class AperturaDeAviso(
    val cuenta: String?,
    val enlace: String?,
    val acuse: String?,
    val tipo: String,
    val tipoNotificacion: String?,
    val conversacion: Long?,
) {
    fun ponerEn(intent: Intent) {
        intent.putExtra(CUENTA, cuenta).putExtra(ENLACE, enlace).putExtra(ACUSE, acuse).putExtra(TIPO, tipo)
            .putExtra(TIPO_DE_NOTIFICACION, tipoNotificacion)
        conversacion?.let { intent.putExtra(CONVERSACION, it) }
    }

    /** El mensaje equivalente, para decidir el destino con [DestinoDeEnlace]. */
    val comoMensaje: MensajeDePush
        get() = MensajeDePush(tipo, "", null, enlace, null, "", null, null, tipoNotificacion, null, acuse, conversacion, cuenta)

    companion object {
        const val ACCION = "es.yosiftware.libros.ABRIR_AVISO"
        private const val CUENTA = "cuenta"
        private const val ENLACE = "enlace"
        private const val ACUSE = "acuse"
        private const val TIPO = "tipo"
        private const val TIPO_DE_NOTIFICACION = "tipoNotificacion"
        private const val CONVERSACION = "conversacion"

        fun de(push: MensajeDePush) = AperturaDeAviso(push.cuenta, push.enlace, push.acuse, push.tipo, push.tipoNotificacion, push.conversacion)

        fun de(intent: Intent?): AperturaDeAviso? {
            if (intent?.action != ACCION) return null
            return AperturaDeAviso(
                cuenta = intent.getStringExtra(CUENTA),
                enlace = intent.getStringExtra(ENLACE),
                acuse = intent.getStringExtra(ACUSE),
                tipo = intent.getStringExtra(TIPO) ?: "notificacion",
                tipoNotificacion = intent.getStringExtra(TIPO_DE_NOTIFICACION),
                conversacion = intent.getLongExtra(CONVERSACION, -1).takeIf { it > 0 },
            )
        }
    }
}
