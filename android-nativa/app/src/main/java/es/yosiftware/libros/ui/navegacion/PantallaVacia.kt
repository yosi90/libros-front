package es.yosiftware.libros.ui.navegacion

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.TextoDeApoyo
import es.yosiftware.libros.ui.componentes.TextoEyebrow
import es.yosiftware.libros.ui.componentes.TextoTitulo
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios

/**
 * El sitio de cada destino mientras llega su pantalla: el título y el hito del roadmap en el que se clona. Ocupa el
 * ancho de contenido de las vistas Mobile (hasta 1120 dp, centrado) y se desplaza si no cabe.
 */
@Composable
fun PantallaVacia(destino: Destino) {
    Box(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .windowInsetsPadding(WindowInsets.zonaSegura.only(WindowInsetsSides.Horizontal)),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(Modifier.widthIn(max = Alturas.contenidoMaximo).fillMaxWidth().padding(Espacios.e4)) {
            TextoEyebrow("Pendiente del clon")
            TextoTitulo(destino.titulo)
            Spacer(Modifier.height(Espacios.e2))
            TextoDeApoyo("Esta pantalla llega en el hito ${destino.hito} de la APK nativa.")
        }
    }
}
