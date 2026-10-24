package es.yosiftware.libros.ui.tema

import android.app.Application
import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.edit
import androidx.lifecycle.AndroidViewModel

/** Claro u oscuro, con los mismos valores que guarda la web (`MobileTheme`) y que usará la API al sincronizarlo. */
enum class TemaMobile(val valor: String) {
    Claro("light"),
    Oscuro("dark"),
    ;

    val contrario get() = if (this == Claro) Oscuro else Claro

    companion object {
        fun de(valor: String?): TemaMobile? = entries.firstOrNull { it.valor == valor }
    }
}

/** Dónde se guarda el tema. Una interfaz para probar [PreferenciaDeTema] en la JVM sin Android. */
interface AlmacenDeTema {
    fun leer(): String?
    fun guardar(valor: String)
}

/**
 * El tema elegido, guardado en el móvil. Sin elección guardada, claro, como `MobileThemeService` (`readLocal ?? 'light'`):
 * el clon no sigue al tema del sistema porque la APK de Capacitor tampoco lo hacía. Por ahora es del dispositivo; la
 * sincronización con la API (y guardarlo por cuenta) llega con la cuenta.
 */
class PreferenciaDeTema(private val almacen: AlmacenDeTema) {
    fun inicial(): TemaMobile = TemaMobile.de(almacen.leer()) ?: TemaMobile.Claro

    fun guardar(tema: TemaMobile) = almacen.guardar(tema.valor)
}

private class AlmacenEnPreferencias(contexto: Context) : AlmacenDeTema {
    private val preferencias = contexto.getSharedPreferences("preferencias", Context.MODE_PRIVATE)
    override fun leer(): String? = preferencias.getString(CLAVE, null)
    override fun guardar(valor: String) = preferencias.edit { putString(CLAVE, valor) }

    private companion object {
        const val CLAVE = "tema_mobile"
    }
}

/** El tema de la app, en un ViewModel: plegar, desplegar o girar no lo pierde ni lo vuelve a leer. */
class TemaViewModel(aplicacion: Application) : AndroidViewModel(aplicacion) {
    private val preferencia = PreferenciaDeTema(AlmacenEnPreferencias(aplicacion))

    var tema by mutableStateOf(preferencia.inicial())
        private set

    /** El interruptor sol/luna de la hoja «Más». */
    fun alternar() {
        tema = tema.contrario
        preferencia.guardar(tema)
    }
}
