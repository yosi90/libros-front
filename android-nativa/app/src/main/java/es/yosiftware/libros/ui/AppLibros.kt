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
import es.yosiftware.libros.ui.libro.BusquedaViewModel
import es.yosiftware.libros.ui.libro.CapituloViewModel
import es.yosiftware.libros.ui.libro.VistaDelLibro
import java.io.File
import es.yosiftware.libros.ui.libro.LibroViewModel
import es.yosiftware.libros.ui.libro.NotasViewModel
import es.yosiftware.libros.ui.elementos.ElementosViewModel
import es.yosiftware.libros.ui.libro.Elemento
import es.yosiftware.libros.ui.libro.IslaDelLector
import es.yosiftware.libros.ui.libro.PantallaLibro
import es.yosiftware.libros.ui.estadisticas.PantallaEstadisticas
import es.yosiftware.libros.ui.comunidad.AccionesDeComunidad
import es.yosiftware.libros.ui.comunidad.ActividadViewModel
import es.yosiftware.libros.ui.comunidad.CentroDeAccesoViewModel
import es.yosiftware.libros.ui.comunidad.ClubesViewModel
import es.yosiftware.libros.ui.comunidad.ComunidadViewModel
import es.yosiftware.libros.ui.comunidad.CreacionDeClub
import es.yosiftware.libros.ui.comunidad.AccionesDelClub
import es.yosiftware.libros.ui.comunidad.ClubViewModel
import es.yosiftware.libros.ui.comunidad.PantallaClub
import es.yosiftware.libros.ui.comunidad.PantallaComunidad
import es.yosiftware.libros.ui.comunidad.SeccionDeComunidad
import es.yosiftware.libros.ui.mensajes.MensajesViewModel
import es.yosiftware.libros.ui.mensajes.PantallaMensajes
import es.yosiftware.libros.ui.mensajes.ConversacionViewModel
import es.yosiftware.libros.push.AperturaDeAviso
import es.yosiftware.libros.push.FiltroDePush as PushFiltro
import es.yosiftware.libros.ui.avisos.AccionesDelPanel
import es.yosiftware.libros.ui.comunidad.AccionesDeInvitacion
import es.yosiftware.libros.ui.comunidad.DialogoDeInvitacion
import es.yosiftware.libros.ui.comunidad.InvitacionPorCodigoViewModel
import es.yosiftware.sesion.EspaciosYosiftware
import es.yosiftware.libros.datos.ComprobacionDeVersion
import android.content.Context
import es.yosiftware.libros.ui.avisos.CentroDeAvisosViewModel
import es.yosiftware.libros.ui.avisos.PanelDeAvisos
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay
import es.yosiftware.libros.push.DestinoDeEnlace
import es.yosiftware.libros.push.DestinoDelAviso
import es.yosiftware.libros.push.PushLibros
import es.yosiftware.libros.push.mismaCuenta
import es.yosiftware.libros.ui.componentes.AccionDeAviso
import es.yosiftware.libros.ui.comunidad.DireccionDeAcceso
import es.yosiftware.libros.ui.comunidad.PestanaDeClubes
import es.yosiftware.libros.ui.comunidad.TipoDeAcceso
import es.yosiftware.libros.ui.perfil.SeccionDelPerfil
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import es.yosiftware.libros.ui.mensajes.PantallaConversacion
import kotlinx.coroutines.flow.emptyFlow
import es.yosiftware.libros.ui.perfil.FuenteDelPerfil
import es.yosiftware.libros.ui.perfil.IdentidadDelPerfil
import es.yosiftware.libros.ui.perfil.PantallaPerfil
import es.yosiftware.libros.ui.perfil.Perfil
import es.yosiftware.libros.ui.perfil.PerfilViewModel
import es.yosiftware.libros.ui.preferencias.PantallaPreferencias
import es.yosiftware.libros.cuenta.Enlaces
import androidx.compose.ui.platform.LocalContext
import es.yosiftware.libros.ui.componentes.AnfitrionDeAvisos
import es.yosiftware.libros.ui.componentes.CargadorDelDragon
import es.yosiftware.libros.ui.componentes.ContextoDeCarga
import es.yosiftware.libros.ui.componentes.FrasesDelDragon
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
    // Un push de la cuenta activa con la app delante: un aviso flotante con «Abrir» en vez del aviso del sistema (D4).
    LaunchedEffect(Unit) {
        app.avisoRecibido.collect { push ->
            avisos.exitoConAccion(push.cuerpo ?: push.titulo, AccionDeAviso("Abrir") { app.aperturas.value = AperturaDeAviso.de(push) }, titulo = push.titulo)
        }
    }
    val biblioteca: BibliotecaViewModel = viewModel {
        BibliotecaViewModel(app.datos.ambito, app.datos.coleccion, app.datos.catalogo, AlmacenDelMovil(app), avisos)
    }
    val nav: NavegacionViewModel = viewModel()
    var masAbierta by remember { mutableStateOf(false) }
    val catalogo: CatalogoViewModel = viewModel {
        CatalogoViewModel(app.datos.ambito, app.datos.catalogo, app.datos.coleccion, app.datos.peticiones, avisos, biblioteca::recibirUniversos)
    }
    val estadisticas: EstadisticasViewModel = viewModel {
        EstadisticasViewModel(app.datos.ambito, app.datos.estadisticas, app.datos.catalogo, usuario = app.datos.usuario)
    }
    val perfil: PerfilViewModel = viewModel {
        PerfilViewModel(
            app.datos.ambito,
            FuenteDelPerfil.DeLosRepositorios(app.datos.coleccion, app.datos.estadisticas, app.datos.peticiones, app.datos.reportes),
            avisos,
        )
    }
    // Comunidad (hito 11): la pestaña con su Resumen, los clubes y el centro de acceso, todos de la cuenta.
    val comunidad: ComunidadViewModel = viewModel { ComunidadViewModel(app.datos.ambito, app.datos.clubes, app.datos.espacios) }
    val clubes: ClubesViewModel = viewModel { ClubesViewModel(app.datos.ambito, app.datos.clubes) }
    val centroDeAcceso: CentroDeAccesoViewModel = viewModel { CentroDeAccesoViewModel(app.datos.ambito, app.datos.espacios) }
    val actividad: ActividadViewModel = viewModel { ActividadViewModel(app.datos.ambito, app.datos.novedades) }
    val mensajes: MensajesViewModel = viewModel { MensajesViewModel(app.datos.ambito, app.datos.bandeja, app.datos.chat) }
    val centroDeAvisos: CentroDeAvisosViewModel = viewModel {
        CentroDeAvisosViewModel(app.datos.ambito, app.datos.avisos, app.datos.tiempoReal?.eventos ?: emptyFlow())
    }
    // El contador de la campana: al volver a la app y cada minuto con ella delante.
    val cicloDeLaApp = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(cicloDeLaApp) {
        cicloDeLaApp.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) {
                centroDeAvisos.refrescarContador()
                delay(60_000)
            }
        }
    }
    // El aviso de versión nueva (D6: una vez por versión): al arrancar y al volver a la app si han pasado 12 horas. No
    // depende de la sesión; si falla, nada.
    val contextoDeVersion = LocalContext.current
    LaunchedEffect(cicloDeLaApp) {
        var ultimaComprobacion = 0L
        cicloDeLaApp.repeatOnLifecycle(Lifecycle.State.STARTED) {
            if (System.currentTimeMillis() - ultimaComprobacion < 12 * 60 * 60 * 1000L) return@repeatOnLifecycle
            ultimaComprobacion = System.currentTimeMillis()
            val respuesta = runCatching { app.datos.plataforma?.sinToken("GET", "/v1/webs") }.getOrNull() ?: return@repeatOnLifecycle
            val nueva = ComprobacionDeVersion.nueva(respuesta, BuildConfig.APPLICATION_ID, BuildConfig.VERSION_CODE)
            val preferencias = app.getSharedPreferences("version", Context.MODE_PRIVATE)
            if (nueva != null && ComprobacionDeVersion.hayQueAvisar(nueva, preferencias.getInt("avisada", 0))) {
                preferencias.edit().putInt("avisada", nueva.codigo).apply()
                avisos.exitoConAccion(
                    "La versión ${nueva.version} está disponible para Android.",
                    AccionDeAviso("Descargar") { Enlaces.abrir(contextoDeVersion, nueva.instalacion) },
                    titulo = "Actualización disponible",
                    duracionMs = 30_000,
                )
            }
        }
    }
    // Y al llegar un push con la app delante.
    LaunchedEffect(Unit) { app.avisoRecibido.collect { centroDeAvisos.alCambiarEnLaPlataforma() } }
    val sinLeer by app.datos.bandeja.sinLeer.collectAsStateWithLifecycle()
    // Abre Comunidad › Mensajes y, con [id], esa conversación (el chat de un club, un aviso).
    val abrirMensajes: (Long?) -> Unit = { id ->
        comunidad.abrir(SeccionDeComunidad.MENSAJES)
        if (id != null) mensajes.abrir(id) else mensajes.cerrar()
        nav.irA(Destino.Comunidad)
    }

    // La pantalla de un aviso (la tabla de destinos de push/DestinoDelAviso.kt).
    val contextoDeLaApp = LocalContext.current
    // El libro de un enlace `/book/{id}`: se abre cuando la Biblioteca ya tiene la colección.
    var libroPedido by remember { mutableStateOf<Int?>(null) }
    val irAlAviso: (DestinoDelAviso) -> Unit = { destino ->
        val accesoA: (TipoDeAcceso) -> Unit = { tipo ->
            comunidad.abrir(SeccionDeComunidad.CLUBES)
            clubes.elegir(PestanaDeClubes.ACCESO)
            centroDeAcceso.ir(tipo, DireccionDeAcceso.RECIBIDAS)
            nav.irA(Destino.Comunidad)
        }
        when (destino) {
            DestinoDelAviso.Peticiones, DestinoDelAviso.Reportes -> {
                perfil.abrir(if (destino == DestinoDelAviso.Peticiones) SeccionDelPerfil.PETICIONES else SeccionDelPerfil.REPORTES)
                nav.irA(Destino.Perfil)
            }
            DestinoDelAviso.Clubes, DestinoDelAviso.MisClubes -> {
                comunidad.abrir(SeccionDeComunidad.CLUBES)
                if (destino == DestinoDelAviso.MisClubes) clubes.elegir(PestanaDeClubes.MIS_CLUBES)
                nav.irA(Destino.Comunidad)
            }
            is DestinoDelAviso.Club -> {
                comunidad.abrirClub(destino.id)
                nav.irA(Destino.Comunidad)
            }
            DestinoDelAviso.InvitacionesRecibidas -> accesoA(TipoDeAcceso.INVITACIONES)
            DestinoDelAviso.SolicitudesRecibidas -> accesoA(TipoDeAcceso.SOLICITUDES)
            // `?addBook=` (el libro aprobado) y `?nuevos=` (la novedad diaria).
            is DestinoDelAviso.Catalogo -> {
                destino.nuevos?.let(catalogo::elegirNuevos)
                destino.libro?.let(catalogo::anadirLibroAprobado)
                nav.irA(Destino.Catalogo)
            }
            DestinoDelAviso.Biblioteca -> nav.irA(Destino.Biblioteca)
            is DestinoDelAviso.Libro -> {
                nav.irA(Destino.Biblioteca)
                libroPedido = destino.id
            }
            DestinoDelAviso.Estadisticas -> nav.irA(Destino.Estadisticas)
            DestinoDelAviso.Comunidad -> nav.irA(Destino.Comunidad)
            is DestinoDelAviso.Conversacion -> abrirMensajes(destino.id)
            is DestinoDelAviso.Navegador -> Enlaces.abrir(contextoDeLaApp, destino.direccion)
            is DestinoDelAviso.Fuera -> Enlaces.abrir(contextoDeLaApp, destino.direccion)
        }
    }
    // Un aviso del push pulsado. Se vuelve a mirar la cuenta, que pudo cambiar entre recibirlo y pulsarlo: si es de otra
    // cuenta guardada con sesión, se cambia a ella (D2); si ya no está o no se puede, se abre Libros sin su contenido.
    // Después, el acuse (lo da por leído) y su pantalla.
    val apertura by app.aperturas.collectAsStateWithLifecycle()
    LaunchedEffect(apertura) {
        val aviso = apertura ?: return@LaunchedEffect
        app.aperturas.value = null
        val sesion = app.sesion ?: return@LaunchedEffect
        val cuentaDelAviso = aviso.cuenta ?: return@LaunchedEffect
        if (!mismaCuenta(cuentaDelAviso, app.datos.ambito.identidad.value?.cuentaId)) {
            val otra = sesion.cuentas.value.firstOrNull { mismaCuenta(it.id, cuentaDelAviso) && !it.caducada } ?: return@LaunchedEffect
            if (runCatching { sesion.elegirCuenta(otra.id) }.isFailure) return@LaunchedEffect
            withTimeoutOrNull(10_000) { app.datos.ambito.identidad.first { mismaCuenta(it?.cuentaId, otra.id) } } ?: return@LaunchedEffect
        }
        aviso.acuse?.let { firma -> launch { runCatching { app.datos.dispositivos.acuse(firma) } } }
        irAlAviso(DestinoDeEnlace.de(aviso.comoMensaje, PushLibros.origenesDeLibros))
    }

    // Un enlace de la web de Libros abierto con la app (App Links): espera a que haya una cuenta (sin sesión, la
    // pantalla de entrar), y entonces la invitación por código de un correo o la pantalla de su ruta.
    val invitacion: InvitacionPorCodigoViewModel = viewModel { InvitacionPorCodigoViewModel(app.datos.ambito, app.datos.espacios, avisos) }
    invitacion.alEntrar = { clubId -> irAlAviso(clubId?.let { DestinoDelAviso.Club(it) } ?: DestinoDelAviso.MisClubes) }
    val enlace by app.enlaces.collectAsStateWithLifecycle()
    val identidadDelEnlace by app.datos.ambito.identidad.collectAsStateWithLifecycle()
    LaunchedEffect(enlace, identidadDelEnlace) {
        val direccion = enlace ?: return@LaunchedEffect
        if (identidadDelEnlace == null) return@LaunchedEffect
        app.enlaces.value = null
        val codigo = EspaciosYosiftware.codigoDeInvitacion(direccion)
        if (codigo != null) invitacion.abrir(codigo) else irAlAviso(DestinoDeEnlace.de(direccion, null, PushLibros.origenesDeLibros))
    }
    clubes.alCrear = comunidad::abrirClub
    centroDeAcceso.alCambiarElAcceso = clubes::refrescar
    catalogo.alVerEnBiblioteca = { obra ->
        nav.irA(Destino.Biblioteca)
        biblioteca.revelar(obra)
    }
    // El libro abierto (hito 9), a pantalla completa por encima de todo.
    val libro: LibroViewModel = viewModel {
        LibroViewModel(app.datos.ambito, app.datos.libro, app.datos.coleccion, avisos, AlmacenDelMovil(app))
    }
    val notas: NotasViewModel = viewModel { NotasViewModel(app.datos.ambito, app.datos.libro, avisos) }
    val busqueda: BusquedaViewModel = viewModel { BusquedaViewModel(app.datos.ambito) }
    // Un ViewModel por capítulo y cuenta: el capítulo se queda con lo suyo aunque se vaya a otra vista. Cada visita a
    // «Nuevo capítulo» empieza uno nuevo.
    val capituloPara: @Composable (VistaDelLibro) -> CapituloViewModel = { vista ->
        val cuenta = app.datos.ambito.clave("capitulo") ?: "sin-cuenta"
        val sitio = when (vista) {
            is VistaDelLibro.DeCapitulo -> "${vista.id}-${vista.deInterludio}"
            is VistaDelLibro.NuevoCapituloDeInterludio -> "nuevo-${vista.interludioId}-${libro.visitaDeNuevo}"
            else -> "nuevo-${libro.visitaDeNuevo}"
        }
        viewModel(key = "$cuenta-${libro.abierto?.id}-$sitio") { CapituloViewModel(app.datos.ambito, app.datos.libro, avisos, File(app.filesDir, "borradores")) }
    }
    // Un ViewModel por tipo de elemento, libro y cuenta: la ficha a medias se queda al ir a otra vista.
    val elementosPara: @Composable (Elemento) -> ElementosViewModel = { tipo ->
        val cuenta = app.datos.ambito.clave("elementos") ?: "sin-cuenta"
        viewModel(key = "$cuenta-${libro.abierto?.id}-${tipo.name}") {
            ElementosViewModel(app.datos.ambito, app.datos.entidades, avisos, File(app.filesDir, "borradores"), cargarLibro = { id -> app.datos.libro.libro(id) })
        }
    }
    val abrirLibro: (Obra) -> Unit = libro::abrir
    // Como `bookLoadGuard`: si no se puede abrir, se avisa y se queda en la Biblioteca.
    LaunchedEffect(libroPedido, biblioteca.cargando) {
        val id = libroPedido ?: return@LaunchedEffect
        if (biblioteca.cargando) return@LaunchedEffect
        libroPedido = null
        val obra = biblioteca.libro(id)
        if (obra != null) abrirLibro(obra)
        else avisos.error(
            if (biblioteca.errorDeCarga != null) "No se ha podido cargar tu biblioteca." else "No está en tu biblioteca.",
            titulo = "No se pudo abrir el libro", clave = "book:open:$id:error",
        )
    }
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
                            mensajesSinLeer = sinLeer,
                            avisosSinVer = centroDeAvisos.contadores.noVistas,
                            avisosAbiertos = centroDeAvisos.abierto,
                            alPulsarCampana = centroDeAvisos::alternar,
                            conIslaDelLector = libro.abierto != null && libro.minimizado,
                            alCambiarMas = { masAbierta = it },
                            panelDeAvisos = { alto ->
                                val contexto = LocalContext.current
                                PanelDeAvisos(
                                    centroDeAvisos,
                                    AccionesDelPanel(
                                        abrirEnlace = { aviso, enlace ->
                                            // Una invitación a un club en nombre de Libros: Acceso › Invitaciones recibidas.
                                            val destino = if (aviso.tipo == "espacio.invitacion" && aviso.marca == PushFiltro.WEB) DestinoDelAviso.InvitacionesRecibidas
                                            else DestinoDeEnlace.de(enlace, aviso.tipo, PushLibros.origenesDeLibros)
                                            irAlAviso(destino)
                                        },
                                        verTodas = { acceso?.let { Enlaces.abrir(contexto, it.direccionWebSocial("notificaciones")) } },
                                        preferencias = { acceso?.let { Enlaces.abrir(contexto, it.direccionWebSocial("ajustes-notificaciones")) } },
                                        imagen = app.datos::imagenDeLaPlataforma,
                                    ),
                                    altoMaximo = alto,
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            },
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
                                    Destino.Estadisticas -> PantallaEstadisticas(estadisticas, alVerNuevos = { ventana ->
                                        catalogo.elegirNuevos(ventana)
                                        nav.irA(Destino.Catalogo)
                                    })
                                    Destino.Comunidad -> {
                                        val contexto = LocalContext.current
                                        PantallaComunidad(
                                            comunidad, clubes, centroDeAcceso, actividad,
                                            AccionesDeComunidad(
                                                abrirWebSocial = { vista -> acceso?.let { Enlaces.abrir(contexto, it.direccionWebSocial(vista)) } },
                                                mensajes = {
                                                    PantallaMensajes(mensajes, app.datos.bandeja) { id ->
                                                        // Una por cuenta y conversación: el borrador y la posición se quedan al ir y volver.
                                                        val clave = app.datos.ambito.clave("chat") ?: "sin-cuenta"
                                                        val conversacion: ConversacionViewModel = viewModel(key = "$clave-chat-$id") {
                                                            ConversacionViewModel(
                                                                app.datos.ambito, id, app.datos.chat, app.datos.bandeja,
                                                                eventos = app.datos.tiempoReal?.eventos ?: emptyFlow(),
                                                                avisarEscribiendo = { app.datos.tiempoReal?.escribiendo(it) },
                                                                borradores = File(app.filesDir, "borradores"),
                                                            )
                                                        }
                                                        conversacion.alPerderAcceso = mensajes::cerrar
                                                        PantallaConversacion(conversacion, volver = { mensajes.cerrar() }, resaltado = mensajes.resaltado)
                                                    }
                                                },
                                                alElegirMensajes = mensajes::cerrar,
                                                cambiarDeCuenta = { panelAbierto = true },
                                                tieneObras = { CreacionDeClub.tieneObras(biblioteca.universos) },
                                                abrirEnlace = { direccion -> Enlaces.abrir(contexto, direccion) },
                                                avatar = app.datos::imagenDeLaPlataforma,
                                                detalleDelClub = { id ->
                                                    // Un ViewModel por club y cuenta: lo escrito en sus formularios se queda al ir a otra pestaña.
                                                    val clave = app.datos.ambito.clave("club") ?: "sin-cuenta"
                                                    val club: ClubViewModel = viewModel(key = "$clave-club-$id") {
                                                        ClubViewModel(
                                                            app.datos.ambito, id, app.datos.clubes, app.datos.espacios, app.datos.estadisticas, centroDeAcceso,
                                                            miId = { app.datos.usuario.miId() }, universos = { biblioteca.universos },
                                                            canal = app.datos.tiempoReal,
                                                        )
                                                    }
                                                    club.alSalir = { aviso ->
                                                        comunidad.cerrarClub()
                                                        clubes.refrescar()
                                                        aviso?.let(avisos::error)
                                                    }
                                                    PantallaClub(
                                                        club,
                                                        AccionesDelClub(
                                                            volver = comunidad::cerrarClub,
                                                            abrirWebSocial = { vista -> acceso?.let { Enlaces.abrir(contexto, it.direccionWebSocial(vista)) } },
                                                            abrirChat = { id -> abrirMensajes(id) },
                                                            avatar = app.datos::imagenDeLaPlataforma,
                                                        ),
                                                    )
                                                },
                                            ),
                                            sinLeer = sinLeer,
                                        )
                                    }
                                    Destino.Preferencias -> {
                                        val contexto = LocalContext.current
                                        PantallaPreferencias(
                                            alAbrirPrivacidad = { acceso?.let { Enlaces.abrir(contexto, it.direccionWebSocial("privacidad")) } },
                                            alElegirAvisos = { acceso?.let { Enlaces.abrir(contexto, it.direccionWebSocial("ajustes-notificaciones")) } },
                                        )
                                    }
                                    Destino.Perfil -> {
                                        val contexto = LocalContext.current
                                        PantallaPerfil(
                                            vm = perfil,
                                            identidad = IdentidadDelPerfil(perfiles.nombre(activaId, alias), alias, perfiles.avatar(activaId)),
                                            recuentos = Perfil.recuentos(biblioteca.universos),
                                            // Un libro se abre en su pantalla; una antología, en la Biblioteca (no tiene pantalla propia).
                                            alAbrirActividad = { actividad ->
                                                val obra = Perfil.obraDe(actividad, biblioteca.universos)
                                                if (obra.esAntologia) {
                                                    nav.irA(Destino.Biblioteca)
                                                    biblioteca.abrirAntologia(obra)
                                                } else {
                                                    abrirLibro(obra)
                                                }
                                            },
                                            // El perfil de Yosiftware se edita en la web social: la librería no tiene `editarPerfil()`.
                                            alEditarPerfil = { acceso?.let { Enlaces.abrir(contexto, it.direccionWebSocial("perfil")) } },
                                            alVerPerfilEnLaWeb = {
                                                acceso?.let { sesion ->
                                                    Enlaces.abrir(contexto, activaId?.let { Perfil.direccionDelPerfil(sesion.direccionWebSocial(), it) } ?: sesion.direccionWebSocial("perfil"))
                                                }
                                            },
                                            alVolverDeEditar = { perfiles.releer(activaId) },
                                        )
                                    }
                                    // «Más › Mensajes» es Comunidad con Mensajes abierta.
                                    Destino.Mensajes -> LaunchedEffect(Unit) {
                                        comunidad.abrir(SeccionDeComunidad.MENSAJES)
                                        mensajes.cerrar()
                                        nav.reemplazar(Destino.Comunidad)
                                    }
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
                    PantallaLibro(libro) { vista -> ContenidoDelLibro(libro, notas, busqueda, capituloPara, elementosPara, vista) }
                    // El libro minimizado, en su isla sobre la navegación (`app-native-reader-island`).
                    // Es del shell: se esconde con la hoja «Más», la campana o las cuentas abiertas, y bajo las capas a
                    // pantalla completa, que no tienen la barra inferior y no le dejan hueco (tapaba sus últimas filas).
                    val conCapa = biblioteca.antologia != null || biblioteca.edicionDeSeccion != null || biblioteca.edicion != null ||
                        catalogo.ficha != null || catalogo.hoja != null || catalogo.edicion != null || catalogo.peticion != null
                    IslaDelLector(libro, oculta = masAbierta || centroDeAvisos.abierto || panelAbierto || conCapa)
                    // El cargador de los dragones, encima de todo: al recuperar la biblioteca y al abrir un libro, como
                    // la APK de Capacitor (`restoreLibrary` y `book-load.guard`). Se elige al abrirse y no cambia hasta
                    // cerrarse, aunque se pase de una carga a otra.
                    val contextoDeCarga = when {
                        biblioteca.cargando && biblioteca.universos.isEmpty() && biblioteca.errorDeCarga == null -> ContextoDeCarga.BIBLIOTECA
                        libro.abierto != null && libro.libro == null && !libro.minimizado -> ContextoDeCarga.LIBRO
                        else -> null
                    }
                    val carga = remember(identidad?.generacion, contextoDeCarga != null) { contextoDeCarga?.let { FrasesDelDragon.abrir(it, null) } }
                    carga?.let { CargadorDelDragon(it) }
                    val contextoDeLaInvitacion = LocalContext.current
                    DialogoDeInvitacion(
                        invitacion,
                        AccionesDeInvitacion(
                            entrarConOtraCuenta = {
                                invitacion.conservarParaOtraCuenta()
                                panelAbierto = true
                            },
                            activarDosPasos = { acceso?.let { Enlaces.abrir(contextoDeLaInvitacion, it.direccionWebSocial("seguridad")) } },
                            verMisInvitaciones = { irAlAviso(DestinoDelAviso.InvitacionesRecibidas) },
                        ),
                    )
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
