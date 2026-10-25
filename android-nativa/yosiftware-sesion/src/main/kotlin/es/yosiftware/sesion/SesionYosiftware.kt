package es.yosiftware.sesion

import android.app.Activity
import android.content.Context
import java.io.IOException
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * La sesión nativa de Yosiftware de una app (`ecosistema-kit/APK.md`): entrar, mantener la sesión y salir.
 *
 * Una sola instancia por app, creada en la `Application`: así otra app del ecosistema puede pedirle su sesión aunque
 * esta no esté en pantalla ([sesionesEnOtrasApps]). La app observa [estado] y pinta sus pantallas; las acciones son
 * funciones `suspend` que cambian el estado o lanzan [ErrorSesion] con la frase para la persona. Todo pasa de uno en
 * uno: dos renovaciones nunca van a la vez.
 *
 * ```kotlin
 * val sesion = SesionYosiftware(applicationContext, ConfiguracionSesion.qa("renotas", clave, clienteWeb))
 * sesion.iniciar()                        // al arrancar
 * val tokens = sesion.tokens()            // antes de llamar a tu API
 * sesion.tokensTrasRechazo(token)         // si tu API responde 401 con ese token
 * ```
 *
 * Desde la 1.4.0 guarda hasta cinco cuentas y cambia de una a otra sin salir ([cuentas], [anadirCuenta],
 * [elegirCuenta], [salirDeTodas]). Una app que no lo use funciona igual que con la 1.3.
 */
