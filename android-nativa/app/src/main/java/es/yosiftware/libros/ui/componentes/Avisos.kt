package es.yosiftware.libros.ui.componentes

import android.os.SystemClock
import androidx.annotation.DrawableRes
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import es.yosiftware.libros.datos.ErrorDeLibros
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import es.yosiftware.libros.ui.tema.sombra2
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs

/**
 * Los avisos de la app (`AppToastService` y `SnackbarModule`): uno por app, en [LocalAvisos]. `exito`, `error`… son
 * `openSnackBar(…, 'successBar' | 'errorBar' …)`, y [deError] es `openApiError`: título genérico de la pantalla y el
 * mensaje concreto del servidor.
 */
class Avisos : Avisador {
    internal val cola = ColaDeAvisos()

    /** Cambia con cada aviso nuevo o quitado: lo que mira el anfitrión para repintar. */
    internal var version by mutableIntStateOf(0)
        private set

    fun exito(mensaje: String, titulo: String? = null, clave: String? = null, @DrawableRes icono: Int? = null, accion: AccionDeAviso? = null) =
        mostrar(TipoDeAviso.EXITO, mensaje, titulo, clave, icono, accion)

    fun error(mensaje: String, titulo: String? = null, clave: String? = null, @DrawableRes icono: Int? = null) =
        mostrar(TipoDeAviso.ERROR, mensaje, titulo, clave, icono)

    fun info(mensaje: String, titulo: String? = null, clave: String? = null, @DrawableRes icono: Int? = null) =
        mostrar(TipoDeAviso.INFO, mensaje, titulo, clave, icono)

    fun sistema(mensaje: String, titulo: String? = null, clave: String? = null) = mostrar(TipoDeAviso.SISTEMA, mensaje, titulo, clave)

    override fun exito(mensaje: String) = exito(mensaje, titulo = null)

    override fun error(mensaje: String) = error(mensaje, titulo = null)

    override fun exitoConAccion(mensaje: String, accion: AccionDeAviso, titulo: String?, clave: String?, duracionMs: Long?) =
        mostrar(TipoDeAviso.EXITO, mensaje, titulo, clave, accion = accion, duracionMs = duracionMs)

    /** Un error de la API: el título es el texto de la pantalla y el mensaje, el del servidor. Las normas pendientes no avisan. */
    override fun informar(mensaje: String, titulo: String?, clave: String?) = info(mensaje, titulo, clave)

    override fun avisarDelSistema(mensaje: String, titulo: String?, clave: String?) = sistema(mensaje, titulo, clave)

    override fun deError(error: ErrorDeLibros, generico: String) {
        if (error.bloqueoPorNormas) return
        error(error.mensajeO(generico), titulo = generico)
    }

    internal fun quitar(id: Long) {
        cola.quitar(id)
        version++
    }

    internal fun caducar() {
        val antes = cola.avisos.size
        cola.caducar(SystemClock.elapsedRealtime())
        if (cola.avisos.size != antes) version++
    }

    internal fun detener(id: Long) = cola.detener(id, SystemClock.elapsedRealtime())

    internal fun seguir(id: Long) {
        cola.seguir(id, SystemClock.elapsedRealtime())
        version++
    }

    private fun mostrar(
        tipo: TipoDeAviso,
        mensaje: String,
        titulo: String?,
        clave: String?,
        @DrawableRes icono: Int? = null,
        accion: AccionDeAviso? = null,
        duracionMs: Long? = null,
    ) {
        if (cola.mostrar(tipo, mensaje, SystemClock.elapsedRealtime(), titulo, clave, icono, accion, duracionMs) != null) version++
    }
}

val LocalAvisos = staticCompositionLocalOf { Avisos() }

/**
 * Donde salen los avisos (app-toast-host, variante Mobile): abajo, sobre la barra inferior, con 12 dp a los lados; con
 * rail, centrados en el contenido (hasta 440 dp) a 104 dp del borde. Se apilan con 10 dp entre ellos.
 */
