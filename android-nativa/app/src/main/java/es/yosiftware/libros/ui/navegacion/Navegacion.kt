package es.yosiftware.libros.ui.navegacion

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.max
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.componentes.Avatar
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.mezclar

// La navegación de la presentación Mobile: src/app/components/mobile/ui/mobile-navigation/ (barra inferior en la ventana
// compacta y rail desde 600 dp, con la variante `native-mobile` que empieza arriba del todo).

/** Lo que cambia la navegación además del destino: «Más» abierta, Comunidad desactivada y lo pendiente de leer. */
data class EstadoDeNavegacion(
    val actual: Destino,
    val masAbierta: Boolean = false,
    /** La capacidad `feed`: sin ella, Comunidad sale atenuada y no se puede tocar. */
    val comunidadActiva: Boolean = true,
    val mensajesSinLeer: Int = 0,
    val avisosSinLeer: Boolean = false,
    /** Lo que falta por ver en la campana: su descripción («Notificaciones, N sin ver»). */
    val avisosSinVer: Int = 0,
    /** El panel de la campana abierto. */
    val avisosAbiertos: Boolean = false,
)

/**
 * Una entrada de la navegación: solo el icono (ronda 1 de interfaz, kit 1.111: el icono y el texto decían lo mismo),
 * centrado, con 4 dp de relleno, la zona que se toca redondeada a 16 dp y su nombre accesible ([etiqueta]). Desactivada,
 * al 46 %.
 */
@Composable
private fun ElementoDeNavegacion(
    etiqueta: String,
    activo: Boolean,
    alPulsar: () -> Unit,
    modifier: Modifier = Modifier,
    activable: Boolean = true,
    alturaMinima: Dp,
    icono: @Composable () -> Unit,
) {
    Box(
        modifier
            .alpha(if (activable) 1f else 0.46f)
            .heightIn(min = alturaMinima)
            .clip(RoundedCornerShape(16.dp))
            .clickable(enabled = activable, role = Role.Tab, onClick = alPulsar)
            .semantics {
                selected = activo
                contentDescription = etiqueta
            }
            .padding(4.dp),
        contentAlignment = Alignment.Center,
    ) {
        icono()
    }
}

/**
 * `.m-navigation__icon`: la píldora que lleva el icono y que se rellena al estar activa; 64 × 32 dp en la barra
 * inferior y 56 × 32 en el rail.
 */
@Composable
private fun PildoraDeIcono(icono: Int, activo: Boolean, ancho: Dp = 64.dp) {
    val colores = LocalColores.current
    Box(
        Modifier
            .size(width = ancho, height = 32.dp)
            .background(if (activo) colores.contenedorPrimario else Color.Transparent, Radios.pildora),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painterResource(icono),
            contentDescription = null,
            tint = if (activo) colores.sobreContenedorPrimario else colores.tintaSuave,
            modifier = Modifier.size(24.dp),
        )
    }
}

/**
 * La campana de avisos en la presentación Mobile (notification-bell): un círculo de 48 dp con el icono en la tinta, que
 * pasa al primario sobre el contenedor primario al abrir su panel, y el punto de error de 9 dp si hay avisos sin leer.
 */
@Composable
fun BotonDeCampana(abierta: Boolean, sinLeer: Boolean, alPulsar: () -> Unit, modifier: Modifier = Modifier, sinVer: Int = 0) {
    val colores = LocalColores.current
    Box(
        modifier
            .size(Alturas.botonDeIcono)
            .clip(CircleShape)
            .background(if (abierta) colores.contenedorPrimario else Color.Transparent)
            .clickable(role = Role.Button, onClickLabel = null, onClick = alPulsar)
            .semantics { selected = abierta },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painterResource(Iconos.notifications),
            // El `aria-label` de la campana del SDK.
            contentDescription = if (sinVer > 0) "Notificaciones, $sinVer sin ver" else "Abrir notificaciones",
            tint = if (abierta) colores.primario else colores.tinta,
            modifier = Modifier.size(24.dp),
        )
        if (sinLeer) {
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 8.dp, end = 8.dp)
                    .size(9.dp)
                    .background(colores.superficie, CircleShape)
                    .padding(2.dp)
                    .background(colores.error, CircleShape),
            )
        }
    }
}

