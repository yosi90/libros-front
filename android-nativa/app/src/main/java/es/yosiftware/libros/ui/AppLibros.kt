package es.yosiftware.libros.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import es.yosiftware.libros.BuildConfig
import es.yosiftware.libros.LibrosApp
import es.yosiftware.libros.datos.cuenta.AlmacenDelMovil
import es.yosiftware.libros.ui.biblioteca.BibliotecaViewModel
import es.yosiftware.libros.ui.biblioteca.CapasDeBiblioteca
import es.yosiftware.libros.ui.biblioteca.PantallaBiblioteca
import es.yosiftware.libros.ui.catalogo.CapasDeCatalogo
import es.yosiftware.libros.ui.catalogo.CatalogoViewModel
import es.yosiftware.libros.ui.catalogo.PantallaCatalogo
import es.yosiftware.libros.datos.modelos.Obra
import es.yosiftware.libros.ui.estadisticas.EstadisticasViewModel
import es.yosiftware.libros.ui.libro.ContenidoDelLibro
import es.yosiftware.libros.ui.libro.LibroViewModel
import es.yosiftware.libros.ui.libro.PantallaLibro
import es.yosiftware.libros.ui.estadisticas.PantallaEstadisticas
import es.yosiftware.libros.ui.componentes.AnfitrionDeAvisos
import es.yosiftware.libros.ui.componentes.Avisos
import es.yosiftware.libros.ui.componentes.LocalAvisos
import es.yosiftware.libros.ui.navegacion.Destino
import es.yosiftware.libros.ui.navegacion.NavegacionViewModel
import es.yosiftware.libros.ui.navegacion.PantallaVacia
import es.yosiftware.libros.cuenta.AccesoALaSesion
import es.yosiftware.libros.cuenta.ServicioDeEntrada
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.rememberVentana
import es.yosiftware.libros.ui.cuenta.AvisoSinConexion
import es.yosiftware.libros.ui.cuenta.CuentaViewModel
import es.yosiftware.libros.ui.cuenta.LectorDeNormas
import es.yosiftware.libros.ui.cuenta.LocalCuenta
import es.yosiftware.libros.ui.cuenta.PanelDeCuentas
import es.yosiftware.libros.ui.cuenta.PantallaDeLaSesion
import es.yosiftware.libros.ui.cuenta.PantallaDeNormasDeLibros
import es.yosiftware.libros.ui.cuenta.PantallaSinConfiguracion
import es.yosiftware.libros.ui.cuenta.PerfilesViewModel
import es.yosiftware.libros.ui.navegacion.Armazon
import es.yosiftware.libros.ui.tema.TemaLibros
import es.yosiftware.libros.ui.tema.TemaViewModel
import es.yosiftware.sesion.CuentaGuardada
import es.yosiftware.sesion.EstadoSesion
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * La app entera: el tema, la ventana (clase y postura del plegable, para todas las pantallas) y la pantalla de cada
 * estado de la sesión (ecosistema-kit/APK.md, la tabla de estados):
 * - `ConSesion`, o `SinConexion` con la sesión guardada: el shell (con el aviso de sin conexión y «Reintentar»). Con las
 *   normas de Libros pendientes, antes sus normas.
 * - Los demás: su pantalla (ui/cuenta/PantallasDeCuenta.kt), con el aspecto de las públicas de la APK de Capacitor.
 *
 * Cada identidad nueva (A → B, o A → B → A) rehace el shell desde cero (`key` con la generación del ámbito): lo que se
 * escribió o se guardó en pantalla con la anterior no llega a la siguiente (ecosistema-kit/CAMBIO_DE_CUENTA.md). Los
 * datos de cada pantalla se vacían con [es.yosiftware.libros.datos.cuenta.ViewModelDeCuenta].
 */
