package es.yosiftware.libros.cuenta

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import androidx.core.net.toUri
import es.yosiftware.libros.BuildConfig

/**
 * Lo de la cuenta que se hace fuera de la app, en el navegador del sistema (ecosistema-kit/APK.md, «Entrar», puntos 4 a
 * 6): crear una cuenta, recuperar la contraseña, confirmar el correo, la web social y «Errores y propuestas».
 */
object Enlaces {
    /**
     * «Errores y propuestas»: crearlos es solo de las webs, con el SDK, así que se abre la web de Libros con `?reportar`,
     * que lanza `yosiftware.reportar()` al cargar (APK.md, punto 6).
     */
    val reportar: String get() = BuildConfig.WEB_LIBROS.trimEnd('/') + "/?reportar"

    fun abrir(contexto: Context, direccion: String) {
        try {
            contexto.startActivity(Intent(Intent.ACTION_VIEW, direccion.toUri()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: ActivityNotFoundException) {
            // Sin navegador en el móvil: no hay nada que hacer.
        }
    }
}
