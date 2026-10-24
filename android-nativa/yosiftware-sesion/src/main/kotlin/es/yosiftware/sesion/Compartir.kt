package es.yosiftware.sesion

import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.os.Messenger
import android.os.RemoteException
import java.security.MessageDigest
import kotlin.coroutines.resume
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/*
 * La sesión de otra app (`ecosistema-kit/APK.md`, «La sesión de otra app»): una app del ecosistema con sesión la pasa a
 * otra del mismo móvil con un ticket de la plataforma, sin darle su `refresh`.
 *
 * Cada app con la librería expone [ServicioSesionCompartida] (lo declara el manifiesto de la librería, que Android mezcla
 * con el de la app). La app que busca sesión lo encuentra por su acción, le manda la dirección de su plataforma y recibe
 * un ticket para ella. Quién es cada una lo dice Android (el paquete y la firma de quien llama, y de a quién se llama), y
 * lo comprueba la plataforma: la librería no lleva ninguna lista.
 */

/** La acción con la que las apps del ecosistema encuentran el servicio de las demás. */
internal const val ACCION_COMPARTIR = "es.yosiftware.sesion.COMPARTIR"

private const val PEDIR = 1
private const val RESPUESTA = 2
private const val VERSION_PROTOCOLO = 1

/** Lo que responde la app que da la sesión. Sin [ticket], [codigo] dice por qué. */
internal data class Oferta(
    val codigo: String,
    val ticket: String? = null,
    val caducaEn: Int = 0,
    val idCuenta: String? = null,
    val alias: String? = null,
    /** El nombre de la app que da la sesión, en el registro de la plataforma. */
    val app: String? = null,
) {
    fun comoBundle() = Bundle().apply {
        putString("codigo", codigo)
        putString("ticket", ticket)
        putInt("caducaEn", caducaEn)
        putString("idCuenta", idCuenta)
        putString("alias", alias)
        putString("app", app)
    }

    companion object {
        const val OFERTA = "oferta"

        fun de(datos: Bundle) = Oferta(
            codigo = datos.getString("codigo") ?: "respuesta_no_valida",
            ticket = datos.getString("ticket"),
            caducaEn = datos.getInt("caducaEn"),
            idCuenta = datos.getString("idCuenta"),
            alias = datos.getString("alias"),
            app = datos.getString("app"),
        )
    }
}

/** Las otras apps del ecosistema del móvil. En las pruebas se cambia por unas simuladas. */
internal interface Vecinas {
    /** Los paquetes de las otras apps instaladas con el servicio de la librería. */
    suspend fun buscar(): List<String>

    /** Pide a la app de [paquete] un ticket para esta app, contra la plataforma de [api]; `null` si no responde. */
    suspend fun pedir(paquete: String, api: String): Oferta?

    /** Las huellas SHA-256 de la firma de la app de [paquete], según Android. */
    fun huellas(paquete: String): List<String>
}

internal object SinVecinas : Vecinas {
    override suspend fun buscar() = emptyList<String>()
    override suspend fun pedir(paquete: String, api: String): Oferta? = null
    override fun huellas(paquete: String) = emptyList<String>()
}

/** Las de verdad, con el `PackageManager` y un `Messenger` por app. */
internal class VecinasAndroid(private val contexto: Context) : Vecinas {