@Composable
fun AppLibros(app: LibrosApp) {
    val temaViewModel: TemaViewModel = viewModel()
    val acceso = remember(app) { app.sesion?.let { AccesoALaSesion.DeLaLibreria(it) } }
    val cuenta: CuentaViewModel = viewModel {
        CuentaViewModel(
            sesion = acceso,
            alEmpezarGoogle = { ServicioDeEntrada.empezar(app) },
            alTerminarGoogle = { ServicioDeEntrada.terminar(app) },
            mostrarCodigos = BuildConfig.PLATAFORMA_QA,
        )
    }
    val perfiles: PerfilesViewModel = viewModel {
        PerfilesViewModel(app.datos.ambito, acceso?.cuentas ?: MutableStateFlow(emptyList()), app.datos.perfiles, app.datos.apiPlataforma)
    }
    // Los avisos flotantes de toda la app (app-toast-host), y la Biblioteca y el Catálogo (hito 8), que son de la cuenta.
    val avisos = remember { Avisos() }
    val biblioteca: BibliotecaViewModel = viewModel {
        BibliotecaViewModel(app.datos.ambito, app.datos.coleccion, app.datos.catalogo, AlmacenDelMovil(app), avisos)
    }
    val nav: NavegacionViewModel = viewModel()
    val catalogo: CatalogoViewModel = viewModel {
        CatalogoViewModel(app.datos.ambito, app.datos.catalogo, app.datos.coleccion, app.datos.peticiones, avisos, biblioteca::recibirUniversos)
    }
    val estadisticas: EstadisticasViewModel = viewModel {
        EstadisticasViewModel(app.datos.ambito, app.datos.estadisticas, app.datos.catalogo)
    }
    catalogo.alVerEnBiblioteca = { obra ->
        nav.irA(Destino.Biblioteca)
        biblioteca.revelar(obra)
    }
    // El libro abierto (hito 9), a pantalla completa por encima de todo.
    val libro: LibroViewModel = viewModel {
        LibroViewModel(app.datos.ambito, app.datos.libro, app.datos.coleccion, avisos)
    }
    val abrirLibro: (Obra) -> Unit = libro::abrir
    TemaLibros(temaViewModel.tema) {
        CompositionLocalProvider(LocalVentana provides rememberVentana(), LocalCuenta provides cuenta, LocalAvisos provides avisos) {
            val estado = acceso?.estado?.collectAsStateWithLifecycle()?.value
            val cuentas: List<CuentaGuardada> = acceso?.cuentas?.collectAsStateWithLifecycle()?.value.orEmpty()
            val identidad by app.datos.ambito.identidad.collectAsStateWithLifecycle()
            // Solo para revisar la navegación en depuración en una compilación sin la configuración de la plataforma.
            var verSinCuenta by rememberSaveable { mutableStateOf(false) }
            var panelAbierto by rememberSaveable { mutableStateOf(false) }
            val conShell = estado is EstadoSesion.ConSesion || estado is EstadoSesion.SinConexion
            LaunchedEffect(conShell) { if (!conShell) panelAbierto = false }

            Box(Modifier.fillMaxSize()) {
                when {
                    estado == null -> if (BuildConfig.DEBUG && verSinCuenta) {
                        Armazon(nombre = "Sin cuenta", tema = temaViewModel.tema, alAlternarTema = temaViewModel::alternar)
                    } else {
                        PantallaSinConfiguracion(alVerSinCuenta = if (BuildConfig.DEBUG) ({ verSinCuenta = true }) else null)
                    }
                    estado is EstadoSesion.ConSesion && estado.normasPendientes != null ->
                        PantallaDeNormasDeLibros(cuenta, estado.normasPendientes!!)
                    conShell -> key(identidad?.generacion) {
                        val conSesion = estado as? EstadoSesion.ConSesion
                        val activaId = identidad?.cuentaId
                        val alias = conSesion?.cuenta?.alias ?: cuentas.firstOrNull { it.activa }?.alias.orEmpty()
                        Armazon(
                            nombre = perfiles.nombre(activaId, alias),
                            tema = temaViewModel.tema,
                            alAlternarTema = temaViewModel::alternar,
                            avatar = perfiles.avatar(activaId),
                            alAbrirCuentas = { panelAbierto = true },
                            nav = nav,
                            contenido = { destino ->
                                when (destino) {
                                    Destino.Biblioteca -> PantallaBiblioteca(
                                        vm = biblioteca,
                                        alAbrirLibro = abrirLibro,
                                        alAbrirAntologia = biblioteca::abrirAntologia,
                                        // «Ver ediciones»: la ficha de la obra en el catálogo; al cerrarla, de vuelta a la biblioteca.
                                        alVerEdiciones = { obra ->
                                            catalogo.abrirFicha(obra, volver = { nav.irA(Destino.Biblioteca) })
                                            nav.irA(Destino.Catalogo)
                                        },
                                        alAbrirCatalogo = { nav.irA(Destino.Catalogo) },
                                    )
                                    Destino.Catalogo -> PantallaCatalogo(catalogo)
                                    Destino.Estadisticas -> PantallaEstadisticas(estadisticas)
                                    else -> PantallaVacia(destino)
                                }
                            },
                            aviso = (estado as? EstadoSesion.SinConexion)?.let { sinConexion ->
                                {
                                    AvisoSinConexion(
                                        "${sinConexion.motivo.mensaje} Sigues con lo que hay en el móvil.",
                                        ocupado = cuenta.ocupado,
                                        alReintentar = cuenta::reintentar,
                                    )
                                }
                            },
                        )
                        PanelDeCuentas(
                            abierto = panelAbierto,
                            alCerrar = { panelAbierto = false },
                            vm = cuenta,
                            perfiles = perfiles,
                            activaId = activaId,
                            alias = alias,
                            correo = conSesion?.cuenta?.correo,
                            cuentas = cuentas,
                        )
                    }
                    else -> PantallaDeLaSesion(estado, cuenta, perfiles, cuentas)
                }

                // La antología, la ficha, la saga, los editores y las peticiones, a pantalla completa, encima del shell.
                if (conShell) {
                    CapasDeBiblioteca(
                        vm = biblioteca,
                        alAbrirSeccion = abrirLibro,
                        // La ficha de la antología en el catálogo; al cerrarla, de vuelta a la antología.
                        alVerFicha = { antologia ->
                            biblioteca.cerrarAntologia()
                            catalogo.abrirFicha(antologia, volver = {
                                nav.irA(Destino.Biblioteca)
                                biblioteca.abrirAntologia(antologia)
                            })
                            nav.irA(Destino.Catalogo)
                        },
                        alBuscarSimilares = { antologia ->
                            biblioteca.cerrarAntologia()
                            catalogo.buscarSimilares(antologia)
                            nav.irA(Destino.Catalogo)
                        },
                    )
                    CapasDeCatalogo(catalogo, alAbrirLectura = abrirLibro)
                    PantallaLibro(libro) { vista -> ContenidoDelLibro(libro, vista) }
                }
                AnfitrionDeAvisos(avisos, Modifier.align(Alignment.BottomCenter))

                // Las normas que se están leyendo, a pantalla completa, encima de su pantalla.
                cuenta.normas?.let { normas ->
                    val aceptar: (() -> Unit)? = when {
                        estado is EstadoSesion.NormasDeUsoPendientes -> cuenta::aceptarNormasDeUso
                        estado is EstadoSesion.ConSesion && estado.normasPendientes != null -> cuenta::aceptarNormasDeLaWeb
                        else -> null
                    }
                    LectorDeNormas(normas, aceptar, cuenta.ocupado, cuenta::cerrarNormas)
                }
            }
        }
    }
}