@Composable
fun AnfitrionDeAvisos(avisos: Avisos, modifier: Modifier = Modifier) {
    val ventana = LocalVentana.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    val version = avisos.version
    // Caducan solos: se espera al primero que vence (los arrastrados no corren).
    LaunchedEffect(version) {
        while (true) {
            val proxima = avisos.cola.proximaCaducidad() ?: break
            delay((proxima - SystemClock.elapsedRealtime()).coerceAtLeast(1))
            avisos.caducar()
        }
    }
    val lista = remember(version) { avisos.cola.avisos }
    if (lista.isEmpty()) return
    val conRail = ventana.clase.conRail
    val relleno = if (conRail) {
        Modifier.padding(
            start = Alturas.anchoRail + zona.calculateLeftPadding(direccion) + Espacios.e5,
            end = maxOf(Espacios.e5, zona.calculateRightPadding(direccion)),
            bottom = zona.calculateBottomPadding() + 104.dp,
        )
    } else {
        Modifier.padding(
            start = maxOf(Espacios.e3, zona.calculateLeftPadding(direccion)),
            end = maxOf(Espacios.e3, zona.calculateRightPadding(direccion)),
            bottom = Alturas.navegacionInferior + zona.calculateBottomPadding() + Espacios.e3,
        )
    }
    Box(modifier.fillMaxWidth().then(relleno), contentAlignment = Alignment.BottomCenter) {
        Column(
            Modifier.then(if (conRail) Modifier.widthIn(max = 440.dp) else Modifier).fillMaxWidth()
                .semantics { liveRegion = LiveRegionMode.Polite },
            verticalArrangement = Arrangement.spacedBy(10.4.dp),
        ) {
            lista.forEach { aviso -> key(aviso.id) { TarjetaDeAviso(aviso, avisos) } }
        }
    }
}

