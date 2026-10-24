package es.yosiftware.libros

import android.app.Activity
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import es.yosiftware.libros.cuenta.AccesoALaSesion
import es.yosiftware.libros.cuenta.OtraApp
import es.yosiftware.libros.cuenta.ServicioDeEntrada
import es.yosiftware.libros.datos.cuenta.AmbitoDeCuenta
import es.yosiftware.libros.ui.adaptable.LocalVentana
import es.yosiftware.libros.ui.adaptable.rememberVentana
import es.yosiftware.libros.ui.cuenta.AvisoSinConexion
import es.yosiftware.libros.ui.cuenta.CuentaViewModel
import es.yosiftware.libros.ui.cuenta.LectorDeNormas
import es.yosiftware.libros.ui.cuenta.LocalCuenta
import es.yosiftware.libros.ui.cuenta.PanelDeCuentas
import es.yosiftware.libros.ui.cuenta.PantallaDeEntrar
import es.yosiftware.libros.ui.cuenta.PantallaDeLaSesion
import es.yosiftware.libros.ui.cuenta.PantallaDeNormasDeLibros
import es.yosiftware.libros.ui.cuenta.PantallaSinConfiguracion
import es.yosiftware.libros.ui.cuenta.PerfilesViewModel
import es.yosiftware.libros.ui.navegacion.Armazon
import es.yosiftware.libros.ui.tema.TemaLibros
import es.yosiftware.libros.ui.tema.TemaMobile
import es.yosiftware.sesion.Cuenta
import es.yosiftware.sesion.CuentaGuardada
import es.yosiftware.sesion.EstadoSesion
import es.yosiftware.sesion.Motivo
import es.yosiftware.sesion.Normas
import es.yosiftware.sesion.ResumenNormas
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Solo en las compilaciones de depuración: cada pantalla de la cuenta con una sesión de muestra, para compararlas con
 * las capturas de la APK de Capacitor sin tener que entrar (el Xiaomi no deja tocar la pantalla por ADB). Se abre con
 *
 * ```
 * adb shell am start -n es.yosiftware.libros.qa/es.yosiftware.libros.MuestrasDeCuenta --es vista entrar --es tema oscuro
 * ```
 *
 * Vistas: `arranque`, `entrar`, `entrar-abajo` (desplazada hasta el final), `entrar-cuentas`, `anadir`, `alta`, `segundo-factor`, `navegador`, `borrado`,
 * `normas-uso`, `normas-libros`, `lector`, `sin-conexion`, `panel`, `mas` y `sin-configuracion`. Con `google`, la
 * pantalla de entrar con la sesión de verdad, que lanza «Entrar con Google» al abrirse, como el botón (para comprobar
 * que el selector de cuentas de Google aparece).
 */
