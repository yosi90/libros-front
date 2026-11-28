package es.yosiftware.libros.ui.navegacion

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import es.yosiftware.libros.ui.componentes.Avatar
import es.yosiftware.libros.ui.componentes.BotonDeIcono
import es.yosiftware.libros.ui.componentes.HojaInferior
import es.yosiftware.libros.ui.componentes.rayaArriba
import es.yosiftware.libros.ui.comunidad.Insignia
import es.yosiftware.libros.ui.cuenta.EnlacesDeLaCuenta
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Movimiento
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.TemaMobile
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.sombra1

// La hoja «Más» de src/app/components/mobile/user/mobile-dashboard-chrome/ (`.m-more-backdrop` y `.m-more-sheet`).

private val textoNombre = Textos.cuerpo.copy(fontFamily = Fuentes.display, fontSize = (1.15 * 16).sp, fontWeight = FontWeight.Bold)

/**
 * La hoja «Más»: la foto y el nombre, los accesos a Perfil, Cuenta, Preferencias, Estadísticas y Mensajes (una fila de
 * iconos, como la navegación: ronda 1 de interfaz, opción A), lo de la cuenta en la web social (hito 6) y el
 * interruptor sol/luna del tema, solo. La capa, el velo, el asa y el movimiento son los
 * de [HojaInferior] (entra desde abajo en 220 ms sobre el velo y sale en 240; se cierra con la X, con Atrás, tocando
 * fuera o arrastrando la hoja hacia abajo). «Cuenta» ya no es «Cuenta y seguridad», que se retira con la adhesión: abre el panel de
 * cuentas ([alAbrirCuentas]).
 */
@Composable
fun HojaMas(
    abierta: Boolean,
    alCerrar: () -> Unit,
    nombre: String,
    actual: Destino,
    tema: TemaMobile,
    alAlternarTema: () -> Unit,
    alElegir: (Destino) -> Unit,
    avatar: String? = null,
    alAbrirCuentas: () -> Unit = {},
    chatActivo: Boolean = true,
    /** Los mensajes sin leer del chat: la insignia de Mensajes. */
    mensajesSinLeer: Int = 0,
) {
    HojaInferior(abierta = abierta, alCerrar = alCerrar, titulo = "Más destinos") {
        Cabecera(nombre, avatar, alCerrar)
        Accesos(actual, chatActivo, mensajesSinLeer) { destino ->
            alCerrar()
            if (destino == Destino.Cuenta) alAbrirCuentas() else alElegir(destino)
        }
        EnlacesDeLaCuenta(alAbrir = alCerrar)
        Spacer(Modifier.height(Espacios.e3))
        FilaDelTema(tema, alAlternarTema)
    }
}

/** `.m-more-sheet__profile`: foto de 52 dp (la miniatura del perfil de la plataforma), el nombre y la X; 16 dp debajo y el borde del contorno. */
@Composable
private fun Cabecera(nombre: String, avatar: String?, alCerrar: () -> Unit) {
    val colores = LocalColores.current
    Row(
        Modifier
            .fillMaxWidth()
            .drawBehind {
                val grosor = 1.dp.toPx()
                drawRect(colores.contorno, Offset(0f, size.height - grosor), Size(size.width, grosor))
            }
            .padding(bottom = Espacios.e4 + 1.dp),
        horizontalArrangement = Arrangement.spacedBy(Espacios.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Avatar(tamanoFoto = 52.dp, url = avatar, nombre = nombre, conBorde = false)
        Text(nombre, Modifier.weight(1f), color = colores.tinta, style = textoNombre, maxLines = 1, overflow = TextOverflow.Ellipsis)
        BotonDeIcono(Iconos.close, "Cerrar", alCerrar)
    }
}

/** Los accesos, en una fila de cajas iguales con 8 dp de hueco y 16 dp arriba y abajo. */
@Composable
private fun Accesos(actual: Destino, chatActivo: Boolean, mensajesSinLeer: Int, alElegir: (Destino) -> Unit) {
    val entradas = Destino.enLaHojaMas.filter { it != Destino.Mensajes || chatActivo }
    Row(Modifier.fillMaxWidth().padding(vertical = Espacios.e4), horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
        entradas.forEach { destino ->
            // Mensajes no es un enlace con `routerLinkActive`: nunca se marca.
            val activo = destino != Destino.Mensajes && actual == destino
            val sinLeer = if (destino == Destino.Mensajes) mensajesSinLeer else 0
            Acceso(destino, activo, sinLeer, Modifier.weight(1f)) { alElegir(destino) }
        }
    }
}

/**
 * Un acceso: solo el icono, en una caja de 56 dp de alto con el borde del contorno y radio de 12; el elegido, en el
 * contenedor primario. Su nombre accesible es el del destino (con los mensajes sin leer, si los hay), y la insignia va
 * arriba a la derecha.
 */
@Composable
private fun Acceso(destino: Destino, activo: Boolean, sinLeer: Int, modifier: Modifier, alPulsar: () -> Unit) {
    val colores = LocalColores.current
    val forma = RoundedCornerShape(Radios.sm)
    val nombre = if (sinLeer > 0) "${destino.etiqueta}, $sinLeer sin leer" else destino.etiqueta
    Box(
        modifier
            .height(56.dp)
            .clip(forma)
            .background(if (activo) colores.contenedorPrimario else colores.superficie)
            .border(1.dp, if (activo) Color.Transparent else colores.contorno, forma)
            .clickable(role = Role.Button, onClick = alPulsar)
            .semantics {
                selected = activo
                contentDescription = nombre
            },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painterResource(destino.icono),
            contentDescription = null,
            tint = if (activo) colores.sobreContenedorPrimario else colores.primario,
            modifier = Modifier.size(24.dp),
        )
        if (sinLeer > 0) Insignia(sinLeer, Modifier.align(Alignment.TopEnd).padding(top = 6.dp, end = 8.dp))
    }
}