/** Un borde de 1 dp del contorno al 68 % arriba (barra inferior) o a la derecha (rail). */
private fun Modifier.bordeDeNavegacion(arriba: Boolean, color: Color) = drawBehind {
    val grosor = 1.dp.toPx()
    if (arriba) drawRect(color, Offset.Zero, Size(size.width, grosor))
    else drawRect(color, Offset(size.width - grosor, 0f), Size(grosor, size.height))
}

/**
 * La barra inferior de la ventana compacta: Biblioteca, Catálogo, Comunidad y Más, en cuatro columnas iguales y solo
 * con iconos. Mide 64 dp más la zona segura de abajo, con 4 dp de relleno (o la zona segura, si es mayor) y el borde de
 * arriba; el fondo es la superficie al 94 % sobre el lienzo.
 */
@Composable
fun BarraInferior(estado: EstadoDeNavegacion, alElegir: (Destino) -> Unit, alPulsarMas: () -> Unit, modifier: Modifier = Modifier) {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    val abajo = zona.calculateBottomPadding()
    Row(
        modifier
            .fillMaxWidth()
            .heightIn(min = Alturas.navegacionInferior + abajo)
            .height(IntrinsicSize.Min)
            .background(mezclar(colores.superficie, 0.94f))
            .bordeDeNavegacion(arriba = true, mezclar(colores.contorno, 0.68f))
            .padding(
                top = Espacios.e1 + 1.dp,
                bottom = max(Espacios.e1, abajo),
                start = max(Espacios.e2, zona.calculateLeftPadding(direccion)),
                end = max(Espacios.e2, zona.calculateRightPadding(direccion)),
            ),
    ) {
        val celda = Modifier.weight(1f).fillMaxHeight()
        Destino.enLaBarra.forEach { destino ->
            val activo = estado.actual.seccion == destino
            ElementoDeNavegacion(
                destino.etiqueta, activo, { alElegir(destino) }, celda,
                activable = destino != Destino.Comunidad || estado.comunidadActiva,
                alturaMinima = Alturas.botonDeIcono,
            ) { PildoraDeIcono(destino.icono, activo) }
        }
        ElementoDeNavegacion("Más", estado.masAbierta, alPulsarMas, celda, alturaMinima = Alturas.botonDeIcono) {
            PildoraDeIcono(Iconos.moreHoriz, estado.masAbierta)
        }
    }
}

/**
 * El rail de la ventana media o mayor: Perfil (la foto), Biblioteca, Catálogo, Comunidad, Avisos, Estadísticas, Más y,
 * al pie, Preferencias, solo con iconos. Ocupa todo el alto, desde arriba del todo (`native-mobile`), con 72 dp más la
 * zona segura de la izquierda, 12 dp entre entradas de 48 dp y el borde de la derecha. Si no cabe (una ventana muy
 * baja), se desplaza: el Sass lo dejaría cortado.
 */
