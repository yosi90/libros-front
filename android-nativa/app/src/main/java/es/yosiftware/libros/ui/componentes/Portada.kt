package es.yosiftware.libros.ui.componentes

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import coil3.compose.AsyncImage
import es.yosiftware.libros.R
import es.yosiftware.libros.datos.portadas.Portadas

/**
 * La portada [nombre] de un libro o una antología, con la caché de [Portadas]. Sin nombre o si no se puede descargar,
 * el marcador de error de la web (`error.png`). El tamaño y la forma los pone quien la usa (pantallas de los hitos 8 a
 * 11, con sus capturas).
 */
@Composable
fun Portada(nombre: String?, descripcion: String?, modifier: Modifier = Modifier, ajuste: ContentScale = ContentScale.Crop) {
    val marcador = painterResource(R.drawable.portada_error)
    AsyncImage(
        model = Portadas.url(nombre),
        contentDescription = descripcion,
        modifier = modifier,
        error = marcador,
        fallback = marcador,
        contentScale = ajuste,
    )
}
