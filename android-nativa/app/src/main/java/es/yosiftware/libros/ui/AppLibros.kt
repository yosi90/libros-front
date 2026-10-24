package es.yosiftware.libros.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import es.yosiftware.libros.BuildConfig
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.rememberVentana
import es.yosiftware.libros.ui.navegacion.Armazon
import es.yosiftware.libros.ui.sesion.PantallaComprobando
import es.yosiftware.libros.ui.sesion.PantallaProvisional
import es.yosiftware.libros.ui.tema.TemaLibros
import es.yosiftware.libros.ui.tema.TemaViewModel
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.SesionYosiftware

/**
 * La app entera: el tema, la ventana (clase y postura del plegable, para todas las pantallas) y la pantalla que toca
 * según la sesión. Con sesión, o sin conexión pero con la sesión guardada, el shell; el resto de estados tendrá sus
 * pantallas en el hito 6.
 */
@Composable
fun AppLibros(sesion: SesionYosiftware?) {
    val temaViewModel: TemaViewModel = viewModel()
    TemaLibros(temaViewModel.tema) {
        CompositionLocalProvider(LocalVentana provides rememberVentana()) {
            val estado = sesion?.estado?.collectAsStateWithLifecycle()?.value
            // Solo para revisar la navegación en depuración mientras no se puede entrar.
            var verSinCuenta by rememberSaveable { mutableStateOf(false) }
            val cuenta = (estado as? EstadoSesion.ConSesion)?.cuenta
            when {
                estado is EstadoSesion.ConSesion || estado is EstadoSesion.SinConexion || (BuildConfig.DEBUG && verSinCuenta) ->
                    Armazon(nombre = cuenta?.alias ?: "Sin cuenta", tema = temaViewModel.tema, alAlternarTema = temaViewModel::alternar)
                estado is EstadoSesion.Comprobando -> PantallaComprobando()
                else -> PantallaProvisional(
                    sinConfiguracion = sesion == null,
                    motivo = (estado as? EstadoSesion.SinSesion)?.motivo?.mensaje,
                    alVerSinCuenta = if (BuildConfig.DEBUG) ({ verSinCuenta = true }) else null,
                )
            }
        }
    }
}