    override suspend fun buscar(): List<String> = withContext(Dispatchers.IO) {
        val encontrados = if (Build.VERSION.SDK_INT >= 33) {
            contexto.packageManager.queryIntentServices(Intent(ACCION_COMPARTIR), PackageManager.ResolveInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION")
            contexto.packageManager.queryIntentServices(Intent(ACCION_COMPARTIR), 0)
        }
        encontrados.mapNotNull { it.serviceInfo?.packageName }.filter { it != contexto.packageName }.distinct()
    }

    override suspend fun pedir(paquete: String, api: String): Oferta? = withTimeoutOrNull(ESPERA) {
        withContext(Dispatchers.Main) { pedirConectado(paquete, api) }
    }

    override fun huellas(paquete: String): List<String> = huellasDeLaFirma(contexto.packageManager, paquete)

    private suspend fun pedirConectado(paquete: String, api: String): Oferta? {
        var enlazada: ServiceConnection? = null
        try {
            return suspendCancellableCoroutine { espera ->
                val conexion = object : ServiceConnection {
                    override fun onServiceConnected(nombre: ComponentName?, servicio: IBinder?) {
                        val respuestas = Messenger(
                            Handler(Looper.getMainLooper()) { mensaje ->
                                if (mensaje.what == RESPUESTA && espera.isActive) espera.resume(Oferta.de(mensaje.data))
                                true
                            },
                        )
                        val pedido = Message.obtain(null, PEDIR).apply {
                            data = Bundle().apply {
                                putInt("version", VERSION_PROTOCOLO)
                                putString("api", api)
                            }
                            replyTo = respuestas
                        }
                        try {
                            Messenger(servicio).send(pedido)
                        } catch (_: RemoteException) {
                            if (espera.isActive) espera.resume(null)
                        }
                    }

                    override fun onServiceDisconnected(nombre: ComponentName?) {
                        if (espera.isActive) espera.resume(null)
                    }

                    override fun onNullBinding(nombre: ComponentName?) {
                        if (espera.isActive) espera.resume(null)
                    }
                }
                val enlazado = try {
                    contexto.bindService(Intent(ACCION_COMPARTIR).setPackage(paquete), conexion, Context.BIND_AUTO_CREATE)
                } catch (_: SecurityException) {
                    false
                }
                if (enlazado) enlazada = conexion else espera.resume(null)
            }
        } finally {
            // Con respuesta, sin ella o al pasar el tiempo, la conexión se suelta (en el hilo principal).
            enlazada?.let { runCatching { contexto.unbindService(it) } }
        }
    }

    private companion object {
        /** La otra app pide el ticket a la plataforma: con sus reintentos, puede tardar. */
        const val ESPERA = 15_000L
    }
}

/**
 * El servicio con el que esta app da su sesión a otra app del ecosistema. Solo responde si la app ha creado su
 * [SesionYosiftware] (en la `Application`) y tiene sesión; la plataforma decide si quien llama es una app del
 * ecosistema. Lo declara el manifiesto de la librería: la app no tiene que hacer nada.
 */
class ServicioSesionCompartida : Service() {
    private val ambito = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val mensajero = Messenger(
        Handler(Looper.getMainLooper()) { mensaje ->
            if (mensaje.what == PEDIR) atender(mensaje)
            true
        },
    )

    override fun onBind(intent: Intent?): IBinder = mensajero.binder

    override fun onDestroy() {
        ambito.cancel()
        super.onDestroy()
    }

    private fun atender(mensaje: Message) {
        // El mensaje se recicla al volver: se copia lo que hace falta.
        val responder = mensaje.replyTo ?: return
        val uid = mensaje.sendingUid
        val api = mensaje.data?.getString("api").orEmpty()
        ambito.launch {
            val oferta = darSesion(uid, api)
            try {
                responder.send(Message.obtain(null, RESPUESTA).apply { data = oferta.comoBundle() })
            } catch (_: RemoteException) {
                // La otra app ya no espera.
            }
        }
    }

    private suspend fun darSesion(uid: Int, api: String): Oferta {
        val sesion = SesionCompartida.sesion ?: return Oferta("sin_sesion")
        val paquete = (if (uid >= 0) packageManager.getPackagesForUid(uid) else null)?.firstOrNull()
            ?: return Oferta("app_no_reconocida")
        val huellas = withContext(Dispatchers.IO) { huellasDeLaFirma(packageManager, paquete) }
        if (huellas.isEmpty()) return Oferta("app_no_reconocida")
        return sesion.darSesion(paquete, huellas, api)
    }
}

/**
 * Las huellas SHA-256 (en hexadecimal) de los certificados con los que está firmada la app de [paquete]: el actual y, si
 * rotó la clave, los anteriores que demuestra. Vacía si no se puede leer.
 */
internal fun huellasDeLaFirma(gestor: PackageManager, paquete: String): List<String> {
    val firmas: Array<Signature> = try {
        if (Build.VERSION.SDK_INT >= 28) {
            val info = if (Build.VERSION.SDK_INT >= 33) {
                gestor.getPackageInfo(paquete, PackageManager.PackageInfoFlags.of(PackageManager.GET_SIGNING_CERTIFICATES.toLong()))
            } else {
                gestor.getPackageInfo(paquete, PackageManager.GET_SIGNING_CERTIFICATES)
            }.signingInfo ?: return emptyList()
            if (info.hasMultipleSigners()) info.apkContentsSigners else info.signingCertificateHistory
        } else {
            @Suppress("DEPRECATION")
            gestor.getPackageInfo(paquete, PackageManager.GET_SIGNATURES).signatures
        } ?: return emptyList()
    } catch (_: PackageManager.NameNotFoundException) {
        return emptyList()
    }
    return firmas.map { huellaSha256(it.toByteArray()) }.distinct().takeLast(5)
}

internal fun huellaSha256(certificado: ByteArray): String =
    MessageDigest.getInstance("SHA-256").digest(certificado).joinToString("") { "%02x".format(it) }

/** La sesión de esta app que se da a las demás: la que la app creó con su `Context`. */
internal object SesionCompartida {
    @Volatile
    var sesion: SesionYosiftware? = null
}
