package es.yosiftware.libros.ui.preferencias

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.LocalActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import es.yosiftware.libros.ui.componentes.Boton
import es.yosiftware.libros.ui.componentes.VarianteDeBoton
import es.yosiftware.libros.ui.tema.Espacios
import es.yosiftware.libros.ui.tema.Fuentes
import es.yosiftware.libros.ui.tema.Iconos
import es.yosiftware.libros.ui.tema.LocalColores
import es.yosiftware.libros.ui.tema.Radios
import es.yosiftware.libros.ui.tema.Textos
import es.yosiftware.libros.ui.tema.mezclar
import es.yosiftware.libros.ui.tema.rem

// Las Preferencias de la APK: app-preferences.component (la vista `m-preferences`) y profile-preferences.shared.sass de
// la APK de Capacitor (5dc3120). Arriba, las pestañas en píldoras, fijas; debajo, el contenido de la pestaña.

/** [alAbrirPrivacidad] abre la privacidad de la cuenta de Yosiftware en la web social. */
@Composable
fun PantallaPreferencias(alAbrirPrivacidad: () -> Unit) {
    val colores = LocalColores.current
    var pestana by rememberSaveable { mutableStateOf(PestanaDePreferencias.PRIVACIDAD) }
    Column(Modifier.fillMaxSize().background(colores.lienzo)) {
        Row(
            Modifier.fillMaxWidth().background(mezclar(colores.lienzo, 0.94f)).horizontalScroll(rememberScrollState())
                .padding(horizontal = Espacios.e3, vertical = Espacios.e2),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            PestanaDePreferencias.entries.forEach { cada ->
                val activa = cada == pestana
                Row(
                    Modifier.heightIn(min = 46.dp).clip(Radios.pildora)
                        .background(if (activa) colores.contenedorPrimario else Color.Transparent)
                        .clickable(role = Role.Tab) { pestana = cada }
                        .padding(horizontal = Espacios.e3),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    val tinta = if (activa) colores.sobreContenedorPrimario else colores.tintaSuave
                    Icon(painterResource(cada.icono), contentDescription = null, tint = tinta, modifier = Modifier.size(20.dp))
                    Text(cada.etiqueta, color = tinta, style = Textos.cuerpo.copy(fontSize = rem(0.72), fontWeight = FontWeight.ExtraBold, lineHeight = rem(0.72)))
                }
            }
        }
        HorizontalDivider(thickness = 1.dp, color = mezclar(colores.contorno, 0.65f))
        Box(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), contentAlignment = Alignment.TopCenter) {
            Column(
                Modifier.widthIn(max = 880.dp).fillMaxWidth().padding(start = Espacios.e4, end = Espacios.e4, top = Espacios.e5, bottom = Espacios.e8),
                verticalArrangement = Arrangement.spacedBy(Espacios.e4),
            ) {
                when (pestana) {
                    PestanaDePreferencias.PRIVACIDAD -> Privacidad(alAbrirPrivacidad)
                    PestanaDePreferencias.PERMISOS -> Permisos()
                }
            }
        }
    }
}

/**
 * Privacidad (`profile-platform-privacy`): la de Libros es la de la cuenta de Yosiftware. En la web, la tecla del SDK
 * abre su panel; en la APK no hay panel, así que las dos entradas de la web (la tecla y «Privacidad de todas tus webs»)
 * son una: la privacidad en la web social, que tiene las dos cosas.
 */
@Composable
private fun Privacidad(alAbrir: () -> Unit) {
    Pista("Tu privacidad en Libros es la de tu cuenta de Yosiftware: si ocultas que usas Libros y qué te llega al móvil. Tu perfil y quién puede escribirte se deciden en ella.")
    Boton("Privacidad de todas tus webs", alAbrir, Modifier.fillMaxWidth(), variante = VarianteDeBoton.Contorno, icono = Iconos.simboloYosiftware)
}