class MuestrasDeCuenta : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val vista = intent.getStringExtra("vista") ?: "entrar"
        val tema = if (intent.getStringExtra("tema") == "oscuro") TemaMobile.Oscuro else TemaMobile.Claro
        if (vista == "google") {
            val app = application as LibrosApp
            val sesion = app.sesion?.let { AccesoALaSesion.DeLaLibreria(it) }
            val vm = CuentaViewModel(sesion, { ServicioDeEntrada.empezar(app) }, { ServicioDeEntrada.terminar(app) }, mostrarCodigos = true)
            val perfiles = PerfilesViewModel(app.datos.ambito, sesion?.cuentas ?: MutableStateFlow(emptyList()), null, app.datos.apiPlataforma)
            setContent {
                Marco(tema, vm) {
                    val estado = sesion?.estado?.collectAsState()?.value ?: EstadoSesion.SinSesion()
                    PantallaDeLaSesion(estado, vm, perfiles, emptyList())
                    LaunchedEffect(Unit) { vm.entrarConGoogle(this@MuestrasDeCuenta) }
                }
            }
            return
        }
        val muestra = SesionDeMuestra()
        val ambito = AmbitoDeCuenta("muestra", lifecycleScope)
        val vm = CuentaViewModel(muestra)
        val perfiles = PerfilesViewModel(ambito, muestra.cuentas, null, null)
        val conCuentas = listOf(
            CuentaGuardada("a", "lectora", activa = true, caducada = false),
            CuentaGuardada("b", "club.qa", activa = false, caducada = false),
            CuentaGuardada("c", "antigua", activa = false, caducada = true),
        )
        when (vista) {
            "entrar-cuentas" -> {
                muestra.cuentas.value = conCuentas.map { it.copy(activa = false) }.filterNot { it.id == "a" }
                muestra.otras = listOf(OtraApp("lectora", "Yosircana"))
                muestra.estado.value = EstadoSesion.SinSesion(Motivo("sesion_no_valida", "Tu sesión se ha cerrado desde otro dispositivo."))
            }
            "anadir" -> {
                muestra.estado.value = conSesion
                vm.anadirCuenta()
                muestra.estado.value = EstadoSesion.SinSesion()
            }
            "arranque" -> muestra.estado.value = EstadoSesion.Comprobando
            "alta" -> muestra.estado.value = EstadoSesion.AltaRequerida(normasUso)
            "segundo-factor" -> muestra.estado.value = EstadoSesion.SegundoFactorRequerido
            "navegador" -> muestra.estado.value = EstadoSesion.AbrirEnNavegador("verificacion", "https://qa-cuentas.yosiftware.es/")
            "borrado" -> muestra.estado.value = EstadoSesion.BorradoProgramado("2026-10-24T09:00:00Z", "2026-11-23T09:00:00Z")
            "normas-uso", "lector" -> muestra.estado.value = EstadoSesion.NormasDeUsoPendientes(normasUso, cuenta)
            "normas-libros" -> muestra.estado.value = EstadoSesion.ConSesion(cuenta, ResumenNormas(7, 1, "Normas de Memoria Bibliográfica"))
            "sin-conexion" -> {
                muestra.cuentas.value = conCuentas
                muestra.estado.value = EstadoSesion.SinConexion(Motivo("sin_conexion", "No se ha podido conectar con Yosiftware."))
            }
            "panel", "mas" -> {
                muestra.cuentas.value = conCuentas
                muestra.estado.value = conSesion
            }
        }
        if (vista == "lector") vm.leerNormasDeUso()
        setContent {
            Marco(tema, vm) {
                val estado = muestra.estado.collectAsState().value
                val cuentas = muestra.cuentas.collectAsState().value
                when (vista) {
                    "sin-configuracion" -> PantallaSinConfiguracion(alVerSinCuenta = {})
                    "entrar-abajo" -> {
                        val desplazamiento = rememberScrollState()
                        LaunchedEffect(desplazamiento.maxValue) { desplazamiento.scrollTo(desplazamiento.maxValue) }
                        PantallaDeEntrar(vm, perfiles, null, emptyList(), desplazamiento)
                    }
                    "normas-libros" -> PantallaDeNormasDeLibros(vm, (estado as EstadoSesion.ConSesion).normasPendientes!!)
                    "panel", "mas", "sin-conexion" -> {
                        Armazon(
                            nombre = "QA Usuario A",
                            tema = tema,
                            alAlternarTema = {},
                            avatar = null,
                            masAbiertaAlPrincipio = vista == "mas",
                            aviso = if (vista == "sin-conexion") {
                                { AvisoSinConexion("No se ha podido conectar con Yosiftware. Sigues con lo que hay en el móvil.", false) {} }
                            } else {
                                null
                            },
                        )
                        PanelDeCuentas(
                            abierto = vista == "panel",
                            alCerrar = {},
                            vm = vm,
                            perfiles = perfiles,
                            activaId = "a",
                            alias = "lectora",
                            correo = "lectora@correo.es",
                            cuentas = cuentas,
                        )
                    }
                    else -> PantallaDeLaSesion(estado, vm, perfiles, cuentas)
                }
                vm.normas?.let { LectorDeNormas(it, alAceptar = {}, ocupado = false, alCerrar = vm::cerrarNormas) }
            }
        }
    }

    @Composable
    private fun Marco(tema: TemaMobile, vm: CuentaViewModel, contenido: @Composable () -> Unit) {
        TemaLibros(tema) {
            CompositionLocalProvider(LocalVentana provides rememberVentana(), LocalCuenta provides vm) {
                Box(Modifier.fillMaxSize()) { contenido() }
            }
        }
    }

    private companion object {
        val cuenta = Cuenta("a", "lectora", "lectora@correo.es", true, "activa", false)
        val conSesion = EstadoSesion.ConSesion(cuenta, null)
        val normasUso = ResumenNormas(3, 2, "Normas de uso de Yosiftware")
    }
}

/** Una sesión que no hace nada: el estado y las cuentas se ponen a mano. */
private class SesionDeMuestra : AccesoALaSesion {
    override val estado = MutableStateFlow<EstadoSesion>(EstadoSesion.SinSesion())
    override val cuentas = MutableStateFlow<List<CuentaGuardada>>(emptyList())
    var otras: List<OtraApp> = emptyList()

    override suspend fun entrarConContrasena(correo: String, contrasena: String) = Unit
    override suspend fun entrarConGoogle(actividad: Activity) = Unit
    override suspend fun sesionesEnOtrasApps() = otras
    override suspend fun continuarCon(otra: OtraApp) = Unit
    override suspend fun completarAlta(alias: String) = Unit
    override suspend fun enviarCodigo(codigo: String) = Unit
    override suspend fun conservarCuenta() = Unit
    override suspend fun cancelar() = Unit
    override suspend fun reintentar() = Unit
    override suspend fun leerNormasDeUso() = Normas(3, 2, "Normas de uso de Yosiftware", TEXTO)
    override suspend fun aceptarNormasDeUso() = Unit
    override suspend fun leerNormasDeLaWeb() = Normas(7, 1, "Normas de Memoria Bibliográfica", TEXTO)
    override suspend fun aceptarNormasDeLaWeb() = Unit
    override suspend fun anadirCuenta() = Unit
    override suspend fun cancelarAnadir() = Unit
    override suspend fun elegirCuenta(id: String) = Unit
    override suspend fun olvidarCuenta(id: String) = Unit
    override suspend fun salir() = Unit
    override suspend fun salirDeTodas() = Unit
    override fun direccionCrearCuenta() = "https://qa-cuentas.yosiftware.es/?vista=registro"
    override fun direccionPaginaDeAcceso() = "https://qa-cuentas.yosiftware.es/"
    override fun direccionWebSocial(vista: String?) = "https://qa-social.yosiftware.es/" + (vista?.let { "?vista=$it" } ?: "")

    private companion object {
        const val TEXTO = "# Normas de uso\n\nEstas normas se aplican a **todas** las webs del ecosistema.\n\n" +
            "## Lo que no se permite\n- El acoso.\n- El spam.\n- Suplantar a otra persona.\n\n" +
            "Si incumples estas normas, la cuenta puede suspenderse."
    }
}
