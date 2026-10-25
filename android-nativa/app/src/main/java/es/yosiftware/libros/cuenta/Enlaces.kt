package es.yosiftware.libros.cuenta

import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.net.toUri
import es.yosiftware.libros.BuildConfig
import es.yosiftware.libros.MainActivity

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

    /**
     * Abre [direccion] fuera de la app. Las de la web de Libros van siempre al navegador: la app reclama sus enlaces (App
     * Links), y abrirlas con el sistema volvería a ella (`?reportar`, una página que la APK no tiene).
     */
    fun abrir(contexto: Context, direccion: String) {
        if (esDeLaWebDeLibros(direccion)) abrirEnNavegador(contexto, direccion) else lanzar(contexto, Intent(Intent.ACTION_VIEW, direccion.toUri()))
    }

    fun esDeLaWebDeLibros(direccion: String): Boolean {
        val host = runCatching { direccion.toUri().host }.getOrNull() ?: return false
        return host.equals(BuildConfig.WEB_LIBROS.toUri().host, ignoreCase = true)
    }

    /**
     * El navegador por defecto, aunque la app reclame la dirección; si no hay uno claro (o el elegido es Libros), el
     * selector, sin Libros.
     */
    fun abrirEnNavegador(contexto: Context, direccion: String) {
        val intent = Intent(Intent.ACTION_VIEW, direccion.toUri())
        val navegador = contexto.packageManager.resolveActivity(Intent(Intent.ACTION_VIEW, "https://example.com".toUri()), PackageManager.MATCH_DEFAULT_ONLY)
            ?.activityInfo?.packageName
        if (navegador != null && navegador != "android" && navegador != contexto.packageName) {
            lanzar(contexto, intent.setPackage(navegador))
        } else {
            val selector = Intent.createChooser(intent, null)
                .putExtra(Intent.EXTRA_EXCLUDE_COMPONENTS, arrayOf(ComponentName(contexto, MainActivity::class.java)))
            lanzar(contexto, selector)
        }
    }

    private fun lanzar(contexto: Context, intent: Intent) {
        try {
            contexto.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: ActivityNotFoundException) {
            // Sin navegador en el móvil: no hay nada que hacer.
        }
    }
}