/** «Permisos del móvil» (`mobile-app-permissions`), solo con las notificaciones, que se vuelven a mirar al volver a la app. */
@Composable
private fun Permisos() {
    val colores = LocalColores.current
    val contexto = LocalContext.current
    val actividad = LocalActivity.current
    val preferencias = remember(contexto) { contexto.getSharedPreferences("preferencias", Context.MODE_PRIVATE) }
    val api = Build.VERSION.SDK_INT
    fun leer(): EstadoDePermiso = PermisoDeNotificaciones.estado(
        api = api,
        concedido = api >= PermisoDeNotificaciones.API_CON_PERMISO &&
            ContextCompat.checkSelfPermission(contexto, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED,
        activadas = NotificationManagerCompat.from(contexto).areNotificationsEnabled(),
        pedirExplicacion = api >= PermisoDeNotificaciones.API_CON_PERMISO &&
            actividad?.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) == true,
        yaPedido = preferencias.getBoolean(CLAVE_PEDIDO, false),
    )
    var estado by remember { mutableStateOf(leer()) }
    var solicitando by remember { mutableStateOf(false) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { estado = leer() }
    val pedir = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        preferencias.edit { putBoolean(CLAVE_PEDIDO, true) }
        solicitando = false
        estado = leer()
    }

    Column {
        Text("Permisos del móvil", color = colores.tinta, style = Textos.cuerpo.copy(fontFamily = Fuentes.display))
        Pista("Android conserva la decisión final. Puedes conceder un permiso aquí o cambiarlo después en los ajustes de la aplicación.", Modifier.padding(top = Espacios.e2))
    }
    Column(Modifier.fillMaxWidth()) {
        Column(
            Modifier.fillMaxWidth().heightIn(min = 68.dp).padding(vertical = Espacios.e3),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espacios.e2)) {
                Icon(painterResource(Iconos.notifications), contentDescription = null, tint = colores.primario)
                Text("Notificaciones", color = colores.tinta, style = Textos.cuerpo.copy(fontSize = rem(0.84), fontWeight = FontWeight.Bold))
            }
            Text("Avisos de mensajes y actividad aunque la app esté en segundo plano.", color = colores.tintaSuave, style = Textos.cuerpo.copy(fontSize = rem(0.76), lineHeight = rem(0.76 * 1.45)))
            Text(
                estado.etiqueta,
                Modifier.semantics { liveRegion = LiveRegionMode.Polite },
                color = colores.tintaSuave,
                style = Textos.cuerpo.copy(fontSize = rem(0.76)),
            )
            Boton(
                PermisoDeNotificaciones.textoDelBoton(estado, solicitando),
                {
                    if (PermisoDeNotificaciones.sePuedePedir(api, estado)) {
                        solicitando = true
                        pedir.launch(Manifest.permission.POST_NOTIFICATIONS)
                    } else {
                        // Android ya no pregunta (o no hay permiso que pedir): sus ajustes de notificaciones.
                        abrir(contexto, Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, contexto.packageName))
                    }
                },
                habilitado = !solicitando && estado != EstadoDePermiso.CONCEDIDO,
            )
        }
        HorizontalDivider(thickness = 1.dp, color = mezclar(colores.contorno, 0.55f))
    }
    Boton(
        "Abrir ajustes de Android",
        { abrir(contexto, Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, "package:${contexto.packageName}".toUri())) },
        Modifier.fillMaxWidth(),
        variante = VarianteDeBoton.Contorno,
    )
}

private const val CLAVE_PEDIDO = "permiso_notificaciones_pedido"

private fun abrir(contexto: Context, intento: Intent) {
    try {
        contexto.startActivity(intento.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: android.content.ActivityNotFoundException) {
        // Algunas capas de Android no tienen esa pantalla: no hay nada más que abrir.
    }
}

/** `.preference-hint`: el texto de apoyo de la tarjeta. */
@Composable
private fun Pista(texto: String, modifier: Modifier = Modifier) {
    Text(texto, modifier, color = LocalColores.current.tintaSuave, style = Textos.cuerpo)
}
