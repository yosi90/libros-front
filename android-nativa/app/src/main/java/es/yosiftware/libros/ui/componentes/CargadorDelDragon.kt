package es.yosiftware.libros.ui.componentes

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.min
import coil3.compose.AsyncImage
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem
import kotlin.random.Random

// El cargador de los dragones de la web (app.component: `.dragon-loader`, `LoaderEmmitterService` y sus frases), que
// la APK de Capacitor enseñaba encima de todo al recuperar la biblioteca y al abrir un libro. Uno de los tres dragones,
// elegido al azar en cada arranque de la app y el mismo en todas sus cargas: así no cambia al pasar del arranque a la
// biblioteca (el motivo por el que la web dejó uno fijo en septiembre de 2026 y perdió los otros dos).

/** Qué se carga: decide la frase (`LoaderContext` de la web). */
enum class ContextoDeCarga { BIBLIOTECA, ENTRADA, LIBRO, OTRO }

/** Lo que enseña el cargador abierto: el dragón (su GIF en `assets/dragones/`) y la frase. */
data class CargaDelDragon(val contexto: ContextoDeCarga, val dragon: String, val frase: String)

object FrasesDelDragon {
    val DRAGONES = listOf("dragon1.gif", "dragon2.gif", "dragon3.gif")

    /** El de este arranque de la app. */
    private val DE_ESTA_VEZ = DRAGONES.random()
    const val BIBLIOTECA = "Recuperando tu biblioteca…"

    val ENTRAR = listOf(
        "El dragón está comprobando tus credenciales...",
        "Abriendo el portal de la biblioteca...",
        "Desempolvando tu grimorio personal...",
        "Invocando tu estantería secreta...",
        "El guardián de la biblioteca revisa tu pase...",
        "Consultando los archivos del reino...",
        "Afiliando tu alma lectora al gremio...",
        "Encendiendo las velas de lectura...",
        "El dragón está oliendo si eres tú...",
        "Buscando tu marca entre los pergaminos...",
        "Desbloqueando la puerta de la torre...",
        "El bibliotecario arcano está verificando tu identidad...",
        "Preparando tu rincón junto al fuego...",
        "Quitando telarañas digitales de tu cuenta...",
        "Abriendo la cubierta de tu aventura...",
        "El dragón está buscando tus gafas de leer...",
        "Comprobando que no seas un mimético disfrazado...",
        "Cargando tu santuario de historias...",
        "El sello mágico está casi listo...",
        "Despertando a los personajes que dejaste dormidos...",
        "Revisando si tienes permiso para entrar al archivo prohibido...",
        "El dragón está firmando tu entrada con tinta encantada...",
        "Afinando las runas de acceso...",
        "La biblioteca te reconoce... más o menos.",
        "Casi dentro. El dragón escribe lento, pero con buena letra.",
    )

    val LIBRO = listOf(
        "Abriendo el libro por la página correcta...",
        "El dragón está pasando las páginas con cuidado...",
        "Despertando a los personajes...",
        "Sacudiendo el polvo de la portada...",
        "Preparando tinta, papel y un poco de magia...",
        "Buscando el punto exacto donde te quedaste...",
        "La historia está afilando sus giros de guion...",
        "Cargando capítulos, secretos y alguna que otra desgracia...",
        "El narrador está tomando aire...",
        "Los personajes se están colocando en escena...",
        "Abriendo una puerta a otro mundo...",
        "El dragón está calentando el atril...",
        "Ordenando capítulos en la estantería astral...",
        "Reuniendo héroes, villanos y secundarios sospechosos...",
        "El libro está recordando cómo empezaba...",
        "Cuidado: aventura en proceso de invocación.",
        "Preparando la lámpara, la manta y el caos narrativo...",
        "La portada se está abriendo sola...",
        "Cargando mundos, mapas y decisiones cuestionables...",
        "El dragón está marcando tu última página...",
        "Los pergaminos se están desenrollando...",
        "Silencio, la historia está despertando...",
        "Invocando escenas pendientes...",
        "Los márgenes están susurrando spoilers. Ignóralos.",
        "El capítulo está entrando en escena con dramatismo.",
        "Ajustando el marcapáginas dimensional...",
        "Reanudando la expedición literaria...",
        "Poniendo a los protagonistas en posición de sufrir...",
        "El libro está abriendo sus fauces...",
        "Cargando una dosis aceptable de fantasía y café imaginario...",
    )

