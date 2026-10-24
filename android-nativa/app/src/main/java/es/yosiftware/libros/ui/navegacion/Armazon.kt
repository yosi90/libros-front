package es.yosiftware.libros.ui.navegacion

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.lifecycle.viewmodel.compose.viewModel
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.zonaSegura
import es.yosiftware.libros.ui.tema.Alturas
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.TemaMobile

/**
 * El shell de la app con sesión, como `.library-shell--mobile` con `app-mobile-dashboard-chrome`
 * (src/app/components/pages/dahsboard/). En la ventana compacta, la app bar arriba y la barra inferior abajo, y el
 * contenido entre las dos (64 dp más la zona segura de arriba; 72 más la de abajo). Desde 600 dp, el rail a la
 * izquierda y el contenido a su lado, desde la zona segura de arriba hasta el borde de abajo, sin app bar.
 *
 * El avatar (la miniatura del perfil de la plataforma) va en la app bar, el rail y la hoja «Más». Los de la app bar y el
 * rail llevan a Perfil, como en la APK actual; la entrada «Cuenta» de la hoja abre el panel de cuentas ([alAbrirCuentas]).
 * [aviso] va encima del contenido (sin conexión).
 *
 * Atrás cierra antes la hoja «Más» y después vuelve por el historial; sin historial, sale de la app. Cada destino
 * guarda su estado (desplazamiento, lo escrito) al ir a otro y volver, y todo sobrevive a plegar y desplegar.
 *
 * TODO(clon): por encima de 1050 dp el Sass de la APK deja de reservar el hueco del rail y la campana
 * (dahsboard.component.sass, `max-width: 1050px`, y mobile-navigation.component.html, `isMedium`); aquí la ventana
 * expandida se trata como la media hasta compararla con las capturas.
 *
 * TODO(clon): con el teclado abierto, aquí el contenido sube sobre él y la barra inferior queda debajo; comprobar en las
 * capturas qué hace la WebView (src/assets/css/_adaptive-layout.sass y `--app-keyboard-inset`).
 */
@Composable
fun Armazon(
    nombre: String,
    tema: TemaMobile,
    alAlternarTema: () -> Unit,
    nav: NavegacionViewModel = viewModel(),
    avatar: String? = null,
    alAbrirCuentas: () -> Unit = {},
    aviso: (@Composable () -> Unit)? = null,
    /** Con la hoja «Más» ya abierta (las muestras de depuración). */
    masAbiertaAlPrincipio: Boolean = false,
    contenido: @Composable (Destino) -> Unit = { PantallaVacia(it) },
) {
    val colores = LocalColores.current
    val ventana = LocalVentana.current
    val zona = WindowInsets.zonaSegura.asPaddingValues()
    val direccion = LocalLayoutDirection.current
    var masAbierta by rememberSaveable { mutableStateOf(masAbiertaAlPrincipio) }
    val porDestino = rememberSaveableStateHolder()

    // La hoja «Más» registra el suyo después, así que Atrás la cierra antes que volver.
    BackHandler(enabled = nav.puedeVolver) { nav.volver() }

    val estado = EstadoDeNavegacion(actual = nav.actual, masAbierta = masAbierta)
    val elegir: (Destino) -> Unit = { destino -> nav.irA(destino) }
    val alternarMas = { masAbierta = !masAbierta }

    Box(Modifier.fillMaxSize().background(colores.lienzo)) {
        val hueco = if (ventana.clase.conRail) {
            PaddingValues(start = Alturas.anchoRail + zona.calculateLeftPadding(direccion), top = zona.calculateTopPadding())
        } else {
            PaddingValues(
                top = Alturas.barraSuperior + zona.calculateTopPadding(),
                bottom = Alturas.navegacionInferior + zona.calculateBottomPadding(),
            )
        }
        Box(
            Modifier
                .fillMaxSize()
                .padding(hueco)
                .consumeWindowInsets(hueco)
                .imePadding(),
        ) {
            Column(Modifier.fillMaxSize()) {
                // El aviso de la sesión (sin conexión), encima del contenido.
                aviso?.invoke()
                Box(Modifier.weight(1f).fillMaxWidth()) {
                    porDestino.SaveableStateProvider(nav.actual.name) { contenido(nav.actual) }
                }
            }
        }

        if (ventana.clase.conRail) {
            Rail(
                estado, elegir, alternarMas, alPulsarAvisos = { elegir(Destino.Avisos) }, Modifier.align(Alignment.TopStart),
                // Como en la APK de Capacitor, el avatar del rail lleva a Perfil; el panel de cuentas se abre desde «Más › Cuenta».
                avatar = avatar, nombre = nombre,
            )
        } else {
            // La app bar va encima del contenido, como la `fixed` de la web (con z-index 20).
            BarraSuperior(nav.actual.titulo, Modifier.align(Alignment.TopStart)) {
                BotonDeCampana(abierta = nav.actual == Destino.Avisos, sinLeer = false, alPulsar = { elegir(Destino.Avisos) })
                BotonDePerfil(mensajesSinLeer = 0, avatar = avatar, nombre = nombre) {
                    masAbierta = false
                    elegir(Destino.Perfil)
                }
            }
            BarraInferior(estado, elegir, alternarMas, Modifier.align(Alignment.BottomCenter))
        }

        HojaMas(
            abierta = masAbierta,
            alCerrar = { masAbierta = false },
            nombre = nombre,
            actual = nav.actual,
            tema = tema,
            alAlternarTema = alAlternarTema,
            alElegir = elegir,
            avatar = avatar,
            alAbrirCuentas = alAbrirCuentas,
        )
    }
}
