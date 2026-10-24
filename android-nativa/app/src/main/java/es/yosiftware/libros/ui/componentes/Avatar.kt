package es.yosiftware.libros.ui.componentes

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.mezclar

/** El punto de mensajes sin leer: su diámetro total (con el borde de 2 dp, `border-box`) y su distancia a la esquina. */
data class PuntoSinLeer(val diametro: Dp, val desdeLaEsquina: Dp)

/**
 * La foto del perfil en círculo, de [tamanoFoto] y centrada en una caja de [tamanoCaja], con el fondo del contenedor
 * de superficie mientras no hay imagen. Con [conBorde], el de 2 dp del primario al 34 % de la app bar y del rail. Con
 * [sinLeer], el borde pasa al color de error y aparece el punto abajo a la izquierda de la caja
 * (`.has-unread-messages`).
 *
 * La foto es la miniatura del perfil de la plataforma ([url], `PerfilPublico.avatar`), con la caché de imágenes de la
 * app. Mientras llega, o si la cuenta no tiene avatar, la inicial de [nombre] en el primario, como pinta el SDK de la
 * plataforma (ecosistema-kit/ACCESO.md: «pinta la inicial de `nombre ?? cuenta.alias`»). La APK de Capacitor ponía su
 * `error.png`, pero su foto era la propia de Libros, que se retira con la adhesión.
 */
@Composable
fun Avatar(
    tamanoFoto: Dp,
    modifier: Modifier = Modifier,
    tamanoCaja: Dp = tamanoFoto,
    foto: Painter? = null,
    url: String? = null,
    nombre: String? = null,
    conBorde: Boolean = true,
    sinLeer: Boolean = false,
    punto: PuntoSinLeer = PuntoSinLeer(8.dp, 0.dp),
) {
    val colores = LocalColores.current
    val borde = if (sinLeer) colores.error else mezclar(colores.primario, 0.34f)
    Box(
        modifier
            .size(tamanoCaja)
            .drawWithContent {
                drawContent()
                if (!sinLeer) return@drawWithContent
                val radio = punto.diametro.toPx() / 2
                val centro = Offset(punto.desdeLaEsquina.toPx() + radio, size.height - punto.desdeLaEsquina.toPx() - radio)
                drawCircle(colores.superficie, radio, centro)
                drawCircle(colores.error, radio - 2.dp.toPx(), centro)
            },
        contentAlignment = Alignment.Center,
    ) {
        // Como el `img` de la web: el fondo llega bajo el borde y la foto queda dentro de él.
        Box(
            Modifier
                .size(tamanoFoto)
                .clip(CircleShape)
                .background(colores.superficieContenedor)
                .then(if (conBorde) Modifier.border(2.dp, borde, CircleShape).padding(2.dp) else Modifier),
            contentAlignment = Alignment.Center,
        ) {
            val inicial = nombre?.trim()?.trimStart('@')?.firstOrNull()?.uppercase()
            if (inicial != null && foto == null) {
                val tamano = Textos.cuerpo.fontSize * (tamanoFoto.value / 40f)
                Text(inicial, color = colores.primario, style = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontWeight = FontWeight.Bold, fontSize = tamano))
            }
            if (foto != null) {
                Image(foto, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(CircleShape))
            } else if (url != null) {
                AsyncImage(model = url, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(CircleShape))
            }
        }
    }
}