    val EXTRA = listOf(
        "El dragón olvidó la contraseña. Otra vez.",
        "Los personajes no quieren salir todavía.",
        "Buscando al protagonista. Se había ido a por pan.",
        "El villano está maquillándose. Un momento.",
        "El libro está cargando... y juzgando tus hábitos de sueño.",
        "El dragón insiste en releer el prólogo.",
        "Hay un mago bloqueando la página. Estamos negociando.",
        "Los capítulos se han desordenado. Culpa del duende.",
        "El narrador está improvisando con dignidad.",
        "El marcapáginas cayó en otra dimensión.",
        "Los secundarios piden más protagonismo. Ignóralos.",
        "El dragón está escribiendo \"cargando\" con caligrafía gótica.",
        "Preparando tragedias menores y aventuras mayores.",
        "La biblioteca está abierta, pero el dragón busca las llaves.",
        "Cargando... porque incluso la magia necesita un segundo.",
    )

    /** La frase de cada carga, como `getRandomLoaderMessage`. */
    fun para(contexto: ContextoDeCarga, azar: Random = Random.Default): String = when (contexto) {
        ContextoDeCarga.BIBLIOTECA -> BIBLIOTECA
        ContextoDeCarga.ENTRADA -> ENTRAR.random(azar)
        ContextoDeCarga.LIBRO -> (LIBRO + EXTRA).random(azar)
        ContextoDeCarga.OTRO -> EXTRA.random(azar)
    }

    /**
     * El cargador para [contexto], con el dragón de este arranque ([dragon]). Si ya había uno abierto ([anterior]), se
     * conserva su frase: en la web, la frase solo se elige al abrirse.
     */
    fun abrir(contexto: ContextoDeCarga, anterior: CargaDelDragon?, azar: Random = Random.Default, dragon: String = DE_ESTA_VEZ): CargaDelDragon =
        anterior ?: CargaDelDragon(contexto, dragon, para(contexto, azar))
}

/**
 * `.dragon-loader`: encima de todo y sin dejar tocar lo de debajo, el lienzo al 58 %, el dragón (78 % del ancho hasta
 * 720 dp y 58 % del alto; 96 % y 48 % en compacto) con su sombra, la barra de 8 dp con su degradado (error, acento y aviso) que corre cada 1,15 s, y la frase.
 */
@Composable
fun CargadorDelDragon(carga: CargaDelDragon) {
    val colores = LocalColores.current
    val barra by rememberInfiniteTransition(label = "dragon").animateFloat(
        -1.05f, 2.45f, infiniteRepeatable(tween(1150, easing = FastOutSlowInEasing), RepeatMode.Restart), label = "barra",
    )
    BoxWithConstraints(
        Modifier.fillMaxSize().background(mezclar(colores.lienzo, 0.58f))
            // Como `pointer-events: all`: lo de debajo no se puede tocar mientras carga.
            .clickable(remember { MutableInteractionSource() }, indication = null) {}
            .semantics { contentDescription = carga.frase; liveRegion = LiveRegionMode.Polite },
        contentAlignment = Alignment.Center,
    ) {
        val compacta = maxWidth < 700.dp
        val anchoDelDragon = if (compacta) maxWidth * 0.96f else min(maxWidth * 0.78f, 720.dp)
        val altoDelDragon = maxHeight * (if (compacta) 0.48f else 0.58f)
        val anchoDeLaBarra = if (compacta) min(maxWidth * 0.78f, 360.dp) else min(maxWidth * 0.52f, 420.dp)
        val anchoDelTexto = min(544.dp, maxWidth - 32.dp)
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            AsyncImage(
                model = "file:///android_asset/dragones/${carga.dragon}",
                contentDescription = null,
                modifier = Modifier.width(anchoDelDragon).heightIn(max = altoDelDragon),
                contentScale = ContentScale.Fit,
            )
            val forma = RoundedCornerShape(50)
            Box(
                Modifier.padding(top = 18.dp).width(anchoDeLaBarra).height(8.dp)
                    .shadow(6.dp, forma).clip(forma).background(colores.superficie).border(1.dp, colores.contorno, forma),
            ) {
                Box(
                    Modifier.fillMaxHeight().fillMaxWidth(0.42f)
                        .graphicsLayer { translationX = size.width * barra }
                        .clip(forma)
                        .background(Brush.horizontalGradient(listOf(colores.error, colores.terciario, colores.atencion))),
                )
            }
            Text(
                carga.frase,
                Modifier.padding(top = 8.dp).widthIn(max = anchoDelTexto),
                color = colores.tinta,
                style = Textos.cuerpo.copy(fontSize = rem(0.88), fontWeight = FontWeight.SemiBold),
                textAlign = TextAlign.Center,
            )
        }
    }
}