class SesionYosiftware internal constructor(
    val configuracion: ConfiguracionSesion,
    private val huecos: Huecos,
    private val transporte: Transporte,
    private val reloj: () -> Long,
    private val esperar: suspend (Long) -> Unit,
    private val vecinas: Vecinas = SinVecinas,
) {
    constructor(context: Context, configuracion: ConfiguracionSesion) : this(
        configuracion.copy(dispositivo = configuracion.dispositivo ?: ConfiguracionSesion.nombreDelDispositivo(context)),
        HuecosKeystore(context.applicationContext, configuracion.web),
        TransporteHttp(configuracion.agente),
        System::currentTimeMillis,
        { delay(it) },
        VecinasAndroid(context.applicationContext),
    ) {
        // La que da su sesión a otras apps (`ServicioSesionCompartida`), si la app lo permite.
        if (configuracion.compartirSesion) SesionCompartida.sesion = this
    }

    /** Con un solo almacén para la primera cuenta, como hasta la 1.3 (las pruebas); las demás, en memoria. */
    internal constructor(
        configuracion: ConfiguracionSesion,
        almacen: AlmacenRefresh,
        transporte: Transporte,
        reloj: () -> Long,
        esperar: suspend (Long) -> Unit,
        vecinas: Vecinas = SinVecinas,
    ) : this(configuracion, HuecosEnMemoria(almacen), transporte, reloj, esperar, vecinas)

    private val firebase = FirebaseRest(configuracion, transporte)
    private val cerrojo = Mutex()
    private val estadoActual = MutableStateFlow<EstadoSesion>(EstadoSesion.Comprobando)

    /** El estado de la sesión, para pintar la pantalla que toca. */
    val estado: StateFlow<EstadoSesion> = estadoActual.asStateFlow()

    // Solo en memoria. El refresh, en el almacén cifrado.
    private var tokensActuales: Tokens? = null
    private var ticket: String? = null
    private var usuarioFirebaseNuevo: String? = null
    /** Tras cambiar la contraseña con la verificación en dos pasos: cerrar las demás sesiones al enviar el código. */
    private var cerrarOtrasAlEntrar = false
    private var ultimaComprobacion = Long.MIN_VALUE / 2

    // Las cuentas guardadas (1.4.0). El índice se lee la primera vez que hace falta.
    private var indiceLeido = false
    private var entradas: List<Entrada> = emptyList()
    /** El hueco de la cuenta de la sesión de ahora; `null` sin sesión o mientras se añade otra. */
    private var huecoActivo: String? = null
    /** Mientras se añade una cuenta, el de la que estaba activa: [cancelarAnadir] vuelve a ella. */
    private var anterior: String? = null
    private val cuentasActuales = MutableStateFlow<List<CuentaGuardada>>(emptyList())

    /**
     * Las cuentas guardadas en esta app, en el orden en que se añadieron, con la activa marcada (desde la 1.4.0). Para
     * pintar el panel de cuentas. Se llena al [iniciar].
     */
    val cuentas: StateFlow<List<CuentaGuardada>> = cuentasActuales.asStateFlow()

    /** Al arrancar la app: comprueba la sesión guardada y pide tokens. Sin red, [EstadoSesion.SinConexion]. */
    suspend fun iniciar() {
        cerrojo.withLock {
            if (leerRefresh() == null) {
                cambiar(EstadoSesion.SinSesion())
                return
            }
            renovarComoAlArrancar()
        }
    }

    /**
     * Desde [EstadoSesion.ConSesion] (o sin conexión, o con las normas de uso pendientes): guarda la cuenta de ahora y
     * pasa a [EstadoSesion.SinSesion] para entrar con otra, por cualquiera de las formas de entrar (también
     * [continuarCon]). Al entrar, la nueva queda activa; [cancelarAnadir] vuelve a la de antes. Si la app se cierra a
     * medias, al volver sigue la de antes. Sin sesión, ya se puede entrar con otra: no hace nada. Lanza
     * `cuentas_guardadas_demasiadas` con cinco cuentas.
     */
    suspend fun anadirCuenta() {
        cerrojo.withLock {
            cargarIndice()
            if (entradas.count { !it.caducada } >= MAXIMO_CUENTAS) {
                throw ErrorSesion("cuentas_guardadas_demasiadas", "Ya tienes cinco cuentas en esta app. Sal de una para añadir otra.")
            }
            val actual = huecoActivo
            when (estadoActual.value) {
                is EstadoSesion.ConSesion, is EstadoSesion.NormasDeUsoPendientes, is EstadoSesion.SinConexion -> Unit
                is EstadoSesion.SinSesion -> if (actual == null) return
                else -> throw estadoNoValido()
            }
            anterior = actual
            huecoActivo = null
            olvidarLoDeAhora()
            publicar()
            cambiar(EstadoSesion.SinSesion())
        }
    }

    /** Mientras se añade una cuenta, en cualquier paso: vuelve a la que estaba activa. Si no se está añadiendo, nada. */
    suspend fun cancelarAnadir() {
        cerrojo.withLock {
            val volver = anterior ?: return
            // Si se guardó algo sin llegar a ser una cuenta, se descarta.
            huecoActivo?.takeIf { hueco -> entradas.none { it.hueco == hueco } }?.let { borrarDe(it) }
            anterior = null
            huecoActivo = volver
            olvidarLoDeAhora()
            publicar()
            cambiar(EstadoSesion.Comprobando)
            renovarComoAlArrancar()
        }
    }

    /**
     * Cambia a la cuenta guardada [id], sin salir de ninguna y sin pedir otra vez la contraseña ni el código. El estado
     * pasa por [EstadoSesion.Comprobando] y llega a [EstadoSesion.ConSesion] con la otra cuenta (o a
     * [EstadoSesion.SinConexion] sin red, o a [EstadoSesion.SinSesion] con el motivo si su sesión ya no vale, y
     * entonces queda `caducada`). Si se estaba añadiendo una cuenta, se deja de añadir. Lanza `cuenta_no_guardada` y
     * `cuenta_guardada_caducada`.
     */
    suspend fun elegirCuenta(id: String) {
        cerrojo.withLock {
            cargarIndice()
            val entrada = entradas.firstOrNull { it.id == id }
                ?: throw ErrorSesion("cuenta_no_guardada", "Esa cuenta ya no está guardada en esta app.")
            val hueco = entrada.hueco
            if (entrada.caducada || hueco == null) {
                throw ErrorSesion("cuenta_guardada_caducada", "La sesión de esta cuenta ha caducado. Vuelve a entrar con ella.")
            }
            val estado = estadoActual.value
            if (hueco == huecoActivo && anterior == null &&
                (estado is EstadoSesion.ConSesion || estado is EstadoSesion.NormasDeUsoPendientes)
            ) {
                return
            }
            huecoActivo?.takeIf { activo -> entradas.none { it.hueco == activo } }?.let { borrarDe(it) }
            anterior = null
            huecoActivo = hueco
            olvidarLoDeAhora()
            guardarIndice()
            cambiar(EstadoSesion.Comprobando)
            renovarComoAlArrancar()
        }
    }

    /**
     * Quita de la lista una cuenta guardada que no es la activa (por ejemplo, una caducada), y cierra su sesión en la
     * plataforma si aún la tiene. Para la activa, [salir].
     */
    suspend fun olvidarCuenta(id: String) {
        cerrojo.withLock {
            cargarIndice()
            val entrada = entradas.firstOrNull { it.id == id } ?: return
            if (entrada.hueco != null && entrada.hueco == huecoActivo) throw estadoNoValido()
            entrada.hueco?.let { cerrarEnLaPlataforma(it) }
            entradas = entradas - entrada
            if (anterior != null && anterior == entrada.hueco) anterior = null
            guardarIndice()
        }
    }

    /**
     * Sale de todas las cuentas guardadas en esta app: cierra cada sesión en la plataforma (si se puede) y las borra
     * del móvil, pase lo que pase.
     */
    suspend fun salirDeTodas() {
        cerrojo.withLock {
            cargarIndice()
            val todas = (entradas.mapNotNull { it.hueco } + listOfNotNull(huecoActivo, anterior)).distinct()
            for (hueco in todas) cerrarEnLaPlataforma(hueco)
            entradas = emptyList()
            huecoActivo = null
            anterior = null
            olvidarLoDeAhora()
            guardarIndice()
            cambiar(EstadoSesion.SinSesion())
        }
    }

    /** Desde [EstadoSesion.SinConexion]: vuelve a comprobar la sesión. */
    suspend fun reintentar() = iniciar()

    /**
     * Al volver la app a primer plano: comprueba con la plataforma que la sesión sigue abierta, para que una sesión
     * cerrada desde la web social se note en el acto (si no, la app se entera al renovar, hasta 10 minutos después).
     * Como mucho una vez cada [intervalo]. Sin red, el estado no cambia; si la sesión se cerró, pasa a
     * [EstadoSesion.SinSesion] con el motivo. No lanza errores.
     */
    suspend fun comprobar(intervalo: Long = 60_000L) {
        cerrojo.withLock {
            when (estadoActual.value) {
                is EstadoSesion.ConSesion, is EstadoSesion.NormasDeUsoPendientes -> Unit
                is EstadoSesion.SinConexion -> {
                    ultimaComprobacion = reloj()
                    try {
                        renovar()
                    } catch (error: ErrorSesion) {
                        if (estadoActual.value is EstadoSesion.SinConexion) cambiar(EstadoSesion.SinConexion(error.comoMotivo()))
                    }
                    return
                }
                else -> return
            }
            if (reloj() - ultimaComprobacion < intervalo) return
            ultimaComprobacion = reloj()
            try {
                renovar()
            } catch (_: ErrorSesion) {
                // Sin red o con la plataforma caída, la sesión sigue como estaba. Si se cerró, renovar ya lo ha dicho.
            }
        }
    }

    /** Entra con el correo y la contraseña de la cuenta de Yosiftware. */
    suspend fun entrarConContrasena(correo: String, contrasena: String) {
        cerrojo.withLock {
            exigirSinSesionGuardada()
            canjear(firebase.entrarConContrasena(correo, contrasena))
        }
    }

    /** Entra con Google («Iniciar sesión con Google» de Credential Manager), desde una actividad en pantalla. */
    suspend fun entrarConGoogle(actividad: Activity) {
        entrarConCredencialDeGoogle(credencialDeGoogle(actividad))
    }

    /** La credencial de Google de la persona, con el cliente web de la configuración (para entrar o reautenticarse). */
    private suspend fun credencialDeGoogle(actividad: Activity): String {
        val clienteWeb = configuracion.googleClienteWeb
            ?: throw ErrorSesion("google_no_disponible", "Esta app no tiene configurada la entrada con Google.")
        return credencialDeGoogle(actividad, clienteWeb)
    }

    internal suspend fun entrarConCredencialDeGoogle(idTokenGoogle: String) {
        cerrojo.withLock {
            exigirSinSesionGuardada()
            canjear(firebase.entrarConGoogle(idTokenGoogle))
        }
    }

    /** Desde [EstadoSesion.AltaRequerida]: crea la cuenta con el alias y la aceptación de las normas de uso. */
    suspend fun completarAlta(alias: String) {
        cerrojo.withLock {
            val alta = estadoActual.value as? EstadoSesion.AltaRequerida ?: throw estadoNoValido()
            val cuerpo = JSONObject()
                .put("ticket", ticket)
                .put("alias", alias.trim())
                .put("idNormasUso", alta.normasUso.id)
                .put("web", configuracion.web)
            tratarApertura(api("POST", "/v1/sesion/nativa/alta", cuerpo))
        }
    }

    /** Desde [EstadoSesion.SegundoFactorRequerido]: el código de 6 cifras o uno de recuperación. */
    suspend fun enviarCodigo(codigo: String) {
        cerrojo.withLock {
            if (estadoActual.value !is EstadoSesion.SegundoFactorRequerido) throw estadoNoValido()
            val cuerpo = JSONObject().put("ticket", ticket).put("codigo", codigo.trim()).put("web", configuracion.web)
            tratarApertura(api("POST", "/v1/sesion/nativa/segundo-factor", cuerpo))
        }
        cerrarOtrasSesionesSiToca()
    }

    /** Desde [EstadoSesion.BorradoProgramado]: «Conservar mi cuenta», que cancela el borrado y entra. */
    suspend fun conservarCuenta() {
        cerrojo.withLock {
            if (estadoActual.value !is EstadoSesion.BorradoProgramado) throw estadoNoValido()
            val cuerpo = JSONObject()
                .put("ticket", ticket)
                .put("dispositivo", configuracion.dispositivo ?: "Android")
                .put("web", configuracion.web)
            tratarApertura(api("POST", "/v1/sesion/nativa/conservar", cuerpo))
        }
    }

    /**
     * Desde [EstadoSesion.SinSesion], antes de pedir la contraseña: las sesiones de Yosiftware de otras apps del
     * ecosistema de este móvil, una por cuenta, para ofrecer «Continuar como @alias» (`APK.md`, «La sesión de otra
     * app»). Solo las del mismo entorno (QA o producción). Pregunta a cada app instalada con la librería, que pide a la
     * plataforma un ticket para esta: puede tardar unos segundos, así que no bloquees la pantalla de entrar. Vacía si no
     * hay ninguna o con cualquier fallo. No lanza errores. También al añadir una cuenta ([anadirCuenta]), sin las que ya
     * están guardadas aquí.
     */
    suspend fun sesionesEnOtrasApps(): List<SesionEnOtraApp> {
        if (estadoActual.value !is EstadoSesion.SinSesion) return emptyList()
        val guardadas = cerrojo.withLock {
            cargarIndice()
            entradas.filter { !it.caducada }.mapNotNull { it.id }.toSet()
        }
        val respuestas = try {
            coroutineScope {
                vecinas.buscar().map { paquete -> async { paquete to vecinas.pedir(paquete, configuracion.api) } }.awaitAll()
            }
        } catch (_: RuntimeException) {
            return emptyList()
        }
        return respuestas.mapNotNull { (paquete, oferta) -> oferta?.let { otraApp(paquete, it) } }
            .distinctBy { it.idCuenta }
            .filter { it.idCuenta !in guardadas }
    }

    /**
     * Cuando la persona elige «Continuar como @alias»: abre la sesión de esta app con la de [otra], sin contraseña ni
     * código. Deja el estado como al entrar ([EstadoSesion.ConSesion], o [EstadoSesion.NormasDeUsoPendientes]). Si ha
     * pasado mucho rato, pide otra vez el ticket. Lanza [ErrorSesion] si no se puede (por ejemplo, `ticket_no_valido`
     * si la otra app ya cerró su sesión): la persona entra como siempre.
     */
    suspend fun continuarCon(otra: SesionEnOtraApp) {
        // Fuera del cerrojo: la otra app tarda lo que tarde la plataforma.
        val ticket = if (otra.caduca - MARGEN > reloj()) {
            otra.ticket
        } else {
            vecinas.pedir(otra.paquete, configuracion.api)
                ?.takeIf { it.codigo == Oferta.OFERTA && it.idCuenta == otra.idCuenta }?.ticket
                ?: throw ErrorSesion("ticket_no_valido", "Ha pasado demasiado tiempo. Vuelve a intentarlo.")
        }
        val huellas = withContext(Dispatchers.IO) { vecinas.huellas(otra.paquete) }
        cerrojo.withLock {
            exigirSinSesionGuardada()
            val de = JSONObject().put("paquete", otra.paquete).put("huellas", JSONArray(huellas))
            val cuerpo = JSONObject()
                .put("ticket", ticket)
                .put("web", configuracion.web)
                .put("dispositivo", configuracion.dispositivo ?: "Android")
                .put("de", de)
            tratarApertura(api("POST", "/v1/sesion/nativa/traspaso/canje", cuerpo))
        }
    }

    /**
     * Lo que pide otra app del ecosistema por [ServicioSesionCompartida]: un ticket de la plataforma para la app de
     * [paquete], que Android dice firmada con [huellas]. La plataforma decide si es una app del ecosistema. Nunca da el
     * `refresh`.
     */
    internal suspend fun darSesion(paquete: String, huellas: List<String>, plataforma: String): Oferta = cerrojo.withLock {
        if (plataforma.trimEnd('/') != configuracion.api.trimEnd('/')) return@withLock Oferta("otro_entorno")
        // La app dice si ahora la da; si no, se responde como sin sesión, para no revelar que hay una. Un fallo, no.
        val permitida = try {
            condicionParaDarSesion()
        } catch (error: kotlinx.coroutines.CancellationException) {
            throw error
        } catch (_: Exception) {
            false
        }
        if (!permitida) return@withLock Oferta("sin_sesion")
        // La de la cuenta activa; mientras se añade otra, la de la que estaba activa.
        cargarIndice()
        val hueco = huecoActivo ?: anterior ?: return@withLock Oferta("sin_sesion")
        val refresh = leerDe(hueco) ?: return@withLock Oferta("sin_sesion")
        val para = JSONObject().put("paquete", paquete).put("huellas", JSONArray(huellas))
        val cuerpo = JSONObject().put("refresh", refresh).put("web", configuracion.web).put("para", para)
        val respuesta = try {
            // La otra app deja de esperar a los 15 segundos: el refresh que rota se guarda igual.
            sinCortar {
                conGracia { api("POST", "/v1/sesion/nativa/traspaso", cuerpo) }.also { rotada ->
                    if (rotada.correcta) rotada.json.cadena("refresh")?.let { guardarEn(hueco, it) }
                }
            }
        } catch (error: ErrorSesion) {
            return@withLock Oferta(error.codigo)
        }
        if (!respuesta.correcta) {
            if (respuesta.cierraLaSesion) cerrarHueco(hueco, respuesta.motivo())
            return@withLock Oferta(respuesta.error().codigo)
        }
        val json = respuesta.json
        val cuenta = json.optJSONObject("cuenta")
        Oferta(
            codigo = Oferta.OFERTA,
            ticket = json.cadena("ticket"),
            caducaEn = json.optInt("caducaEn"),
            idCuenta = cuenta?.cadena("id"),
            alias = cuenta?.cadena("alias"),
            app = json.optJSONObject("de")?.cadena("nombre"),
        )
    }

    @Volatile
    private var condicionParaDarSesion: suspend () -> Boolean = { true }

    /**
     * Cuándo da esta app su sesión a otra del ecosistema: [condicion] se evalúa cada vez que otra app la pide (desde la
     * 1.3.1, a petición de Re-Notas). Por ejemplo, con un bloqueo propio de la app, `darSesionSi { !bloqueo.cerrado() }`.
     * Si devuelve `false` o falla, la otra app recibe lo mismo que si esta no tuviera sesión. Puede ser `suspend`: al
     * arrancar el proceso en frío para responder, la app aún está leyendo su estado. Sin llamarla, la da siempre (con
     * [ConfiguracionSesion.compartirSesion]).
     */
    fun darSesionSi(condicion: suspend () -> Boolean) {
        condicionParaDarSesion = condicion
    }

    /** Vuelve a la pantalla de entrar desde un paso a medias (alta, código, borrado programado o navegador). */
    suspend fun cancelar() {
        cerrojo.withLock {
            when (estadoActual.value) {
                is EstadoSesion.AltaRequerida, EstadoSesion.SegundoFactorRequerido,
                is EstadoSesion.BorradoProgramado, is EstadoSesion.AbrirEnNavegador -> {
                    ticket = null
                    usuarioFirebaseNuevo = null
                    cerrarOtrasAlEntrar = false
                    cambiar(EstadoSesion.SinSesion())
                }
                else -> Unit
            }
        }
    }

    /** El texto de las normas de uso vigentes, para el alta y para [EstadoSesion.NormasDeUsoPendientes]. */
    suspend fun leerNormasDeUso(): Normas = normas(api("GET", "/v1/normas/uso", null))

    /** El texto de las normas propias de la web, para [EstadoSesion.ConSesion.normasPendientes]. */
    suspend fun leerNormasDeLaWeb(): Normas = normas(api("GET", "/v1/webs/${configuracion.web}/normas", null))

    /** Desde [EstadoSesion.NormasDeUsoPendientes]: las acepta y pide tokens. */
    suspend fun aceptarNormasDeUso() {
        cerrojo.withLock {
            val pendientes = estadoActual.value as? EstadoSesion.NormasDeUsoPendientes ?: throw estadoNoValido()
            val refresh = leerRefresh() ?: throw sinSesion().also { cerrarAqui(null) }
            val cuerpo = JSONObject().put("refresh", refresh).put("idVersion", pendientes.normas.id)
            val respuesta = sinCortar {
                conGracia { api("POST", "/v1/sesion/nativa/normas", cuerpo) }.also { rotada ->
                    if (rotada.correcta) rotada.json.cadena("refresh")?.let { guardarRefresh(it) }
                }
            }
            if (!respuesta.correcta) {
                if (respuesta.cierraLaSesion) cerrarAqui(respuesta.motivo())
                if (respuesta.codigo == "normas_no_vigentes") renovar()
                throw respuesta.error()
            }
            renovar()
        }
    }

    /** Con [EstadoSesion.ConSesion.normasPendientes]: acepta las normas de la web y pide tokens nuevos. */
    suspend fun aceptarNormasDeLaWeb() {
        cerrojo.withLock {
            val normas = (estadoActual.value as? EstadoSesion.ConSesion)?.normasPendientes ?: throw estadoNoValido()
            val token = vigentes().plataforma.valor
            val respuesta = api("POST", "/v1/cuenta/normas/${normas.id}/aceptacion", null, token)
            if (!respuesta.correcta) {
                if (respuesta.codigo == "normas_no_vigentes") renovar()
                throw respuesta.error()
            }
            renovar()
        }
    }

    /**
     * Los tokens vigentes, renovados si les queda menos de un minuto. Lanza `sin_sesion` sin sesión,
     * `normas_de_uso_pendientes` mientras falten las normas de uso, y `sin_conexion` sin red (la sesión sigue).
     */
    suspend fun tokens(): Tokens = cerrojo.withLock { vigentes() }

    /**
     * Cuando tu API (o la plataforma) responde 401 con [rechazado]: tokens nuevos. Si otra llamada ya los ha
     * renovado, devuelve esos sin renovar otra vez.
     */
    suspend fun tokensTrasRechazo(rechazado: String): Tokens = cerrojo.withLock {
        val actuales = tokensActuales
        if (actuales != null && actuales.plataforma.valor != rechazado && actuales.api?.valor != rechazado &&
            caducan(actuales) > reloj()
        ) {
            actuales
        } else {
            renovar() ?: throw normasDeUsoPendientes()
        }
    }

    /**
     * Sale de la cuenta activa: cierra su sesión en la plataforma (si se puede) y la borra del móvil, pase lo que pase.
     * Las demás cuentas guardadas siguen en [cuentas], sin ninguna activa, como al salir de una en el navegador: la app
     * ofrece elegir una ([elegirCuenta]) o entrar. Mientras se añade una cuenta, sale de la que estaba activa.
     */
    suspend fun salir() {
        cerrojo.withLock {
            cargarIndice()
            val hueco = huecoActivo ?: anterior
            if (hueco != null) {
                cerrarEnLaPlataforma(hueco)
                if (hueco == anterior) {
                    anterior = null
                    entradas = entradas.filterNot { it.hueco == hueco }
                    guardarIndice()
                }
            }
            cerrarAqui(null)
        }
    }

    /**
     * Confirma que es la persona antes de algo delicado (cambiar el correo o las formas de entrar, la verificación en
     * dos pasos, borrar la cuenta…), con la contraseña de la cuenta activa: un inicio de sesión reciente en Firebase
     * que la plataforma cambia por un ticket de unos minutos (`POST /v1/cuenta/reautenticacion`, desde la 1.5.0). Solo
     * vale en la app de la plataforma; cualquier otra recibe `web_no_autorizada`. El ticket va en la operación
     * delicada como `ticketReautenticacion`.
     */
    suspend fun reautenticarConContrasena(contrasena: String): TicketReautenticacion {
        val correo = (estadoActual.value as? EstadoSesion.ConSesion)?.cuenta?.correo ?: throw estadoNoValido()
        return reautenticar(contrasenaDeLaCuenta(correo, contrasena).idToken)
    }

    /** Como [reautenticarConContrasena], con la cuenta de Google de la cuenta activa, desde una actividad en pantalla. */
    suspend fun reautenticarConGoogle(actividad: Activity): TicketReautenticacion =
        reautenticarConCredencialDeGoogle(credencialDeGoogle(actividad))

    internal suspend fun reautenticarConCredencialDeGoogle(idTokenGoogle: String): TicketReautenticacion {
        if (estadoActual.value !is EstadoSesion.ConSesion) throw estadoNoValido()
        return reautenticar(firebase.entrarConGoogle(idTokenGoogle).idToken)
    }

    /**
     * Cambia la contraseña de la cuenta activa, como la página de acceso (desde la 1.6.0; pensado para la app de la
     * plataforma, como la reautenticación). Comprueba [actual] con Firebase, pone [nueva] y abre con ella una sesión
     * nueva de esta cuenta en su sitio, porque Firebase retira lo que se emitió antes del cambio. Después cierra la
     * sesión de antes y las demás de la cuenta, en cualquier dispositivo (si no se puede, la plataforma las cierra en
     * su siguiente renovación). Con la verificación en dos pasos queda en [EstadoSesion.SegundoFactorRequerido], y las
     * demás se cierran al enviar el código ([enviarCodigo]). Los requisitos de la contraseña los comprueba la app; una
     * débil da `contrasena_debil`, y una [actual] mala, `credenciales_no_validas`. Si la contraseña ya se ha cambiado
     * pero no se puede abrir la sesión nueva, la cuenta queda caducada y lanza `contrasena_cambiada_sin_sesion`.
     */
    suspend fun cambiarContrasena(actual: String, nueva: String) {
        val correo = (estadoActual.value as? EstadoSesion.ConSesion)?.cuenta?.correo ?: throw estadoNoValido()
        if (nueva == actual) throw ErrorSesion("contrasena_igual", "La contraseña nueva tiene que ser distinta de la actual.")
        val comprobada = contrasenaDeLaCuenta(correo, actual)
        firebase.cambiarContrasena(comprobada.idToken, nueva)
        cerrojo.withLock {
            val hueco = huecoActivo ?: throw estadoNoValido()
            val anteriorRefresh = leerDe(hueco)
            try {
                canjear(firebase.entrarConContrasena(correo, nueva))
            } catch (error: ErrorSesion) {
                anteriorRefresh?.let { cerrarRefreshEnLaPlataforma(it) }
                cerrarAqui(Motivo("contrasena_cambiada", "Tu contraseña ya está cambiada. Vuelve a entrar con la nueva."))
                throw ErrorSesion(
                    "contrasena_cambiada_sin_sesion",
                    "Tu contraseña ya está cambiada, pero no hemos podido renovar tu sesión. Vuelve a entrar.",
                    causa = error,
                )
            }
            anteriorRefresh?.let { cerrarRefreshEnLaPlataforma(it) }
            cerrarOtrasAlEntrar = true
        }
        cerrarOtrasSesionesSiToca()
    }

    /**
     * Pide cambiar el correo de la cuenta activa, como la página de acceso (desde la 1.6.0, solo en la app de la
     * plataforma): comprueba [contrasena], reserva [nuevo] para la cuenta durante 24 horas (`POST /v1/cuenta/correo`) y
     * la plataforma manda allí un enlace (`POST /v1/sesion/correos/cambio`, desde la 1.7.0; antes lo mandaba Firebase).
     * El cambio se hace al abrirlo, en la página de acceso; después, la sesión se cierra en su siguiente renovación y se
     * vuelve a entrar con el correo nuevo. Devuelve el correo al que se ha mandado el enlace. Solo para las cuentas con
     * contraseña: con Google, el correo es el de Google.
     */
    suspend fun cambiarCorreo(nuevo: String, contrasena: String): String {
        val actual = (estadoActual.value as? EstadoSesion.ConSesion)?.cuenta?.correo ?: throw estadoNoValido()
        val correo = nuevo.trim().lowercase()
        if (!PARECE_CORREO.matches(correo)) throw correoNoValido()
        if (correo == actual.lowercase()) throw ErrorSesion("mismo_correo", "Ese ya es el correo de tu cuenta.")
        val reciente = contrasenaDeLaCuenta(actual, contrasena)
        val ticket = reautenticar(reciente.idToken)
        val cuerpo = JSONObject().put("ticketReautenticacion", ticket.ticket).put("correo", correo)
        val reserva = llamarConToken("POST", "/v1/cuenta/correo", cuerpo)
        if (!reserva.correcta) throw reserva.error()
        // El enlace lo manda la plataforma, con el inicio de sesión reciente en Firebase. Un 401 de ese inicio no es del
        // token de la plataforma: no se repite (cada intento cuenta en el límite de envíos a ese correo).
        val enlace = JSONObject().put("tokenFirebase", reciente.idToken).put("correo", correo).put("volver", JSONObject.NULL)
        val envio = llamarConToken("POST", "/v1/sesion/correos/cambio", enlace) { it.rechazaElTokenDePlataforma }
        if (!envio.correcta) throw envio.error()
        return correo
    }

    /** Firebase con el correo de la cuenta activa: si no entra, es la contraseña lo que está mal (el correo no lo escribe nadie). */
    private suspend fun contrasenaDeLaCuenta(correo: String, contrasena: String): CredencialFirebase = try {
        firebase.entrarConContrasena(correo, contrasena)
    } catch (error: ErrorSesion) {
        if (error.codigo != "credenciales_no_validas") throw error
        throw ErrorSesion("credenciales_no_validas", "La contraseña no es correcta.", campo = "contrasena", causa = error)
    }

    /**
     * Cierra todas las sesiones de la cuenta activa menos la de esta app, en cualquier dispositivo («Cerrar las demás»
     * de la lista de sesiones; `POST /v1/sesiones/cerrar-otras`, desde la 1.7.0). Dejan de valer en el acto; esta sigue.
     * Devuelve cuántas se han cerrado. Lanza [ErrorSesion] (por ejemplo, `sin_conexion`) si no se puede.
     */
    suspend fun cerrarOtrasSesiones(): Int {
        val respuesta = llamarConToken("POST", "/v1/sesiones/cerrar-otras")
        if (!respuesta.correcta) throw respuesta.error()
        return respuesta.json.optInt("cerradas")
    }

    /** Tras cambiar la contraseña, ya con la sesión nueva: cierra las demás de la cuenta, como la página de acceso. */
    private suspend fun cerrarOtrasSesionesSiToca() {
        if (!cerrarOtrasAlEntrar || estadoActual.value !is EstadoSesion.ConSesion) return
        cerrarOtrasAlEntrar = false
        try {
            cerrarOtrasSesiones()
        } catch (_: ErrorSesion) {
            // Sin red, las cierra la plataforma en su siguiente renovación: Firebase ya retiró su credencial.
        }
    }

    private suspend fun reautenticar(tokenFirebase: String): TicketReautenticacion {
        // Fuera del cerrojo, como cualquier llamada con token: la sesión puede renovarse entre medias.
        val respuesta = llamarConToken("POST", "/v1/cuenta/reautenticacion", JSONObject().put("tokenFirebase", tokenFirebase))
        if (!respuesta.correcta) throw respuesta.error()
        val json = respuesta.json
        val ticket = json.cadena("ticket") ?: throw respuestaNoValida()
        return TicketReautenticacion(ticket, caduca = reloj() + json.optLong("caducaEn") * 1000)
    }

    /** Los espacios de la persona en esta app (`ecosistema-kit/ESPACIOS.md`). */
    val espacios: EspaciosYosiftware by lazy { EspaciosYosiftware(this) }

    /**
     * Una llamada a la API de la plataforma con el token de la cuenta activa, hecha con el cliente HTTP de la app (desde
     * la 1.7.0): [llamada] recibe el token (para `Authorization: Bearer`, sin `Origin`) y devuelve su respuesta. Si
     * [estadoHttp] de esa respuesta es 401, pide otro token ([tokensTrasRechazo]) y la repite una vez. Lanza lo mismo
     * que [tokens]. El error de una respuesta que no es 2xx se lee con [ErrorSesion.deLaPlataforma].
     *
     * ```kotlin
     * val respuesta = sesion.conTokenDePlataforma({ it.code }) { token -> cliente.newCall(peticion(token)).execute() }
     * ```
     */
    suspend fun <R> conTokenDePlataforma(estadoHttp: (R) -> Int, llamada: suspend (token: String) -> R): R =
        conToken({ estadoHttp(it) == 401 }, llamada)

    /** Una llamada JSON a la API de la plataforma con su token; con [rechazada], pide otro y la repite una vez. */
    internal suspend fun llamarConToken(
        metodo: String,
        ruta: String,
        cuerpo: JSONObject? = null,
        rechazada: (RespuestaApi) -> Boolean = { it.estado == 401 },
    ): RespuestaApi = conToken(rechazada) { token -> api(metodo, ruta, cuerpo, token) }

    private suspend fun <R> conToken(rechazada: (R) -> Boolean, llamada: suspend (token: String) -> R): R {
        val token = tokens().plataforma.valor
        val respuesta = llamada(token)
        if (!rechazada(respuesta)) return respuesta
        return llamada(tokensTrasRechazo(token).plataforma.valor)
    }

    /** Crear una cuenta con contraseña se hace en la página de acceso, en el navegador del sistema. */
    fun direccionCrearCuenta(): String = "${configuracion.paginaDeAcceso.trimEnd('/')}/?vista=registro"

    /** La página de acceso: recuperar la contraseña y cambiar el correo o las formas de acceso. */
    fun direccionPaginaDeAcceso(): String = "${configuracion.paginaDeAcceso.trimEnd('/')}/"

    /** Una vista de la web social (`perfil`, `sesiones`, `privacidad`, `cuenta`, `claves-ia`…), o su inicio. */
    fun direccionWebSocial(vista: String? = null): String =
        configuracion.webSocial.trimEnd('/') + (vista?.let { "/?vista=$it" } ?: "/")

    // Lo de dentro, siempre con el cerrojo.

    private suspend fun canjear(credencial: CredencialFirebase) {
        usuarioFirebaseNuevo = credencial.idToken.takeIf { credencial.nuevo }
        val cuerpo = JSONObject()
            .put("tokenFirebase", credencial.idToken)
            .put("web", configuracion.web)
            .put("dispositivo", configuracion.dispositivo ?: "Android")
        tratarApertura(api("POST", "/v1/sesion/nativa", cuerpo))
    }

    /** La respuesta de entrar, del alta, del segundo factor o de conservar la cuenta. */
    private suspend fun tratarApertura(respuesta: RespuestaApi) {
        if (!respuesta.correcta) {
            when (respuesta.codigo) {
                "borrado_programado" -> {
                    val detalle = respuesta.json.optJSONObject("detalle")
                    ticket = detalle?.cadena("conservar")
                    cambiar(EstadoSesion.BorradoProgramado(detalle?.cadena("pedido"), detalle?.cadena("borrarDesde")))
                    return
                }
                "registro_cerrado" -> {
                    usuarioFirebaseNuevo?.let { firebase.borrar(it) }
                    olvidarPaso()
                }
                "ticket_no_valido", "segundo_factor_no_activado" -> olvidarPaso()
            }
            throw respuesta.error()
        }
        val json = respuesta.json
        when (json.cadena("estado")) {
            "autenticada" -> {
                ticket = null
                usuarioFirebaseNuevo = null
                tratarSesion(json)
            }
            "alta_requerida" -> {
                ticket = json.cadena("ticket")
                val normasUso = json.optJSONObject("normasUso")?.let(::resumen) ?: throw respuestaNoValida()
                cambiar(EstadoSesion.AltaRequerida(normasUso))
            }
            "segundo_factor_requerido" -> {
                ticket = json.cadena("ticket")
                cambiar(EstadoSesion.SegundoFactorRequerido)
            }
            "verificacion_requerida", "vinculacion_requerida" -> {
                val motivo = json.getString("estado").removeSuffix("_requerida")
                ticket = null
                usuarioFirebaseNuevo = null
                cambiar(EstadoSesion.AbrirEnNavegador(motivo, direccionPaginaDeAcceso()))
            }
            else -> throw respuestaNoValida()
        }
    }

    /** Una respuesta con sesión (entrar, alta, segundo factor, conservar o renovación). */
    private suspend fun tratarSesion(json: JSONObject) {
        // El refresh nuevo se guarda antes de dar los tokens.
        json.cadena("refresh")?.let { guardarRefresh(it) }
        val cuenta = json.optJSONObject("cuenta")?.let(::cuenta)
        cuenta?.let { registrar(it) }
        val normasDeUso = json.optJSONObject("normasDeUsoPendientes")?.let(::resumen)
        val tokens = json.optJSONObject("tokens")
        if (normasDeUso != null) {
            tokensActuales = null
            cambiar(EstadoSesion.NormasDeUsoPendientes(normasDeUso, cuenta))
            return
        }
        tokensActuales = tokens?.let(::tokens) ?: throw respuestaNoValida()
        cambiar(EstadoSesion.ConSesion(cuenta ?: throw respuestaNoValida(), json.optJSONObject("normasPendientes")?.let(::resumen)))
    }

    private suspend fun vigentes(): Tokens {
        tokensActuales?.let { if (caducan(it) - MARGEN > reloj()) return it }
        return renovar() ?: throw normasDeUsoPendientes()
    }

    /** Pide tokens nuevos. `null` si faltan las normas de uso (el estado lo dice). */
    private suspend fun renovar(): Tokens? {
        val refresh = leerRefresh() ?: throw sinSesion().also { cerrarAqui(null) }
        val cuerpo = JSONObject().put("refresh", refresh).put("web", configuracion.web)
        val respuesta = sinCortar {
            conGracia { api("POST", "/v1/sesion/nativa/renovacion", cuerpo) }.also { rotada ->
                if (rotada.correcta) {
                    ultimaComprobacion = reloj()
                    tratarSesion(rotada.json)
                }
            }
        }
        if (respuesta.correcta) return tokensActuales
        if (respuesta.cierraLaSesion) cerrarAqui(respuesta.motivo())
        throw respuesta.error()
    }

    /**
     * Una llamada que rota el `refresh`, y guardar el nuevo, sin cortarse a medias (2026-10-25). Si quien la pidió se va
     * con la llamada ya enviada (una vista que se cierra, la app que pasa a segundo plano, la otra app que deja de
     * esperar el traspaso), la plataforma ya ha rotado el `refresh`. Sin el nuevo, la siguiente renovación presentaría el
     * anterior pasado su minuto de gracia, y la plataforma cerraría la sesión por reutilización.
     */
    private suspend fun <T> sinCortar(llamada: suspend () -> T): T = withContext(NonCancellable) { llamada() }

    /**
     * Lo que rota el refresh: si la respuesta se pierde, se repite con el mismo refresh, que vale un minuto más
     * (a los 2 y a los 8 segundos).
     */
    private suspend fun conGracia(llamada: suspend () -> RespuestaApi): RespuestaApi {
        var ultimo: ErrorSesion? = null
        for (espera in listOf(0L, 2_000L, 6_000L)) {
            if (espera > 0) esperar(espera)
            try {
                return llamada()
            } catch (error: ErrorSesion) {
                if (error.codigo != "sin_conexion") throw error
                ultimo = error
            }
        }
        throw ultimo!!
    }

    private suspend fun api(metodo: String, ruta: String, cuerpo: JSONObject?, token: String? = null): RespuestaApi {
        val cabeceras = if (token == null) emptyMap() else mapOf("Authorization" to "Bearer $token")
        val respuesta = try {
            transporte.enviar(Peticion(metodo, configuracion.api.trimEnd('/') + ruta, cuerpo?.toString(), cabeceras))
        } catch (error: IOException) {
            throw ErrorSesion.sinConexion(error)
        }
        return RespuestaApi(respuesta.estado, jsonDe(respuesta.cuerpo))
    }

    private fun exigirSinSesionGuardada() {
        when (estadoActual.value) {
            is EstadoSesion.ConSesion, is EstadoSesion.NormasDeUsoPendientes, is EstadoSesion.SinConexion,
            EstadoSesion.Comprobando -> throw estadoNoValido()
            else -> Unit
        }
    }

    private fun olvidarPaso() {
        ticket = null
        usuarioFirebaseNuevo = null
        cambiar(EstadoSesion.SinSesion())
    }

    /**
     * La sesión de la cuenta activa se acaba: con [motivo] (la plataforma la ha cerrado), la cuenta queda `caducada`
     * en la lista; sin él (al salir), se quita. Queda sin cuenta activa.
     */
    private suspend fun cerrarAqui(motivo: Motivo?) {
        val hueco = huecoActivo
        if (hueco != null) {
            cerrarHueco(hueco, motivo)
        } else {
            olvidarLoDeAhora()
            cambiar(EstadoSesion.SinSesion(motivo))
        }
    }

    /** Como [cerrarAqui], para el hueco que sea: el activo, o el de antes mientras se añade otra cuenta. */
    private suspend fun cerrarHueco(hueco: String, motivo: Motivo?) {
        borrarDe(hueco)
        entradas = if (motivo == null) {
            entradas.filterNot { it.hueco == hueco }
        } else {
            entradas.map { if (it.hueco == hueco) it.copy(hueco = null, caducada = true) else it }
        }.filter { it.id != null || it.hueco != null }
        when (hueco) {
            huecoActivo -> {
                huecoActivo = null
                olvidarLoDeAhora()
                guardarIndice()
                cambiar(EstadoSesion.SinSesion(motivo))
            }
            anterior -> {
                anterior = null
                guardarIndice()
            }
            else -> guardarIndice()
        }
    }

    /** Lo que es de la sesión de ahora, en memoria: los tokens y los pasos a medias. */
    private fun olvidarLoDeAhora() {
        tokensActuales = null
        ticket = null
        usuarioFirebaseNuevo = null
        cerrarOtrasAlEntrar = false
    }

    /** Como al arrancar: renueva la sesión de la cuenta activa y, sin red, deja [EstadoSesion.SinConexion]. */
    private suspend fun renovarComoAlArrancar() {
        try {
            renovar()
        } catch (error: ErrorSesion) {
            val estado = estadoActual.value
            if (estado is EstadoSesion.Comprobando || estado is EstadoSesion.SinConexion || estado is EstadoSesion.ConSesion) {
                cambiar(EstadoSesion.SinConexion(error.comoMotivo()))
            }
        }
    }

    /** Cierra en la plataforma la sesión del hueco (si se puede) y borra su `refresh` del móvil. */
    private suspend fun cerrarEnLaPlataforma(hueco: String) {
        leerDe(hueco)?.let { cerrarRefreshEnLaPlataforma(it) }
        borrarDe(hueco)
    }

    private suspend fun cerrarRefreshEnLaPlataforma(refresh: String) {
        try {
            api("POST", "/v1/sesion/nativa/cierre", JSONObject().put("refresh", refresh))
        } catch (_: ErrorSesion) {
            // Sin red, la sesión caduca sola en la plataforma; en el móvil se borra igual.
        }
    }

    /**
     * La sesión del hueco activo es de [cuenta]: la apunta en el índice. Si esa cuenta ya estaba guardada en otro hueco
     * (se ha vuelto a entrar con ella), se queda la sesión nueva y la vieja se cierra, como en el navegador.
     */
    private suspend fun registrar(cuenta: Cuenta) {
        val hueco = huecoActivo ?: return
        val repetidas = entradas.filter { it.id == cuenta.id && it.hueco != hueco }
        for (vieja in repetidas) vieja.hueco?.let { cerrarEnLaPlataforma(it) }
        val nueva = Entrada(hueco, cuenta.id, cuenta.alias)
        val posicion = entradas.indexOfFirst { it.hueco == hueco }
        val otras = entradas.filterNot { it.hueco == hueco || it.id == cuenta.id }.toMutableList()
        if (posicion < 0) otras += nueva else otras.add(minOf(posicion, otras.size), nueva)
        // Las caducadas no cuentan para el máximo, pero tampoco se acumulan: sobran las más antiguas.
        while (otras.size > MAXIMO_CUENTAS) {
            val caducada = otras.firstOrNull { it.caducada } ?: break
            otras.remove(caducada)
        }
        val cambia = otras != entradas || anterior != null
        entradas = otras
        anterior = null
        if (cambia) guardarIndice() else publicar()
    }

    private suspend fun cargarIndice() {
        if (indiceLeido) return
        indiceLeido = true
        val indice = withContext(Dispatchers.IO) { huecos.de(HUECO_INDICE).leer() }?.let(Indice::de)
        if (indice != null) {
            entradas = indice.entradas
            huecoActivo = indice.activa?.takeIf { activa -> entradas.any { it.hueco == activa } }
        } else if (leerDe(HUECO_PRIMERO) != null) {
            // La sesión de la 1.3: su cuenta se sabe en la primera renovación.
            entradas = listOf(Entrada(HUECO_PRIMERO, null, null))
            huecoActivo = HUECO_PRIMERO
        }
        publicar()
    }

    private suspend fun guardarIndice() {
        val indice = Indice(huecoActivo ?: anterior, entradas)
        withContext(Dispatchers.IO) {
            val almacen = huecos.de(HUECO_INDICE)
            if (indice.entradas.isEmpty()) almacen.borrar() else almacen.guardar(indice.comoJson())
        }
        publicar()
    }

    private fun publicar() {
        cuentasActuales.value = entradas.mapNotNull { entrada ->
            CuentaGuardada(
                id = entrada.id ?: return@mapNotNull null,
                alias = entrada.alias.orEmpty(),
                activa = entrada.hueco != null && entrada.hueco == huecoActivo,
                caducada = entrada.caducada,
            )
        }
    }

    /** Un hueco libre: el de la 1.3 si lo está (una app con una sola cuenta no cambia de archivo), o uno nuevo. */
    private fun huecoNuevo(): String {
        val usados = entradas.mapNotNull { it.hueco }.toSet() + listOfNotNull(anterior)
        if (HUECO_PRIMERO !in usados) return HUECO_PRIMERO
        while (true) {
            val hueco = UUID.randomUUID().toString().replace("-", "").take(12)
            if (hueco !in usados && hueco != HUECO_INDICE) return hueco
        }
    }

    private fun cambiar(estado: EstadoSesion) {
        estadoActual.value = estado
    }

    private fun otraApp(paquete: String, oferta: Oferta): SesionEnOtraApp? {
        if (oferta.codigo != Oferta.OFERTA) return null
        return SesionEnOtraApp(
            alias = oferta.alias ?: return null,
            idCuenta = oferta.idCuenta ?: return null,
            app = oferta.app,
            paquete = paquete,
            ticket = oferta.ticket ?: return null,
            caduca = reloj() + oferta.caducaEn * 1000L,
        )
    }

    private fun caducan(tokens: Tokens): Long = minOf(tokens.plataforma.caduca, tokens.api?.caduca ?: Long.MAX_VALUE)

    /** El `refresh` de la cuenta activa; `null` sin ella. */
    private suspend fun leerRefresh(): String? {
        cargarIndice()
        return huecoActivo?.let { leerDe(it) }
    }

    /** Guarda el `refresh` de la cuenta activa; sin ella (al entrar), en un hueco nuevo, que pasa a ser el activo. */
    private suspend fun guardarRefresh(valor: String) {
        cargarIndice()
        val hueco = huecoActivo ?: huecoNuevo().also { huecoActivo = it }
        guardarEn(hueco, valor)
    }

    private suspend fun leerDe(hueco: String): String? = withContext(Dispatchers.IO) { huecos.de(hueco).leer() }

    private suspend fun guardarEn(hueco: String, valor: String) = withContext(Dispatchers.IO) { huecos.de(hueco).guardar(valor) }

    private suspend fun borrarDe(hueco: String) = withContext(Dispatchers.IO) { huecos.de(hueco).borrar() }

    private fun tokens(json: JSONObject): Tokens {
        fun token(objeto: JSONObject) = Token(
            valor = objeto.getString("token"),
            audiencia = objeto.getString("audiencia"),
            caduca = reloj() + objeto.getLong("caducaEn") * 1000,
        )
        return Tokens(token(json.getJSONObject("plataforma")), json.optJSONObject("api")?.let(::token))
    }

    private companion object {
        /** Se renuevan los tokens cuando les queda menos de esto. */
        const val MARGEN = 60_000L

        /** Las cuentas que se guardan a la vez, como en el navegador. */
        const val MAXIMO_CUENTAS = 5

        /** Comprobación rápida del formato, como la página de acceso; la de verdad la hace Firebase. */
        val PARECE_CORREO = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

        fun cuenta(json: JSONObject) = Cuenta(
            id = json.getString("id"),
            alias = json.getString("alias"),
            correo = json.cadena("correo"),
            correoVerificado = json.optBoolean("correoVerificado", false),
            estado = json.optString("estado", "activa"),
            propietario = json.optBoolean("propietario", false),
        )

        fun resumen(json: JSONObject) = ResumenNormas(json.getLong("id"), json.optInt("version"), json.optString("titulo"))

        fun normas(respuesta: RespuestaApi): Normas {
            if (!respuesta.correcta) throw respuesta.error()
            val json = respuesta.json
            return Normas(json.getLong("id"), json.optInt("version"), json.optString("titulo"), json.optString("texto"))
        }

        fun estadoNoValido() = ErrorSesion("estado_no_valido", "Eso no se puede hacer ahora.")
        fun correoNoValido() = ErrorSesion("correo_no_valido", "Escribe un correo válido.")
        fun sinSesion() = ErrorSesion("sin_sesion", "No has iniciado sesión.")
        fun respuestaNoValida() = ErrorSesion("respuesta_no_valida", "Algo ha fallado. Inténtalo de nuevo.")
        fun normasDeUsoPendientes() =
            ErrorSesion("normas_de_uso_pendientes", "Tienes que aceptar las normas de uso para seguir.")
    }
}

internal class RespuestaApi(val estado: Int, val json: JSONObject) {
    val correcta get() = estado in 200..299
    val codigo: String get() = json.cadena("code").orEmpty()

    /** La sesión ya no vale: se borra del móvil (`APK.md`, «Mantener la sesión»). */
    val cierraLaSesion get() = estado == 401 || codigo == "cuenta_no_disponible"

    /** Un 401 por el token de la plataforma, no por el de Firebase que va en el cuerpo (los correos de la cuenta). */
    val rechazaElTokenDePlataforma get() = estado == 401 && !codigo.startsWith("token_firebase") && codigo != "inicio_de_sesion_antiguo"

    fun motivo() = error().comoMotivo()

    fun error(): ErrorSesion = ErrorSesion.deLaPlataforma(estado, json)
}

/** El JSON de una respuesta; vacío si no hay cuerpo o no es JSON. */
internal fun jsonDe(cuerpo: String): JSONObject = try {
    if (cuerpo.isBlank()) JSONObject() else JSONObject(cuerpo)
} catch (_: JSONException) {
    JSONObject()
}

/** El texto de un campo, o `null` si falta o es `null`. */
internal fun JSONObject.cadena(nombre: String): String? = if (isNull(nombre)) null else optString(nombre)