@Composable
fun Rail(
    estado: EstadoDeNavegacion,
    alElegir: (Destino) -> Unit,
    alPulsarMas: () -> Unit,
    alPulsarAvisos: () -> Unit,
    modifier: Modifier = Modifier,
    avatar: String? = null,
    nombre: String? = null,
    alPulsarAvatar: (() -> Unit)? = null,
) {
    val colores = LocalColores.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val izquierda = zona.calculateLeftPadding(LocalLayoutDirection.current)
    BoxWithConstraints(
        modifier
            .fillMaxHeight()
            .width(Alturas.anchoRail + izquierda)
            .background(mezclar(colores.superficie, 0.94f))
            .bordeDeNavegacion(arriba = false, mezclar(colores.contorno, 0.68f)),
    ) {
        // Se desplaza entre las barras del sistema (en horizontal no cabe entero): lo que sube no pasa por debajo de la
        // de estado.
        val arriba = zona.calculateTopPadding()
        val abajo = zona.calculateBottomPadding()
        Column(
            Modifier
                .padding(top = arriba, bottom = abajo)
                .verticalScroll(rememberScrollState())
                .heightIn(min = maxHeight - arriba - abajo)
                .padding(
                    top = (Espacios.e4 - arriba).coerceAtLeast(0.dp),
                    bottom = (Espacios.e3 - abajo).coerceAtLeast(0.dp),
                    start = izquierda,
                    end = 1.dp,
                ),
        ) {
            val fila = Modifier.fillMaxWidth()
            val alto = Alturas.botonDeIcono
            val hueco = Espacios.e3
            val perfilActivo = estado.actual.seccion == Destino.Perfil
            val perfil = if (estado.mensajesSinLeer > 0) "Perfil, ${textoDeSinLeer(estado.mensajesSinLeer)}" else "Perfil"
            // El avatar abre el panel de cuentas (hito 6); Perfil sigue en la hoja «Más».
            ElementoDeNavegacion(perfil, perfilActivo, alPulsarAvatar ?: { alElegir(Destino.Perfil) }, fila, alturaMinima = alto) {
                // `.m-navigation__avatar`: la foto de 38 dp en una caja de 42, con el punto de 8 dp en su esquina.
                Avatar(tamanoFoto = 38.dp, tamanoCaja = 42.dp, url = avatar, nombre = nombre, sinLeer = estado.mensajesSinLeer > 0)
            }
            listOf(Destino.Biblioteca, Destino.Catalogo, Destino.Comunidad).forEach { destino ->
                Spacer(Modifier.height(hueco))
                val activo = estado.actual.seccion == destino
                ElementoDeNavegacion(
                    destino.etiqueta, activo, { alElegir(destino) }, fila,
                    activable = destino != Destino.Comunidad || estado.comunidadActiva,
                    alturaMinima = alto,
                ) { PildoraDeIcono(destino.icono, activo, ancho = 56.dp) }
            }
            Spacer(Modifier.height(hueco))
            // `.m-navigation__notification`: no es un enlace; solo la campana se toca. Su nombre accesible dice cuántos
            // avisos faltan por ver.
            Box(fila.heightIn(min = alto), contentAlignment = Alignment.Center) {
                BotonDeCampana(abierta = estado.avisosAbiertos, sinLeer = estado.avisosSinLeer, alPulsar = alPulsarAvisos, sinVer = estado.avisosSinVer)
            }
            Spacer(Modifier.height(hueco))
            val estadisticas = estado.actual.seccion == Destino.Estadisticas
            ElementoDeNavegacion("Estadísticas", estadisticas, { alElegir(Destino.Estadisticas) }, fila, alturaMinima = alto) {
                PildoraDeIcono(Iconos.barChart, estadisticas, ancho = 56.dp)
            }
            Spacer(Modifier.height(hueco))
            ElementoDeNavegacion("Más", estado.masAbierta, alPulsarMas, fila, alturaMinima = alto) {
                PildoraDeIcono(Iconos.moreHoriz, estado.masAbierta, ancho = 56.dp)
            }
            // `.m-navigation__rail-end`: `margin-top: auto`, con el hueco como mínimo.
            Spacer(Modifier.height(hueco))
            Spacer(Modifier.weight(1f))
            val preferencias = estado.actual.seccion == Destino.Preferencias
            ElementoDeNavegacion("Preferencias", preferencias, { alElegir(Destino.Preferencias) }, fila, alturaMinima = alto) {
                PildoraDeIcono(Iconos.settings, preferencias, ancho = 56.dp)
            }
        }
    }
}

/** «1 mensaje sin leer» o «N mensajes sin leer»: lo que añade el nombre accesible del perfil. */
internal fun textoDeSinLeer(n: Int) = if (n == 1) "1 mensaje sin leer" else "$n mensajes sin leer"
