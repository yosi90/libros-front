package es.yosiftware.libros.ui.preferencias

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.core.content.edit
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.HojaInferior
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.rem

/**
 * El aviso «Gratis, por ahora», la regla temporal del kit 1.77 para todas las APK (`ecosistema-kit/APK.md`, «Google
 * Play»; obligatoria aunque la app no esté en Play desde el kit 1.79). El texto es el común del kit, tal cual: sale solo
 * una vez al instalar la app y con cada versión nueva, y está siempre a mano en Preferencias › Acerca de.
 */
object AvisoDeGratuidad {
    const val TITULO = "Gratis, por ahora"

    const val TEXTO = "Este servicio es gratuito por ahora, pero mantenerlo cuesta dinero: el servidor lo paga de su " +
        "bolsillo la persona que crea Yosiftware. Si algún día llega tanta gente que el servidor no da abasto, habrá " +
        "que cerrarlo al público o buscar la forma de que dé lo suficiente para mantenerlo y seguir mejorándolo. Eso " +
        "se decidirá con encuestas públicas a la comunidad, en las que podrá votar cualquier persona con cuenta de " +
        "Yosiftware, desde la app Yosiftware o desde la web social."

    private const val CLAVE = "gratuidad_vista"

    /** Se enseña si no se ha visto con esta versión: al instalar (nunca visto, 0) y con cada versión nueva. */
    fun pendiente(vistoCon: Int, versionActual: Int): Boolean = vistoCon < versionActual

    /** Del móvil, no de la cuenta: como la escena al abrir un libro. */
    fun vistoCon(contexto: Context): Int = contexto.getSharedPreferences("preferencias", Context.MODE_PRIVATE).getInt(CLAVE, 0)

    fun marcarVisto(contexto: Context, version: Int) =
        contexto.getSharedPreferences("preferencias", Context.MODE_PRIVATE).edit { putInt(CLAVE, version) }
}

/** El aviso en una hoja, con «Entendido». */
@Composable
fun HojaDeGratuidad(abierta: Boolean, alCerrar: () -> Unit) {
    val colores = LocalColores.current
    HojaInferior(abierta = abierta, alCerrar = alCerrar, titulo = AvisoDeGratuidad.TITULO) {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Espacios.e4)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    AvisoDeGratuidad.TITULO,
                    Modifier.weight(1f),
                    color = colores.tinta,
                    style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = rem(1.15), fontWeight = FontWeight.Bold),
                )
                BotonDeIcono(Iconos.close, "Cerrar", alCerrar)
            }
            Text(AvisoDeGratuidad.TEXTO, color = colores.tinta, style = Textos.cuerpo)
            Boton("Entendido", alCerrar, Modifier.fillMaxWidth())
        }
    }
}
