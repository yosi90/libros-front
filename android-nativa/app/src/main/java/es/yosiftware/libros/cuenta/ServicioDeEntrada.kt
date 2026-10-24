package es.yosiftware.libros.cuenta

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import es.yosiftware.libros.R

/**
 * Mantiene viva la app mientras se entra con Google (ecosistema-kit/APK.md, «Si el sistema congela tu app mientras
 * entras con Google»), como 3.5 Companion (`Fichas 3.5/companion/.../cuenta/ServicioDeEntrada.kt`). La ventana de
 * Google tapa la app, que pasa a `onStop`, y algunos sistemas (MagicOS, en el Honor Magic V3) la congelan al momento: si
 * Google tarda (por ejemplo, porque manda a la persona a confirmar en otra app), su respuesta llega a un proceso
 * congelado y se pierde. Un servicio en primer plano corto (`shortService`, Android 14 o más; antes, `dataSync`) lo
 * evita. Se para al terminar de entrar, y el sistema lo corta solo a los 3 minutos.
 */
class ServicioDeEntrada : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val gestor = getSystemService(NotificationManager::class.java)
        gestor.createNotificationChannel(NotificationChannel(CANAL, "Entrar con tu cuenta", NotificationManager.IMPORTANCE_LOW))
        val aviso: Notification = NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.mi_auto_stories)
            .setContentTitle("Entrando con tu cuenta de Yosiftware…")
            .setOngoing(true)
            .setSilent(true)
            .build()
        val tipo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE
        } else {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
        }
        try {
            ServiceCompat.startForeground(this, ID, aviso, tipo)
        } catch (_: RuntimeException) {
            // Si el sistema no deja (la app ya no estaba delante), se entra igual, sin esta protección.
            stopSelf()
        }
        return START_NOT_STICKY
    }

    /** El límite de un `shortService` (Android 14): si se llega, se para sin más. */
    override fun onTimeout(startId: Int) {
        stopSelf()
    }

    /** El de `dataSync` (Android 15, si el sistema lo pone), igual. */
    override fun onTimeout(startId: Int, fgsType: Int) {
        stopSelf()
    }

    companion object {
        private const val CANAL = "entrada"
        private const val ID = 7

        fun empezar(contexto: Context) {
            try {
                contexto.startForegroundService(Intent(contexto, ServicioDeEntrada::class.java))
            } catch (_: RuntimeException) {
                // Sin permiso para empezarlo ahora: se entra igual.
            }
        }

        fun terminar(contexto: Context) {
            contexto.stopService(Intent(contexto, ServicioDeEntrada::class.java))
        }
    }
}