/** Un aviso (.app-toast, Mobile): se retira arrastrándolo 64 dp hacia arriba o hacia abajo; uno corto vuelve a su sitio. */
@Composable
private fun TarjetaDeAviso(aviso: Aviso, avisos: Avisos) {
    val colores = LocalColores.current
    val densidad = LocalDensity.current
    val alcance = rememberCoroutineScope()
    val forma = RoundedCornerShape(Radios.md)
    var arrastre by remember { mutableFloatStateOf(0f) }
    var arrastrando by remember { mutableIntStateOf(0) } // 0 quieto, 1 arrastrando, 2 saliendo
    val desplazamiento by animateFloatAsState(arrastre, if (arrastrando == 1) tween(0) else tween(220), label = "aviso")
    val opacidad by animateFloatAsState(if (arrastrando == 2) 0f else 1f, tween(180), label = "salida")
    val (borde, fondo) = when (aviso.tipo) {
        TipoDeAviso.EXITO -> mezclar(colores.exito, 0.48f, colores.contorno) to mezclar(colores.contenedorExito, 0.38f, colores.superficie)
        TipoDeAviso.ERROR -> mezclar(colores.error, 0.48f, colores.contorno) to mezclar(colores.contenedorError, 0.38f, colores.superficie)
        TipoDeAviso.INFO -> mezclar(colores.info, 0.48f, colores.contorno) to mezclar(colores.contenedorInfo, 0.46f, colores.superficie)
        TipoDeAviso.SISTEMA -> mezclar(colores.atencion, 0.48f, colores.contorno) to mezclar(colores.contenedorAtencion, 0.38f, colores.superficie)
    }
    // El icono conserva el color de la web de escritorio salvo en «info», que la variante Mobile cambia.
    val (iconoPorTipo, colorDelIcono) = when (aviso.tipo) {
        TipoDeAviso.EXITO -> Iconos.checkCircle to Color(0xFF6FECA6)
        TipoDeAviso.ERROR -> Iconos.errorOutline to Color(0xFFFF8A80)
        TipoDeAviso.INFO -> Iconos.info to colores.info
        TipoDeAviso.SISTEMA -> Iconos.notificationsActive to Color(0xFFFFD25C)
    }
    val colorDeProgreso = when (aviso.tipo) {
        TipoDeAviso.EXITO -> Color(0xB36FECA6)
        TipoDeAviso.ERROR -> Color(0xC7FF8A80)
        TipoDeAviso.INFO -> Color(red = 172, green = 151, blue = 125).copy(alpha = 0.7f) // el accent de _variables.sass
        TipoDeAviso.SISTEMA -> Color(0xC7FFD25C)
    }
    // La barra de tiempo se encoge en lo que dura el aviso y se para mientras se arrastra.
    val progreso = remember(aviso.id) { Animatable(1f) }
    LaunchedEffect(aviso.id, arrastrando) {
        if (arrastrando != 0) progreso.stop() else {
            val restante = (aviso.caducaEn - SystemClock.elapsedRealtime()).coerceAtLeast(1)
            progreso.animateTo(0f, tween(restante.toInt(), easing = LinearEasing))
        }
    }
    Row(
        Modifier
            .fillMaxWidth()
            .graphicsLayer { translationY = desplazamiento; alpha = opacidad }
            .sombra2(forma, colores)
            .clip(forma)
            .background(fondo)
            .border(1.dp, borde, forma)
            .drawBehind {
                val ancho = size.width * progreso.value
                drawRect(colorDeProgreso, Offset(0f, size.height - 3.dp.toPx()), Size(ancho, 3.dp.toPx()))
            }
            .pointerInput(aviso.id) {
                val umbral = with(densidad) { 64.dp.toPx() }
                val tope = with(densidad) { 144.dp.toPx() }
                detectVerticalDragGestures(
                    onDragStart = { arrastrando = 1; avisos.detener(aviso.id) },
                    onVerticalDrag = { cambio, cantidad -> cambio.consume(); arrastre = (arrastre + cantidad).coerceIn(-tope, tope) },
                    onDragEnd = {
                        if (abs(arrastre) >= umbral) {
                            arrastrando = 2
                            arrastre = if (arrastre > 0) with(densidad) { 180.dp.toPx() } else with(densidad) { (-180).dp.toPx() }
                            alcance.launch { delay(240); avisos.quitar(aviso.id) }
                        } else {
                            arrastrando = 0
                            arrastre = 0f
                            avisos.seguir(aviso.id)
                        }
                    },
                    onDragCancel = { arrastrando = 0; arrastre = 0f; avisos.seguir(aviso.id) },
                )
            }
            .heightIn(min = 60.dp)
            .padding(start = Espacios.e4, top = Espacios.e3, bottom = Espacios.e3, end = Espacios.e2),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(aviso.icono ?: iconoPorTipo), contentDescription = null, tint = colorDelIcono, modifier = Modifier.size(17.6.dp))
        val texto = Textos.cuerpo.copy(fontSize = rem(0.95), lineHeight = 1.25.em, color = colores.tinta)
        Column(Modifier.weight(1f)) {
            Text(aviso.titulo, style = texto.copy(fontWeight = FontWeight.Bold), modifier = Modifier.padding(bottom = 2.dp))
            if (!aviso.soloTitulo) Text(aviso.mensaje, style = texto)
        }
        if (aviso.repeticiones > 1) {
            Text(
                "x${aviso.repeticiones}",
                style = Textos.cuerpo.copy(fontSize = rem(0.78), fontWeight = FontWeight.Bold, color = colores.tinta, textAlign = TextAlign.Center),
                modifier = Modifier.clip(Radios.pildora).background(colores.superficieAlta).widthIn(min = 33.6.dp).padding(horizontal = 7.2.dp, vertical = 2.9.dp),
            )
        }
        aviso.accion?.let { accion ->
            Box(
                Modifier.heightIn(min = 44.dp).clip(Radios.pildora)
                    .border(1.dp, mezclar(colores.primario, 0.52f), Radios.pildora)
                    .clickable { avisos.quitar(aviso.id); accion.ejecutar() }
                    .padding(horizontal = Espacios.e3),
                contentAlignment = Alignment.Center,
            ) {
                Text(accion.texto, style = Textos.cuerpo.copy(fontSize = rem(0.82), fontWeight = FontWeight.Bold, color = colores.primario))
            }
        }
        Box(
            Modifier.size(44.dp).clip(CircleShape).clickable { avisos.quitar(aviso.id) },
            contentAlignment = Alignment.Center,
        ) {
            Icon(painterResource(Iconos.close), contentDescription = "Cerrar notificacion", tint = colores.tintaSuave, modifier = Modifier.size(16.dp))
        }
    }
}
