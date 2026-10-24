package es.yosiftware.libros.ui.sesion

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.Tarjeta
import es.yosiftware.libros.ui.componentes.TextoDeApoyo
import es.yosiftware.libros.ui.componentes.TextoEyebrow
import es.yosiftware.libros.ui.componentes.TextoTitulo
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.LocalColores

/**
 * Mientras la librería comprueba la sesión guardada.
 *
 * TODO(clon): la APK de Capacitor enseña aquí su pantalla de arranque; se clona con la cuenta (hito 6).
 */
@Composable
fun PantallaComprobando() {
    val colores = LocalColores.current
    Box(Modifier.fillMaxSize().background(colores.lienzo), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = colores.primario, modifier = Modifier.semantics { contentDescription = "Comprobando la sesión" })
    }
}

/**
 * Provisional hasta el hito 6, que trae las pantallas de la cuenta: sin sesión (o en un paso de entrar que aún no tiene
 * pantalla), solo se dice que entrar llega en el siguiente hito. [alVerSinCuenta], solo en las compilaciones de
 * depuración, abre el shell sin cuenta para revisar la navegación.
 */
@Composable
fun PantallaProvisional(sinConfiguracion: Boolean, motivo: String?, alVerSinCuenta: (() -> Unit)?) {
    val colores = LocalColores.current
    Box(
        Modifier
            .fillMaxSize()
            .background(colores.lienzo)
            .verticalScroll(rememberScrollState())
            .windowInsetsPadding(WindowInsets.zonaSegura)
            .padding(Espacios.e4),
        contentAlignment = Alignment.Center,
    ) {
        Tarjeta(Modifier.widthIn(max = 520.dp)) {
            TextoEyebrow("Memoria Bibliográfica")
            TextoTitulo("Entra con tu cuenta de Yosiftware")
            Spacer(Modifier.height(Espacios.e3))
            Column(verticalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                TextoDeApoyo("Entrar en la app nativa llega en el siguiente hito. Mientras tanto, sigue usando la app actual.")
                if (motivo != null) TextoDeApoyo(motivo)
                if (sinConfiguracion) TextoDeApoyo("Esta compilación no tiene la configuración de la plataforma, así que no puede entrar.")
            }
            if (alVerSinCuenta != null) {
                Spacer(Modifier.height(Espacios.e5))
                Boton("Ver la navegación (depuración)", alVerSinCuenta, variante = VarianteDeBoton.Tonal)
            }
        }
    }
}