/**
 * `.m-more-sheet__theme`: el interruptor, a la derecha y bajo un borde al 72 %. Sin «Tema» ni «Claro»/«Oscuro»: el sol
 * y la luna lo dicen, y su nombre accesible y su estado también.
 */
@Composable
private fun FilaDelTema(tema: TemaMobile, alAlternar: () -> Unit) {
    val colores = LocalColores.current
    val borde = mezclar(colores.contorno, 0.72f)
    Row(
        Modifier
            .fillMaxWidth()
            .padding(bottom = Espacios.e3)
            .rayaArriba(borde)
            .padding(top = Espacios.e3 + 1.dp),
        horizontalArrangement = Arrangement.End,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        InterruptorDeTema(tema, alAlternar)
    }
}

/**
 * `.m-theme-switch`: 104 × 44 dp, borde del contorno, fondo del contenedor de superficie y el sol y la luna de 20 dp.
 * La pastilla del primario (con la sombra 1) se desliza en 200 ms bajo el elegido, que pasa al color sobre primario.
 */
@Composable
private fun InterruptorDeTema(tema: TemaMobile, alAlternar: () -> Unit) {
    val colores = LocalColores.current
    val oscuro = tema == TemaMobile.Oscuro
    // El borde (1) y el relleno (4) dejan 94 dp: dos mitades de 47.
    val mitad = 47.dp
    val posicion by animateDpAsState(if (oscuro) mitad else 0.dp, tween(Movimiento.medio, easing = Movimiento.entrada), label = "tema")
    val accion = if (oscuro) "Usar tema claro" else "Usar tema oscuro"
    Box(
        Modifier
            .size(width = 104.dp, height = Alturas.tactilMinimo)
            .clip(Radios.pildora)
            .background(colores.superficieContenedor)
            .border(1.dp, colores.contorno, Radios.pildora)
            .clickable(role = Role.Switch, onClick = alAlternar)
            .semantics {
                contentDescription = accion
                stateDescription = if (oscuro) "Oscuro" else "Claro"
            }
            .padding(5.dp),
    ) {
        Box(
            Modifier
                .offset { IntOffset(posicion.roundToPx(), 0) }
                .width(mitad)
                .fillMaxHeight()
                .sombra1(Radios.pildora, colores)
                .background(colores.primario, Radios.pildora),
        )
        Row(Modifier.fillMaxSize()) {
            listOf(Iconos.lightMode to !oscuro, Iconos.darkMode to oscuro).forEach { (icono, elegido) ->
                Box(Modifier.weight(1f).fillMaxHeight(), contentAlignment = Alignment.Center) {
                    Icon(
                        painterResource(icono),
                        contentDescription = null,
                        tint = if (elegido) colores.sobrePrimario else colores.tintaSuave,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
    }
}
