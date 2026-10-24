package es.yosiftware.libros.ui.tema

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Los colores de la presentación Mobile, uno por token de `src/assets/css/mobile/_tokens.sass` (el nombre del token, al
 * lado). Las pantallas solo usan estos: ningún componente decide un color según el tema (docs/GUIA_ESTILOS.md, Mobile).
 */
@Immutable
data class Colores(
    val lienzo: Color, // --mobile-color-canvas
    val lienzoFuerte: Color, // --mobile-color-canvas-strong
    val superficie: Color, // --mobile-color-surface
    val superficieContenedor: Color, // --mobile-color-surface-container
    val superficieAlta: Color, // --mobile-color-surface-high
    val tinta: Color, // --mobile-color-ink
    val tintaSuave: Color, // --mobile-color-ink-muted
    val contorno: Color, // --mobile-color-outline
    val contornoFuerte: Color, // --mobile-color-outline-strong
    val primario: Color, // --mobile-color-primary
    val primarioEncima: Color, // --mobile-color-primary-hover
    val contenedorPrimario: Color, // --mobile-color-primary-container
    val sobrePrimario: Color, // --mobile-color-on-primary
    val sobreContenedorPrimario: Color, // --mobile-color-on-primary-container
    val secundario: Color, // --mobile-color-secondary
    val contenedorSecundario: Color, // --mobile-color-secondary-container
    val terciario: Color, // --mobile-color-tertiary
    val error: Color, // --mobile-color-error
    val contenedorError: Color, // --mobile-color-error-container
    val exito: Color, // --mobile-color-success
    val contenedorExito: Color, // --mobile-color-success-container
    val info: Color, // --mobile-color-info
    val contenedorInfo: Color, // --mobile-color-info-container
    val atencion: Color, // --mobile-color-warning
    val contenedorAtencion: Color, // --mobile-color-warning-container
    val velo: Color, // --mobile-color-scrim
    val oscuro: Boolean,
)

val ColoresClaros = Colores(
    lienzo = Color(0xFFF5F2EA),
    lienzoFuerte = Color(0xFFECE8DD),
    superficie = Color(0xFFFFFDF8),
    superficieContenedor = Color(0xFFEBE8DF),
    superficieAlta = Color(0xFFE1DED5),
    tinta = Color(0xFF18211E),
    tintaSuave = Color(0xFF5D6863),
    contorno = Color(0xFFC4CCC7),
    contornoFuerte = Color(0xFF7B8983),
    primario = Color(0xFF006B5D),
    primarioEncima = Color(0xFF00584D),
    contenedorPrimario = Color(0xFF9FF2DF),
    sobrePrimario = Color(0xFFFFFFFF),
    sobreContenedorPrimario = Color(0xFF00201B),
    secundario = Color(0xFF4B635D),
    contenedorSecundario = Color(0xFFCEE9E1),
    terciario = Color(0xFF5D5F7D),
    error = Color(0xFFBA1A1A),
    contenedorError = Color(0xFFFFDAD6),
    exito = Color(0xFF276A45),
    contenedorExito = Color(0xFFB2F2C7),
    info = Color(0xFF245FA8),
    contenedorInfo = Color(0xFFD8E9FF),
    atencion = Color(0xFF805600),
    contenedorAtencion = Color(0xFFFFDEA6),
    velo = Color(red = 21, green = 29, blue = 26, alpha = 112), // rgba(21, 29, 26, .44)
    oscuro = false,
)

val ColoresOscuros = Colores(
    lienzo = Color(0xFF111916),
    lienzoFuerte = Color(0xFF17211D),
    superficie = Color(0xFF1B2521),
    superficieContenedor = Color(0xFF25312C),
    superficieAlta = Color(0xFF303D37),
    tinta = Color(0xFFE6EEE9),
    tintaSuave = Color(0xFFB7C4BE),
    contorno = Color(0xFF52615A),
    contornoFuerte = Color(0xFF899790),
    primario = Color(0xFF79D9C6),
    primarioEncima = Color(0xFF95E5D5),
    contenedorPrimario = Color(0xFF164F45),
    sobrePrimario = Color(0xFF00372F),
    sobreContenedorPrimario = Color(0xFFB6F4E7),
    secundario = Color(0xFFB3CCC4),
    contenedorSecundario = Color(0xFF344B44),
    terciario = Color(0xFFC4C5EB),
    error = Color(0xFFFFB4AB),
    contenedorError = Color(0xFF6F2525),
    exito = Color(0xFF8ED8A8),
    contenedorExito = Color(0xFF244D34),
    info = Color(0xFFA8C8FF),
    contenedorInfo = Color(0xFF17375F),
    atencion = Color(0xFFF1C879),
    contenedorAtencion = Color(0xFF594315),
    velo = Color(red = 0, green = 0, blue = 0, alpha = 158), // rgba(0, 0, 0, .62)
    oscuro = true,
)

val LocalColores = staticCompositionLocalOf { ColoresClaros }

/**
 * `color-mix(in srgb, a p%, b)` de CSS: mezcla en sRGB con el alfa premultiplicado, como el navegador. No sirve
 * `lerp` de Compose, que mezcla en Oklab y da otro color. Con `b` transparente, es `a` con su alfa por [porcentajeA].
 */
fun mezclar(a: Color, porcentajeA: Float, b: Color = Color.Transparent): Color {
    val pa = porcentajeA.coerceIn(0f, 1f)
    val pb = 1f - pa
    val alfa = a.alpha * pa + b.alpha * pb
    if (alfa == 0f) return Color.Transparent
    fun canal(x: Float, y: Float) = ((x * a.alpha * pa + y * b.alpha * pb) / alfa).coerceIn(0f, 1f)
    return Color(canal(a.red, b.red), canal(a.green, b.green), canal(a.blue, b.blue), alfa.coerceIn(0f, 1f))
}
